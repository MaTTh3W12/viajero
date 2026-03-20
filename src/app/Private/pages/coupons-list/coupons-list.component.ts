import { Component, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError, filter, take, timeout } from 'rxjs/operators';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { DataTableComponent } from '../../../shared/dashboard/data-table/data-table.component';
import { DataTableConfig } from '../../../service/data-table.model';
import { CouponsMockService } from '../../../service/coupons-mock.service';
import { Coupon } from '../../../service/coupon.interface';
import { FilterBarComponent } from '../../../shared/dashboard/filter-bar/filter-bar.component';
import { AuthService, UserRole } from '../../../service/auth.service';
import { AuditLog, CouponService, InsertCouponVariables, UpdateCouponVariables } from '../../../service/coupon.service';
import { UserProfileService } from '../../../service/user-profile.service';
import { CategoryService } from '../../../service/category.service';

@Component({
  selector: 'app-coupons-list',
  standalone: true,
  imports: [CommonModule, TopbarComponent, DataTableComponent, FilterBarComponent],
  templateUrl: './coupons-list.component.html',
  styleUrl: './coupons-list.component.css',
})
export class CouponsListComponent {
  allCoupons: Coupon[] = [];
  coupons: Coupon[] = [];
  couponSearchTerm = '';
  couponStatusFilter: 'all' | 'Borrador' | 'Publicado' = 'all';
  currentPage = 1;
  readonly pageSize = 10;
  totalCoupons = 0;
  @ViewChild(FilterBarComponent) filterBar!: FilterBarComponent;

  private currentUserDbId: string | number | null = null;
  private categoryNameById = new Map<number, string>();

  tableConfig: DataTableConfig<Coupon> = {
    columns: [
      {
        key: 'titulo',
        label: 'Título del cupón',
        type: 'title-with-subtitle',
        render: (value) => this.truncateText(value, 20),
        subLabel: (_, row) => this.truncateText(row.categoria, 20),
        imageForRow: (row) => row.imagePreview ?? null,
      },
      { key: 'oferta', label: 'Oferta' },
      { key: 'vigencia', label: 'Vigencia' },
      {
        key: 'disponibles',
        label: 'Disponibles',
        render: (_, row) => `${row.disponibles ?? 0} / ${row.disponiblesTotal ?? row.disponibles ?? 0}`,
      },
      { key: 'estado', label: 'Estado', type: 'badge' },
    ],
    actions: [
      {
        iconId: 'eye',
        bgClass: 'bg-[#D7E8FF] text-[#1E63D5]',
        action: (row) => this.openView(row),
      },
      {
        iconId: 'edit',
        bgClass: 'bg-[#E6EEFF] text-[#538CFF]',
        show: (row) => row.estado === 'Publicado' || row.estado === 'Borrador',
        action: (row) => this.openEdit(row),
      },
      {
        iconId: 'trash',
        bgClass: 'bg-[#F8D7DA] text-[#C82333]',
        show: (row) => row.estado === 'Borrador' && this.getAcquiredCouponsCount(row) === 0,
        action: (row) => this.openDelete(row),
      },
      {
        iconId: 'statistics',
        bgClass: 'bg-[#E4DEFF] text-[#5B47C4]',
        action: (row) => this.openStats(row),
      },
    ],
  };

  constructor(
    private service: CouponsMockService,
    private auth: AuthService,
    private couponService: CouponService,
    private userProfileService: UserProfileService,
    private categoryService: CategoryService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.role === 'empresa' && this.auth.isKeycloakLoggedIn()) {
      await this.loadCompanyCouponsFromApi();
      return;
    }

