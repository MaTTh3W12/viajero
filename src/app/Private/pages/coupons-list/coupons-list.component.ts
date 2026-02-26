import { Component, ViewChild, ChangeDetectorRef } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { DataTableComponent } from '../../../shared/dashboard/data-table/data-table.component';
import { DataTableConfig } from '../../../service/data-table.model';
import { CouponsMockService } from '../../../service/coupons-mock.service';
import { Coupon } from '../../../service/coupon.interface';
import { FilterBarComponent } from '../../../shared/dashboard/filter-bar/filter-bar.component';
import { AuthService, UserRole } from '../../../service/auth.service';
import { CouponService, InsertCouponVariables, UpdateCouponVariables } from '../../../service/coupon.service';
import { UserProfileService } from '../../../service/user-profile.service';
import { CategoryService } from '../../../service/category.service';

@Component({
  selector: 'app-coupons-list',
  standalone: true,
  imports: [TopbarComponent, DataTableComponent, FilterBarComponent],
  templateUrl: './coupons-list.component.html',
  styleUrl: './coupons-list.component.css',
})
export class CouponsListComponent {
  coupons: Coupon[] = [];
  @ViewChild(FilterBarComponent) filterBar!: FilterBarComponent;

  private currentUserDbId: string | number | null = null;
  private categoryNameById = new Map<number, string>();

