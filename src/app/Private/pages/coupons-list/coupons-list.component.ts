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

  private currentUserDbId: number | null = null;
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
    estado: string;
    terminos: string;
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

      const variables: UpdateCouponVariables = {
        id: payload.id,
        title: payload.titulo,
        category_id: payload.categoriaId,
        start_date: this.toIsoDate(payload.fechaInicio),
        end_date: this.toIsoDate(payload.fechaFin),
        stock_available: payload.disponibles,
        stock_total: payload.disponibles,
        description: payload.descripcion || null,
        terms: payload.terminos || null,
        published: payload.estado === 'Publicado',
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

  openEdit(row: Coupon): void {
    if (this.filterBar) {
      this.filterBar.openEditCoupon({
        ...row,
        descripcion: row.rawDescripcion ?? row.descripcion,
      });
    }
  }

  async onDeleteCoupon(payload: {
    id: number;
    onSuccess: () => void;
    onError: (message?: string) => void;
  }): Promise<void> {
    try {
      this.coupons = this.coupons.filter((coupon) => coupon.id !== payload.id);
      this.cdr.detectChanges();
      payload.onSuccess();
    } catch (error) {
      console.error('[COUPONS] Error eliminando cupón', error);
      payload.onError('No se pudo eliminar el cupón. Intenta nuevamente.');
    }
  }

  openDelete(row: Coupon): void {
    if (this.filterBar) {
      this.filterBar.openDeleteCoupon(row);
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

    const mine = this.currentUserDbId
      ? response.rows.filter((row) => Number(row.user_id) === Number(this.currentUserDbId))
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
    }));

    console.log('[COUPONS] table rows assigned', { rows: this.coupons.length });
    this.cdr.detectChanges();
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
    if (this.currentUserDbId) return;

    const email = this.auth.user?.email ?? this.auth.getKeycloakUser()?.email ?? null;
    console.log('[COUPONS] resolveCurrentUserDbId', { email });

    try {
      const profile = await firstValueFrom(this.userProfileService.getCurrentUserProfile(token, email));
      console.log('[COUPONS] getCurrentUserProfile response', profile);
      this.currentUserDbId = profile?.id ? Number(profile.id) : null;
    } catch (error) {
      console.error('[COUPONS] resolveCurrentUserDbId failed', error);
      this.currentUserDbId = null;
    }
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