    this.loadCouponsFromMock();
  }

  get role(): UserRole {
    return this.auth.getRole() ?? 'usuario';
  }

  onCouponStatusFilterChange(filter: 'all' | 'Borrador' | 'Publicado'): void {
    this.couponStatusFilter = filter;

    if (this.role === 'empresa' && this.auth.isKeycloakLoggedIn()) {
      this.currentPage = 1;
      void this.loadCompanyCouponsFromApi();
      return;
    }

    this.refreshVisibleCoupons();
  }

  onCouponSearch(term: string): void {
    this.couponSearchTerm = term.trim();

    if (this.role === 'empresa' && this.auth.isKeycloakLoggedIn()) {
      this.currentPage = 1;
      void this.loadCompanyCouponsFromApi();
      return;
    }

    this.refreshVisibleCoupons();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCoupons / this.pageSize));
  }

  get visiblePages(): number[] {
    const totalPages = this.totalPages;
    const windowSize = 5;

    if (totalPages <= windowSize) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const halfWindow = Math.floor(windowSize / 2);
    let start = Math.max(1, this.currentPage - halfWindow);
    let end = Math.min(totalPages, start + windowSize - 1);

    if (end - start + 1 < windowSize) {
      start = Math.max(1, end - windowSize + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;

    this.currentPage = page;

    if (this.role === 'empresa' && this.auth.isKeycloakLoggedIn()) {
      void this.loadCompanyCouponsFromApi();
      return;
    }

    this.refreshVisibleCoupons();
  }

  goToFirstPage(): void {
    this.goToPage(1);
  }

  goToPreviousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  goToNextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  goToLastPage(): void {
    this.goToPage(this.totalPages);
  }

  async onCreateCoupon(payload: {
    titulo: string;
    cantidad: number | null;
    precio?: number | null;
    descuento?: number | null;
    descripcion: string;
    fechaInicio: string;
    fechaFin: string;
    categoriaId: number;
    categoriaNombre: string;
    terminos: string;
    estado: string;
    image?: string | null;
    onSuccess: () => void;
    onError: (message?: string) => void;
  }): Promise<void> {
    try {
      if (this.role !== 'empresa' || !this.auth.isKeycloakLoggedIn()) {
        const nuevo: Coupon = {
          id: Date.now(),
          titulo: payload.titulo,
          descripcion: payload.descripcion,
          categoria: payload.categoriaNombre,
          fechaInicio: payload.fechaInicio,
          fechaFin: payload.fechaFin,
          disponibles: payload.cantidad ?? 0,
          disponiblesTotal: payload.cantidad ?? 0,
          oferta: '-',
          vigencia: `${payload.fechaInicio} - ${payload.fechaFin}`,
          estado: payload.estado,
        };

        this.setCoupons([nuevo, ...this.allCoupons]);
        payload.onSuccess();
        return;
      }

      const token = await this.getAuthTokenForApi();
      if (!token) {
        payload.onError('No hay sesión activa para crear el cupón.');
        return;
      }

      await this.ensureCategoryMap(token);

      const variables: InsertCouponVariables = {
        category_id: payload.categoriaId,
        title: payload.titulo,
        description: payload.descripcion || null,
        terms: payload.terminos || null,
        start_date: this.toIsoDate(payload.fechaInicio),
        end_date: this.toIsoDate(payload.fechaFin),
        stock_available: payload.cantidad,
        stock_total: payload.cantidad,
        price: payload.precio ?? null,
        price_discount: payload.descuento ?? null,
        auto_published: false,
        published: payload.estado === 'Publicado',
        image: payload.image ?? null,
      };

      await firstValueFrom(this.couponService.insertCoupon(token, variables));

      payload.onSuccess();

      try {
        await this.loadCompanyCouponsFromApi();
      } catch (reloadError) {
        console.error('[COUPONS] Cupón creado pero falló recarga de tabla', reloadError);
      }
    } catch (error) {
      console.error('[COUPONS] Error creando cupón', error);
      payload.onError('No se pudo crear el cupón. Verifica los datos e intenta nuevamente.');
    }
  }

  async onUpdateCoupon(payload: {
    id: number;
    titulo: string;
    descripcion: string;
    categoriaId: number;
    categoriaNombre: string;
    fechaInicio: string;
    fechaFin: string;
    disponibles: number;
    precio?: number | null;
    descuento?: number | null;
    estado: string;
    terminos: string;
    image?: string | null;
    onSuccess: () => void;
    onError: (message?: string) => void;
  }): Promise<void> {
    try {
      if (this.role !== 'empresa' || !this.auth.isKeycloakLoggedIn()) {
        const updatedCoupons = this.allCoupons.map((coupon) => {
          if (coupon.id !== payload.id) return coupon;
          return {
            ...coupon,
            titulo: payload.titulo,
            categoria: payload.categoriaNombre,
            categoriaId: payload.categoriaId,
            fechaInicio: payload.fechaInicio,
            fechaFin: payload.fechaFin,
            disponibles: payload.disponibles,
            disponiblesTotal: coupon.disponiblesTotal ?? payload.disponibles,
            vigencia: `${payload.fechaInicio} - ${payload.fechaFin}`,
            estado: payload.estado,
            rawDescripcion: payload.descripcion,
            terminos: payload.terminos,
          };
        });
        this.setCoupons(updatedCoupons);
        payload.onSuccess();
        return;
      }

      const token = await this.getAuthTokenForApi();
      if (!token) {
        payload.onError('No hay sesión activa para actualizar el cupón.');
        return;
      }

      const couponInView = this.allCoupons.some((coupon) => coupon.id === payload.id);
      if (!couponInView) {
        payload.onError('No puedes actualizar un cupón que no aparece en tu listado.');
        return;
      }

      const currentCoupon = this.allCoupons.find((coupon) => coupon.id === payload.id) ?? null;
      if (currentCoupon) {
        const total = currentCoupon.disponiblesTotal ?? currentCoupon.disponibles ?? 0;
        const available = currentCoupon.disponibles ?? 0;
        const acquired = Math.max(total - available, 0);
        if (payload.disponibles < acquired) {
          payload.onError(`La cantidad disponible no puede ser menor a ${acquired} (cupones adquiridos).`);
          return;
        }
      }

      const canManage = await this.validateCouponOwnership(token, payload.id);
      if (!canManage) {
        payload.onError('No puedes editar/publicar un cupón que no pertenece a tu empresa.');
        return;
      }

      const variables: UpdateCouponVariables = {
        id: payload.id,
        title: payload.titulo,
        category_id: payload.categoriaId,
        start_date: this.toIsoDate(payload.fechaInicio),
        end_date: this.toIsoDate(payload.fechaFin),
        stock_available: payload.disponibles,
        description: payload.descripcion || null,
        terms: payload.terminos || null,
        price: payload.precio ?? null,
        price_discount: payload.descuento ?? null,
        published: payload.estado === 'Publicado',
        ...(payload.image ? { image: payload.image } : {}),
      };

      await firstValueFrom(this.couponService.updateCoupon(token, variables));

      // Primero cerramos estado de carga del modal para evitar que se quede pegado
      // si algo falla durante la recarga de la tabla.
      payload.onSuccess();

      try {
        await this.loadCompanyCouponsFromApi();
      } catch (reloadError) {
        console.error('[COUPONS] Cupón actualizado pero falló recarga de tabla', reloadError);
      }
    } catch (error) {
      console.error('[COUPONS] Error actualizando cupón', error);
      payload.onError('No se pudo actualizar el cupón. Intenta nuevamente.');
    }
  }

  async openEdit(row: Coupon): Promise<void> {
    if (!this.filterBar) return;

    const total = row.disponiblesTotal ?? row.disponibles ?? 0;
    const available = row.disponibles ?? 0;
    const acquired = Math.max(total - available, 0);

    this.filterBar.openEditCoupon({
      ...row,
      descripcion: row.rawDescripcion ?? row.descripcion,
      precio: row.precio ?? null,
      descuento: row.descuento ?? null,
      image: row.imagePreview ?? null,
      imageMime: this.normalizeMimeType(row.imageMimeType),
      imageName: this.normalizeMimeType(row.imageMimeType).startsWith('application/pdf') ? 'Archivo actual.pdf' : 'Imagen actual',
      minCantidadDisponible: acquired,
    });

    if (row.imagePreview) return;

    if (this.role !== 'empresa' || !this.auth.isKeycloakLoggedIn()) return;
    const token = await this.getAuthTokenForApi();
    if (!token) return;

    this.filterBar.setEditCouponImageLoading(true);
    try {
      const imageData = await firstValueFrom(this.couponService.getCouponImage(token, row.id));
      if (!imageData?.image_base64) {
        this.filterBar.setEditCouponImagePreview(null, '');
        return;
      }

      const imageMimeType = this.normalizeMimeType(imageData.image_mime_type);
      const imagePreview = this.toDataUrl(imageData.image_base64, imageMimeType);

      row.imagePreview = imagePreview;
      row.imageMimeType = imageMimeType;

      const imageName = imageMimeType.startsWith('application/pdf')
        ? 'Archivo actual.pdf'
        : 'Imagen actual';
      this.filterBar.setEditCouponImagePreview(imagePreview, imageMimeType, imageName);
    } catch (error) {
      console.warn('[COUPONS] No se pudo obtener preview de imagen para edit', error);
      this.filterBar.setEditCouponImagePreview(null, '');
    } finally {
      this.filterBar.setEditCouponImageLoading(false);
    }
  }

  async onDeleteCoupon(payload: {
    id: number;
    onSuccess: () => void;
    onError: (message?: string) => void;
  }): Promise<void> {
    try {
      const couponToDelete = this.allCoupons.find((coupon) => coupon.id === payload.id) ?? null;
      if (!couponToDelete) {
        payload.onError('No puedes eliminar un cupón que no aparece en tu listado.');
        return;
      }

      const acquiredCoupons = this.getAcquiredCouponsCount(couponToDelete);
      if (couponToDelete.estado === 'Publicado') {
        payload.onError('No puedes eliminar un cupón publicado.');
        return;
      }

      if (acquiredCoupons > 0) {
        payload.onError(`No puedes eliminar este cupón porque ya tiene ${acquiredCoupons} adquisición(es).`);
        return;
      }

      if (this.role !== 'empresa' || !this.auth.isKeycloakLoggedIn()) {
        this.setCoupons(this.allCoupons.filter((coupon) => coupon.id !== payload.id));
        payload.onSuccess();
        return;
      }

      const token = await this.getAuthTokenForApi();
      if (!token) {
        payload.onError('No hay sesión activa para eliminar el cupón.');
        return;
      }

      const canManage = await this.validateCouponOwnership(token, payload.id);
      if (!canManage) {
        payload.onError('No puedes eliminar un cupón que no pertenece a tu empresa.');
        return;
      }

      const deleted = await firstValueFrom(this.couponService.deleteCoupon(token, payload.id));
      if (!deleted) {
        payload.onError('No se pudo eliminar el cupón.');
        return;
      }

      payload.onSuccess();

      try {
        await this.loadCompanyCouponsFromApi();
      } catch (reloadError) {
        console.error('[COUPONS] Cupón eliminado pero falló recarga de tabla', reloadError);
      }
    } catch (error) {
      console.error('[COUPONS] Error eliminando cupón', error);
      payload.onError('No se pudo eliminar el cupón. Intenta nuevamente.');
    }
  }

  async openDelete(row: Coupon): Promise<void> {
    if (!this.filterBar) return;

    this.filterBar.openDeleteCoupon({
      ...row,
      descripcion: row.rawDescripcion ?? row.descripcion,
      terminos: row.terminos ?? '',
      image: row.imagePreview ?? null,
      imageMime: this.normalizeMimeType(row.imageMimeType),
    });

    let imagePreview = row.imagePreview ?? null;
    let imageMimeType = this.normalizeMimeType(row.imageMimeType);

    if (this.role === 'empresa' && this.auth.isKeycloakLoggedIn()) {
      const token = await this.getAuthTokenForApi();
      if (token) {
        this.filterBar.setDeleteCouponImageLoading(true);
        try {
          const imageData = await firstValueFrom(this.couponService.getCouponImage(token, row.id));
          if (imageData?.image_base64) {
            imageMimeType = this.normalizeMimeType(imageData.image_mime_type);
            imagePreview = this.toDataUrl(imageData.image_base64, imageMimeType);

            const current = this.allCoupons.find((coupon) => coupon.id === row.id);
            if (current) {
              current.imagePreview = imagePreview;
              current.imageMimeType = imageMimeType;
            }
            this.refreshVisibleCoupons();
            this.filterBar.setDeleteCouponImagePreview(imagePreview, imageMimeType);
          } else {
            this.filterBar.setDeleteCouponImagePreview(null, '');
          }
        } catch (error) {
          console.warn('[COUPONS] No se pudo obtener preview de imagen para delete', error);
          this.filterBar.setDeleteCouponImagePreview(imagePreview, imageMimeType);
        } finally {
          this.filterBar.setDeleteCouponImageLoading(false);
        }
      }
    }
  }

  async openView(row: Coupon): Promise<void> {
    if (typeof row.onView === 'function') {
      row.onView(row);
      return;
    }

    if (!this.filterBar) return;

    this.filterBar.openViewCoupon({
      ...row,
      descripcion: row.rawDescripcion ?? row.descripcion,
      terminos: row.terminos ?? '',
      image: row.imagePreview ?? null,
      imageMime: this.normalizeMimeType(row.imageMimeType),
    });

    let imagePreview = row.imagePreview ?? null;
    let imageMimeType = this.normalizeMimeType(row.imageMimeType);

    if (this.role === 'empresa' && this.auth.isKeycloakLoggedIn()) {
      const token = await this.getAuthTokenForApi();
      if (token) {
        this.filterBar.setViewCouponImageLoading(true);
        try {
          const imageData = await firstValueFrom(this.couponService.getCouponImage(token, row.id));
          if (imageData?.image_base64) {
            imageMimeType = this.normalizeMimeType(imageData.image_mime_type);
            imagePreview = this.toDataUrl(imageData.image_base64, imageMimeType);

            const current = this.allCoupons.find((coupon) => coupon.id === row.id);
            if (current) {
              current.imagePreview = imagePreview;
              current.imageMimeType = imageMimeType;
            }
            this.refreshVisibleCoupons();
            this.filterBar.setViewCouponImagePreview(imagePreview, imageMimeType);
          } else {
            this.filterBar.setViewCouponImagePreview(null, '');
          }
        } catch (error) {
          console.warn('[COUPONS] No se pudo obtener preview de imagen para view', error);
          this.filterBar.setViewCouponImagePreview(imagePreview, imageMimeType);
        } finally {
          this.filterBar.setViewCouponImageLoading(false);
        }
      }
    }
  }

  async openStats(row: Coupon): Promise<void> {
    if (typeof row.onStats === 'function') {
      row.onStats(row);
      return;
    }

    if (!this.filterBar) return;

    const publicados = row.disponiblesTotal ?? row.disponibles ?? 0;
    const adquiridos = this.getAcquiredCouponsCount(row);

    this.filterBar.openCouponStatistics({
      id: row.id,
      titulo: row.titulo,
      fechaInicio: row.fechaInicio,
      fechaFin: row.fechaFin,
      publicados,
      disponibles: row.disponibles ?? 0,
      adquiridos,
      canjeados: 0,
    });
    this.filterBar.setCouponStatisticsLoading(true);

    if (!this.auth.isKeycloakLoggedIn()) {
      this.filterBar.setCouponStatisticsLoading(false);
      return;
    }

    const token = await this.getAuthTokenForApi();
    if (!token) {
      this.filterBar.setCouponStatisticsLoading(false);
      return;
    }

    try {
      const { stats, monthlyHistory, acquired } = await firstValueFrom(
        forkJoin({
          stats: this.couponService.getCouponStatsWithCompany(token, row.id).pipe(
            catchError((error) => {
              console.warn('[COUPONS] getCouponStatsWithCompany falló en openStats', { id: row.id, error });
              return of(null);
            })
          ),
          monthlyHistory: this.couponService.getMonthlyRedemptionHistory(token, row.id).pipe(
            catchError((error) => {
              console.warn('[COUPONS] getMonthlyRedemptionHistory falló en openStats', { id: row.id, error });
              return of([]);
            })
          ),
          acquired: this.couponService.getCouponsAcquired(token, {
            limit: 300,
            offset: 0,
            where: { coupon_id: { _eq: row.id } },
          }).pipe(
            catchError((error) => {
              console.warn('[COUPONS] getCouponsAcquired falló en openStats', {
                id: row.id,
                error,
              });
              return of({ rows: [], total: 0 });
            })
          ),
        })
      );

      const acquiredRows = acquired.rows ?? [];
      const acquiredIds = acquiredRows
        .map((item) => this.toNumberOrNull(item.id))
        .filter((id): id is number => id != null);
      const acquiredUniqueCodes = acquiredRows
        .map((item) => this.normalizeUniqueCode(item.unique_code))
        .filter((code): code is string => code.length > 0);

      const baseAuditWhere = this.buildCouponAuditWhere(row.id, acquiredIds);
      const primaryAudit = await firstValueFrom(
        this.couponService.getAuditLogsDynamic(token, {
          limit: 100,
          offset: 0,
          where: baseAuditWhere,
        }).pipe(
          catchError((error) => {
            console.warn('[COUPONS] getAuditLogsDynamic falló con filtro principal', {
              id: row.id,
              where: baseAuditWhere,
              error,
            });
            return of({ rows: [], total: 0 });
          })
        )
      );

      const targetCouponId = this.toNumberOrNull(row.id);
      let auditRows = (primaryAudit.rows ?? []).filter((log) =>
        this.auditLogBelongsToCoupon(log, targetCouponId, acquiredIds, acquiredUniqueCodes)
      );
      if (auditRows.length === 0) {
        console.info('[COUPONS] openStats: sin filas con filtro principal, intentando búsqueda amplia', {
          couponId: row.id,
        });
        const broadAudit = await firstValueFrom(
          this.couponService.getAuditLogsDynamic(token, {
            limit: 300,
            offset: 0,
            where: {},
          })
        );
        auditRows = (broadAudit.rows ?? [])
          .filter((log) => this.auditLogBelongsToCoupon(log, targetCouponId, acquiredIds, acquiredUniqueCodes))
          .slice(0, 10);
      }

      console.info('[COUPONS] openStats: filas finales de auditoría', {
        couponId: row.id,
        rows: auditRows.length,
      });

      this.filterBar.updateCouponStatistics({
        publicados: stats?.stockTotal ?? publicados,
        disponibles: stats?.stockAvailable ?? row.disponibles ?? 0,
        adquiridos: stats?.totalAcquired ?? adquiridos,
        canjeados: stats?.totalRedeemed ?? 0,
      });

      this.filterBar.updateCouponStatisticsHistory(monthlyHistory);
      this.filterBar.updateCouponStatisticsTransactions(
        auditRows
          .slice(0, 10)
          .map((log) => ({
          createdAt: log.createdAt,
          userEmail: log.userPublic?.email ?? null,
          userFirstName: log.userPublic?.firstName ?? null,
          userLastName: log.userPublic?.lastName ?? null,
          actionType: log.actionType,
        }))
      );
    } catch (error) {
      console.warn('[COUPONS] No se pudieron cargar estadísticas del cupón', { id: row.id, error });
    } finally {
      this.filterBar.setCouponStatisticsLoading(false);
    }
  }

  private loadCouponsFromMock(): void {
    this.service.getCoupons().subscribe((data) => {
      this.setCoupons(data.map((coupon) => this.decorateCouponForTable(coupon)));
    });
  }

  private async getAuthTokenForApi(): Promise<string | null> {
    const token = this.auth.token;
    if (token) return token;

    if (!this.auth.isKeycloakLoggedIn()) {
      return null;
    }

    try {
      return await firstValueFrom(
        this.auth.token$.pipe(
          filter((value): value is string => typeof value === 'string' && value.trim().length > 0),
          take(1),
          timeout(3000)
        )
      );
    } catch {
      return null;
    }
  }

  private async loadCompanyCouponsFromApi(): Promise<void> {
    const token = await this.getAuthTokenForApi();

    if (!token) {
      console.warn('[COUPONS] loadCompanyCouponsFromApi aborted: token missing');
      this.setCoupons([]);
      return;
    }

    await this.resolveCurrentUserDbId(token);

    await this.ensureCategoryMap(token);

    let response = await firstValueFrom(this.couponService.getCoupons(token, {
      limit: this.pageSize,
      offset: (this.currentPage - 1) * this.pageSize,
      where: this.buildCompanyCouponsWhere(true),
    }));

    if (response.total === 0 && this.currentUserDbId != null) {
      console.warn('[COUPONS] Empty result with user_id filter, retrying without user_id constraint');
      response = await firstValueFrom(this.couponService.getCoupons(token, {
        limit: this.pageSize,
        offset: (this.currentPage - 1) * this.pageSize,
        where: this.buildCompanyCouponsWhere(false),
      }));
    }

    const rows = response.rows.map((row) => ({
      id: row.id,
      titulo: row.title,
      descripcion: this.auth.user?.companyName || this.auth.user?.username || row.description || '',
      categoria: this.categoryNameById.get(row.category_id) ?? String(row.category_id),
      fechaInicio: this.toDisplayDate(row.start_date),
      fechaFin: this.toDisplayDate(row.end_date),
      disponibles: row.stock_available ?? row.stock_total ?? 0,
      disponiblesTotal: row.stock_total ?? row.stock_available ?? 0,
      oferta: this.resolveOfferLabel(row.price, row.price_discount),
      vigencia: `${this.toDisplayDate(row.start_date)} - ${this.toDisplayDate(row.end_date)}`,
      estado: row.published ? 'Publicado' : 'Borrador',
      categoriaId: row.category_id,
      terminos: row.terms ?? '',
      rawDescripcion: row.description ?? '',
      precio: this.toFiniteNumber(row.price),
      descuento: this.toFiniteNumber(row.price_discount),
      imagePreview: null,
      imageMimeType: '',
    }));

    this.allCoupons = rows;
    this.coupons = rows;
    this.totalCoupons = response.total;
    this.cdr.detectChanges();

    // load images for each coupon so the table can show previews immediately
    try {
      await this.loadImagesForCoupons(token);
    } catch (imgErr) {
      console.warn('[COUPONS] some images failed to load', imgErr);
    }
  }


  private toDataUrl(base64: string, mimeType: string): string {
    if (!base64) return '';
    if (base64.startsWith('data:')) return base64;

    const safeMime = this.normalizeMimeType(mimeType) || 'image/jpeg';
    return `data:${safeMime};base64,${base64}`;
  }

  /**
   * Bulk fetch images for every coupon currently in `this.coupons`.
   * Updates each item in place with preview and mime type. Errors on a
   * per-coupon basis are logged but do not abort the whole operation.
   */
  private async loadImagesForCoupons(token: string): Promise<void> {
    if (!token || this.allCoupons.length === 0) return;
    const promises = this.allCoupons.map(async (coupon) => {
      try {
        const imageData = await firstValueFrom(this.couponService.getCouponImage(token, coupon.id));
        if (imageData?.image_base64) {
          const mime = this.normalizeMimeType(imageData.image_mime_type);
          coupon.imagePreview = this.toDataUrl(imageData.image_base64, mime);
          coupon.imageMimeType = mime;
        }
      } catch (e) {
        console.warn('[COUPONS] failed loading image for coupon', coupon.id, e);
      }
    });

    await Promise.all(promises);
    this.refreshVisibleCoupons();
  }

  private setCoupons(rows: Coupon[]): void {
    this.allCoupons = rows;
    this.refreshVisibleCoupons();
  }

  private refreshVisibleCoupons(): void {
    if (this.role === 'empresa' && this.auth.isKeycloakLoggedIn()) {
      this.coupons = [...this.allCoupons];
      this.cdr.detectChanges();
      return;
    }

    const filteredCoupons = this.applyFilters(this.allCoupons);
    this.totalCoupons = filteredCoupons.length;

    const safeCurrentPage = Math.min(this.currentPage, this.totalPages);
    this.currentPage = Math.max(1, safeCurrentPage);

    const start = (this.currentPage - 1) * this.pageSize;
    this.coupons = filteredCoupons.slice(start, start + this.pageSize);
    this.cdr.detectChanges();
  }

  private applyFilters(rows: Coupon[]): Coupon[] {
    const search = this.normalizeSearchTerm(this.couponSearchTerm);

    return rows.filter((coupon) => {
      const matchesStatus =
        this.couponStatusFilter === 'all' || coupon.estado === this.couponStatusFilter;

      const matchesSearch =
        !search ||
        this.normalizeSearchTerm(coupon.titulo).includes(search) ||
        this.normalizeSearchTerm(coupon.rawDescripcion ?? coupon.descripcion).includes(search);

      return matchesStatus && matchesSearch;
    });
  }

  private normalizeMimeType(mimeType: string | null | undefined): string {
    if (!mimeType) return '';
    return String(mimeType).replace(/^"+|"+$/g, '').trim().toLowerCase();
  }

  private async ensureCategoryMap(token: string): Promise<void> {
    if (this.categoryNameById.size > 0) return;

    const categories = await firstValueFrom(this.categoryService.getCategories(token));
    this.categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  }

  private async resolveCurrentUserDbId(token: string): Promise<void> {
    if (this.currentUserDbId != null) return;

    const email = this.auth.user?.email ?? this.auth.getKeycloakUser()?.email ?? null;

    try {
      const profile = await firstValueFrom(this.userProfileService.getCurrentUserProfile(token, email));
      this.currentUserDbId = profile?.id ?? null;
    } catch (error) {
      console.error('[COUPONS] resolveCurrentUserDbId failed', error);
      this.currentUserDbId = null;
    }
  }

  private async validateCouponOwnership(token: string, couponId: number): Promise<boolean> {
    await this.resolveCurrentUserDbId(token);
    if (this.currentUserDbId == null) {
      console.warn('[COUPONS] ownership validation failed: current user id missing');
      return false;
    }

    const owner = await firstValueFrom(this.couponService.getCouponOwner(token, couponId));
    if (!owner) {
      console.warn('[COUPONS] ownership validation failed: coupon owner not found', { couponId });
      return false;
    }

    const valid = this.idsMatch(owner.user_id, this.currentUserDbId);
    if (!valid) {
      console.warn('[COUPONS] ownership validation mismatch', {
        couponId,
        ownerUserId: owner.user_id,
        currentUserDbId: this.currentUserDbId,
      });
    }
    return valid;
  }

  private idsMatch(a: string | number | null | undefined, b: string | number | null | undefined): boolean {
    const aValue = this.normalizeId(a);
    const bValue = this.normalizeId(b);
    return aValue !== null && bValue !== null && aValue === bValue;
  }

  private normalizeId(id: string | number | null | undefined): string | null {
    if (id == null) return null;
    const value = String(id).trim();
    return value.length > 0 ? value : null;
  }

  private toIsoDate(input: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

    const match = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return input;

    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm}-${dd}`;
  }

  private toDisplayDate(input: string): string {
    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return input;

    const [, yyyy, mm, dd] = match;
    return `${dd}/${mm}/${yyyy}`;
  }

  private decorateCouponForTable(coupon: Coupon): Coupon {
    const fechaInicio = coupon.fechaInicio;
    const fechaFin = coupon.fechaFin;
    const disponibles = coupon.disponibles ?? 0;
    const disponiblesTotal = coupon.disponiblesTotal ?? disponibles;

    return {
      ...coupon,
      disponibles,
      disponiblesTotal,
      oferta: coupon.oferta ?? '-',
      vigencia: coupon.vigencia ?? `${fechaInicio} - ${fechaFin}`,
    };
  }

  private resolveOfferLabel(price: string | null, discount: string | null): string {
    const priceValue = this.toFiniteNumber(price);
    const discountValue = this.toFiniteNumber(discount);

    if (discountValue !== null && discountValue > 0) {
      return `${this.trimTrailingZeros(discountValue)}% OFF`;
    }

    if (priceValue !== null && priceValue > 0) {
      return `$${this.trimTrailingZeros(priceValue)}`;
    }

    return '-';
  }

  private toFiniteNumber(value: string | null): number | null {
    if (value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private trimTrailingZeros(value: number): string {
    const asFixed = value.toFixed(2);
    return asFixed.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  }

  private getAcquiredCouponsCount(coupon: Coupon): number {
    const total = coupon.disponiblesTotal ?? coupon.disponibles ?? 0;
    const available = coupon.disponibles ?? 0;
    return Math.max(total - available, 0);
  }

  private buildCompanyCouponsWhere(includeUserIdFilter = true): Record<string, unknown> {
    const andConditions: Record<string, unknown>[] = [
      {
        _or: [
          { active: { _eq: true } },
          { active: { _is_null: true } },
        ],
      },
    ];

    if (includeUserIdFilter && this.currentUserDbId != null) {
      andConditions.push({
        user_id: { _eq: this.currentUserDbId },
      });
    }

    const searchTerm = this.couponSearchTerm.trim();
    if (searchTerm.length > 0) {
      const likeTerm = `%${searchTerm}%`;
      andConditions.push({
        _or: [
          { title: { _ilike: likeTerm } },
          { description: { _ilike: likeTerm } },
        ],
      });
    }

    if (this.couponStatusFilter === 'Publicado') {
      andConditions.push({ published: { _eq: true } });
    } else if (this.couponStatusFilter === 'Borrador') {
      andConditions.push({ published: { _eq: false } });
    }

    return { _and: andConditions };
  }

  private auditLogBelongsToCoupon(
    log: AuditLog,
    targetCouponId: number | null,
    acquiredIds: number[] = [],
    acquiredUniqueCodes: string[] = []
  ): boolean {
    if (targetCouponId == null) return false;

    const details = this.parseAuditDetails(log.details);
    const couponIdsFromDetails = this.extractCouponIdsFromDetails(details);

    // Si details trae coupon_id, ese dato manda (reference_id suele ser id de adquisición).
    if (couponIdsFromDetails.length > 0) {
      return couponIdsFromDetails.includes(targetCouponId);
    }

    const normalizedUniqueCode = this.extractUniqueCodeFromDetails(details);
    if (normalizedUniqueCode && acquiredUniqueCodes.includes(normalizedUniqueCode)) {
      return true;
    }

    const referenceId = this.toNumberOrNull(log.referenceId);
    if (referenceId != null && acquiredIds.includes(referenceId)) {
      return true;
    }

    if (referenceId == null || referenceId !== targetCouponId) return false;

    const entity = String(log.entity ?? '').toUpperCase().trim();
    return entity.includes('COUPON');
  }

  private parseAuditDetails(details: string | null): Record<string, unknown> | null {
    if (!details) return null;

    try {
      const parsed = JSON.parse(details);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }

    return null;
  }

  private extractCouponIdsFromDetails(details: Record<string, unknown> | null): number[] {
    if (!details) return [];

    const candidateValues: unknown[] = [
      details['coupon_id'],
      details['couponId'],
      details['coupon_id_fk'],
      details['couponIdFk'],
      details['coupon_id_before'],
      details['coupon_id_after'],
    ];

    const couponNode = details['coupon'];
    if (couponNode && typeof couponNode === 'object' && !Array.isArray(couponNode)) {
      const couponRecord = couponNode as Record<string, unknown>;
      candidateValues.push(couponRecord['id'], couponRecord['coupon_id'], couponRecord['couponId']);
    }

    const parsed = candidateValues
      .map((value) => this.toNumberOrNull(value))
      .filter((value): value is number => value != null);

    return Array.from(new Set(parsed));
  }

  private extractUniqueCodeFromDetails(details: Record<string, unknown> | null): string {
    if (!details) return '';

    const rawCode = details['unique_code'] ?? details['uniqueCode'];
    return this.normalizeUniqueCode(rawCode);
  }

  private normalizeUniqueCode(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase();
  }

  private buildCouponAuditWhere(couponId: number, acquiredIds: number[]): Record<string, unknown> {
    const referenceClauses: Record<string, unknown>[] = [{ reference_id: { _eq: couponId } }];

    if (acquiredIds.length > 0) {
      referenceClauses.push({ reference_id: { _in: acquiredIds } });
    }

    return {
      _and: [
        {
          _or: [
            { entity: { _eq: 'COUPON' } },
            { entity: { _eq: 'COUPON_ACQUIRED' } },
          ],
        },
        {
          _or: referenceClauses,
        },
      ],
    };
  }

  private toNumberOrNull(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.trunc(value);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed.length) return null;
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        return Math.trunc(parsed);
      }
    }

    return null;
  }

  private normalizeSearchTerm(value: string | null | undefined): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private truncateText(value: unknown, maxChars: number): string {
    const text = String(value ?? '').trim();
    if (!text.length) return '';
    if (text.length <= maxChars) return text;
    return `${text.slice(0, maxChars)}...`;
  }
}