  tableConfig: DataTableConfig<Coupon> = {
    columns: [
      { key: 'titulo', label: 'Título' },
      { key: 'descripcion', label: 'Empresa' },
      { key: 'categoria', label: 'Categoría' },
      { key: 'fechaInicio', label: 'Fecha Inicio' },
      { key: 'fechaFin', label: 'Fecha Fin' },
      { key: 'disponibles', label: 'Disponibles' },
      { key: 'estado', label: 'Estado', type: 'badge' },
    ],
    actions: [
      {
        iconId: 'edit',
        bgClass: 'bg-[#E6EEFF] text-[#538CFF]',
        show: (row) => row.estado === 'Publicado' || row.estado === 'Borrador',
        action: (row) => this.openEdit(row),
      },
      {
        iconId: 'trash',
        bgClass: 'bg-[#F8D7DA] text-[#C82333]',
        show: (row) => row.estado === 'Borrador',
        action: (row) => this.openDelete(row),
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
    console.log('[COUPONS] ngOnInit start', {
      role: this.role,
      isKeycloakLoggedIn: this.auth.isKeycloakLoggedIn(),
      authUser: this.auth.user,
    });

    if (this.role === 'empresa' && this.auth.isKeycloakLoggedIn()) {
      console.log('[COUPONS] ngOnInit -> loading company coupons from API');
      await this.loadCompanyCouponsFromApi();
      console.log('[COUPONS] ngOnInit -> company coupons loaded', { rows: this.coupons.length });
      return;
    }

    console.log('[COUPONS] ngOnInit -> loading coupons from mock');
    this.loadCouponsFromMock();
  }

  get role(): UserRole {
    return this.auth.getRole() ?? 'usuario';
  }

  async onCreateCoupon(payload: {
    titulo: string;
    cantidad: number | null;
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
          estado: payload.estado,
        };

        this.coupons = [nuevo, ...this.coupons];
      this.cdr.detectChanges();
        payload.onSuccess();
        return;
      }

      const token = this.auth.token;
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
        price: null,
        price_discount: null,
        auto_published: false,
        published: payload.estado === 'Publicado',
        image: payload.image ?? null,
      };

      console.log('[COUPONS] creating coupon', {
        title: payload.titulo,
        categoryId: payload.categoriaId,
        hasImage: !!payload.image,
        imageChars: payload.image?.length ?? 0,
      });

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
    estado: string;
    terminos: string;
    image?: string | null;
    onSuccess: () => void;
    onError: (message?: string) => void;
  }): Promise<void> {
    try {
      if (this.role !== 'empresa' || !this.auth.isKeycloakLoggedIn()) {
        this.coupons = this.coupons.map((coupon) => {
          if (coupon.id !== payload.id) return coupon;
          return {
            ...coupon,
            titulo: payload.titulo,
            categoria: payload.categoriaNombre,
            categoriaId: payload.categoriaId,
            fechaInicio: payload.fechaInicio,
            fechaFin: payload.fechaFin,
            disponibles: payload.disponibles,
            estado: payload.estado,
            rawDescripcion: payload.descripcion,
            terminos: payload.terminos,
          };
        });
        this.cdr.detectChanges();
        payload.onSuccess();
        return;
      }

      const token = this.auth.token;
      if (!token) {
        payload.onError('No hay sesión activa para actualizar el cupón.');
        return;
      }

      const couponInView = this.coupons.some((coupon) => coupon.id === payload.id);
      if (!couponInView) {
        payload.onError('No puedes actualizar un cupón que no aparece en tu listado.');
        return;
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
        published: payload.estado === 'Publicado',
        ...(payload.image ? { image: payload.image } : {}),
      };

      console.log('[COUPONS] updating coupon', {
        id: payload.id,
        stock_available: payload.disponibles,
        hasImage: !!payload.image,
        imageChars: payload.image?.length ?? 0,
      });

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

    this.filterBar.openEditCoupon({
      ...row,
      descripcion: row.rawDescripcion ?? row.descripcion,
      image: row.imagePreview ?? null,
      imageMime: this.normalizeMimeType(row.imageMimeType),
      imageName: this.normalizeMimeType(row.imageMimeType).startsWith('application/pdf') ? 'Archivo actual.pdf' : 'Imagen actual',
    });

    if (row.imagePreview) return;

    if (this.role !== 'empresa' || !this.auth.isKeycloakLoggedIn()) return;
    const token = this.auth.token;
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
      if (this.role !== 'empresa' || !this.auth.isKeycloakLoggedIn()) {
        this.coupons = this.coupons.filter((coupon) => coupon.id !== payload.id);
        this.cdr.detectChanges();
        payload.onSuccess();
        return;
      }

      const token = this.auth.token;
      if (!token) {
        payload.onError('No hay sesión activa para eliminar el cupón.');
        return;
      }

      const couponInView = this.coupons.some((coupon) => coupon.id === payload.id);
      if (!couponInView) {
        payload.onError('No puedes eliminar un cupón que no aparece en tu listado.');
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
      const token = this.auth.token;
      if (token) {
        this.filterBar.setDeleteCouponImageLoading(true);
        try {
          const imageData = await firstValueFrom(this.couponService.getCouponImage(token, row.id));
          if (imageData?.image_base64) {
            imageMimeType = this.normalizeMimeType(imageData.image_mime_type);
            imagePreview = this.toDataUrl(imageData.image_base64, imageMimeType);

            const current = this.coupons.find((coupon) => coupon.id === row.id);
            if (current) {
              current.imagePreview = imagePreview;
              current.imageMimeType = imageMimeType;
            }
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

  private loadCouponsFromMock(): void {
    this.service.getCoupons().subscribe((data) => {
      console.log('[COUPONS] mock data received', { rows: data.length });
      this.coupons = data;
      this.cdr.detectChanges();
    });
  }

  private async loadCompanyCouponsFromApi(): Promise<void> {
    const token = this.auth.token;
    console.log('[COUPONS] loadCompanyCouponsFromApi', {
      hasToken: !!token,
      authUserSub: this.auth.user?.sub,
      authKeycloakSub: this.auth.getKeycloakUser()?.sub,
    });

    if (!token) {
      console.warn('[COUPONS] loadCompanyCouponsFromApi aborted: token missing');
      this.coupons = [];
      this.cdr.detectChanges();
      return;
    }

    await this.resolveCurrentUserDbId(token);

    console.log('[COUPONS] resolved currentUserDbId', { currentUserDbId: this.currentUserDbId });

    await this.ensureCategoryMap(token);

    const response = await firstValueFrom(this.couponService.getCoupons(token, { limit: 200, offset: 0 }));
    console.log('[COUPONS] coupons API response', {
      totalRows: response.rows.length,
      userIds: response.rows.map((row) => row.user_id),
      companyUserId: this.currentUserDbId,
    });

    const mine = this.currentUserDbId != null
      ? response.rows.filter((row) => this.idsMatch(row.user_id, this.currentUserDbId))
      : response.rows;

    console.log('[COUPONS] filtered company coupons', { rows: mine.length });

    this.coupons = mine.map((row) => ({
      id: row.id,
      titulo: row.title,
      descripcion: this.auth.user?.companyName || this.auth.user?.username || row.description || '',
      categoria: this.categoryNameById.get(row.category_id) ?? String(row.category_id),
      fechaInicio: this.toDisplayDate(row.start_date),
      fechaFin: this.toDisplayDate(row.end_date),
      disponibles: row.stock_available ?? 0,
      estado: row.published ? 'Publicado' : 'Borrador',
      categoriaId: row.category_id,
      terminos: row.terms ?? '',
      rawDescripcion: row.description ?? '',
      imagePreview: null,
      imageMimeType: '',
    }));

    console.log('[COUPONS] table rows assigned', { rows: this.coupons.length });
    this.cdr.detectChanges();
  }


  private toDataUrl(base64: string, mimeType: string): string {
    if (!base64) return '';
    if (base64.startsWith('data:')) return base64;

    const safeMime = this.normalizeMimeType(mimeType) || 'image/jpeg';
    return `data:${safeMime};base64,${base64}`;
  }

  private normalizeMimeType(mimeType: string | null | undefined): string {
    if (!mimeType) return '';
    return String(mimeType).replace(/^"+|"+$/g, '').trim().toLowerCase();
  }

  private async ensureCategoryMap(token: string): Promise<void> {
    if (this.categoryNameById.size > 0) return;

    const categories = await firstValueFrom(this.categoryService.getCategories(token));
    this.categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
    console.log('[COUPONS] categories loaded', {
      rows: categories.length,
      ids: categories.map((category) => category.id),
    });
  }

  private async resolveCurrentUserDbId(token: string): Promise<void> {
    if (this.currentUserDbId != null) return;

    const email = this.auth.user?.email ?? this.auth.getKeycloakUser()?.email ?? null;
    console.log('[COUPONS] resolveCurrentUserDbId', { email });

    try {
      const profile = await firstValueFrom(this.userProfileService.getCurrentUserProfile(token, email));
      console.log('[COUPONS] getCurrentUserProfile response', profile);
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
}
