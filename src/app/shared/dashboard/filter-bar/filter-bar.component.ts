import { Component, EventEmitter, Input, Output, Renderer2, Inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FilterVariant } from '../../../service/filter-bar.types';
import { AuthService, UserRole } from '../../../service/auth.service';
import { Category, CategoryService } from '../../../service/category.service';
import { CouponService } from '../../../service/coupon.service';
import { CommonModule } from '@angular/common';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { firstValueFrom } from 'rxjs';
import { take, timeout } from 'rxjs/operators';

export interface HistorialCanjesFilters {
  search: string;
  startDate: string;
  endDate: string;
  responsible: string;
}

export type CompanyStatusFilter = 'all' | 'Pendiente' | 'Activa' | 'No activa';

export interface CompaniesFilters {
  search: string;
  status: CompanyStatusFilter;
  category: string;
}

export type AdminCouponStatusFilter = 'all' | 'Borrador' | 'Publicado' | 'Agotado' | 'Vencido';

export interface AdminCouponFilters {
  company: string;
  title: string;
  vigencia: string;
  category: string;
  status: AdminCouponStatusFilter;
}

type StatisticsTransactionType = 'Canje' | 'Adquisición';
type StatisticsTransactionSortField = 'fecha' | 'cliente' | 'tipo';

interface StatisticsTransactionRow {
  fecha: string;
  cliente: string;
  tipo: StatisticsTransactionType;
  createdAtTimestamp: number;
}

const FILTER_BG_MAP: Record<UserRole, Record<FilterVariant, string>> = {
  admin: {
    users: 'bg-[#D4FFF1]', // Todos los usuarios
    audit: 'bg-[#FFE3C1]', // Auditoría
    category: 'bg-[#FFE2DB]', // Categorías
    coupons: 'bg-[#D4FFF1]', // Todos los cupones
    messages: 'bg-[#D4FFF1]', // Mensajes
    companies: 'bg-[#D4D6FF]', // Empresas
    statistics: 'bg-[#E6EFFF]',
    'canje-cupones': 'bg-[#e6e6fa]',
    'historial-canjes': 'bg-[#E6EFFF]',
  },
  empresa: {
    users: 'bg-[#D4FFF1]', // Todos los usuarios
    audit: 'bg-[#FFE3C1]', // Auditoría
    category: 'bg-[#FFE2DB]', // Categorías
    coupons: 'bg-[#C8E7FF]', // Todos los cupones
    messages: 'bg-[#D4FFF1]', // Mensajes
    companies: 'bg-[#D4D6FF]', // Empresas
    statistics: 'bg-[#E6EFFF]',
    'canje-cupones': 'bg-[#e6e6fa]',
    'historial-canjes': 'bg-[#FFE2DB]',
  },
  usuario: {
    users: 'bg-[#D4FFF1]',
    audit: 'bg-[#FFE3C1]',
    category: 'bg-[#FFE2DB]',
    coupons: 'bg-[#C8E7FF]',
    messages: 'bg-[#D4FFF1]',
    companies: 'bg-[#D4D6FF]',
    statistics: 'bg-[#E6EFFF]',
    'canje-cupones': 'bg-[#e6e6fa]',
    'historial-canjes': 'bg-[#E6EFFF]',
  },
};

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, ZXingScannerModule],
  templateUrl: './filter-bar.component.html',
  styleUrl: './filter-bar.component.css',
})
export class FilterBarComponent {
  @Input({ required: true }) variant!: FilterVariant;
  @Input({ required: true }) role!: UserRole;
  @Input() companiesCategoryOptions: string[] = [];
  @Input() couponCategoryOptions: string[] = [];
  @Output() createCoupon = new EventEmitter<{
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
  }>();
  @Output() updateCoupon = new EventEmitter<{
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
  }>();
  @Output() deleteCoupon = new EventEmitter<{
    id: number;
    onSuccess: () => void;
    onError: (message?: string) => void;
  }>();
  @Output() companiesFilterChange = new EventEmitter<CompaniesFilters>();
  @Output() couponSearch = new EventEmitter<string>();
  @Output() couponStatusFilterChange = new EventEmitter<'all' | 'Borrador' | 'Publicado'>();
  @Output() adminCouponFilterChange = new EventEmitter<AdminCouponFilters>();
  @Output() historialCanjesFilterChange = new EventEmitter<HistorialCanjesFilters>();

  // eventos específicos para canje de cupones
  @Output() scanQr = new EventEmitter<void>();
  @Output() validateCode = new EventEmitter<string>();

  auditTypeOpen = false;
  auditTypeSelected = 'Seleccionar tipo';
  auditTypeOptions = ['Desactivación', 'Aprobación'];

  // QR
  showQrModal = false;
  couponCode: string = '';
  scannedCouponCode: string = '';

  scannerHasDevices = false;
  scannerHasPermission = false;
  scannerError: string | null = null;
  availableDevices: MediaDeviceInfo[] = [];
  currentDevice: MediaDeviceInfo | null = null;

  // Estados para overlays de canje
  redeemingCoupon = false;
  redeemSuccess = false;
  showConfirmRedeemModal = false;

  // Estado para filtros de estadísticas
  statisticsFiltersOpen = false;
  statisticsMetricTypeOpen = false;
  couponStatusFilter: 'all' | 'Borrador' | 'Publicado' = 'all';
  couponStatusOpen = false;
  couponSearchTerm = '';
  adminCouponCompanyTerm = '';
  adminCouponTitleTerm = '';
  adminCouponDate = '';
  adminCouponCategory = 'all';
  adminCouponStatus: AdminCouponStatusFilter = 'all';
  adminCouponCategoryOpen = false;
  adminCouponStatusOpen = false;
  companiesFiltersOpen = false;
  companiesStatusOpen = false;
  companiesCategoryOpen = false;
  companiesSearchTerm = '';
  companiesStatusFilter: CompanyStatusFilter = 'all';
  companiesCategoryFilter = 'all';
  historialCanjesSearch = '';
  historialCanjesStartDate = '';
  historialCanjesEndDate = '';
  historialCanjesResponsible = '';

  categories: Category[] = [];
  categoriesLoaded = false;
  categoriesLoading = false;
  categoryLoadError = false;

  // Estado para el modal de crear cupón
  createCouponOpen = false;
  // Estados de overlay dentro del modal (similar a login)
  creatingCoupon = false;
  couponCreateSuccess = false;
  createCouponError = '';
  couponImageError = '';
  couponImageLoading = false;
  private readonly maxCouponFileSizeBytes = 500 * 1024;
  private readonly allowedCouponMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  couponPromotionType: '' | 'descuento' | 'precio' = '';
  couponForm = {
    titulo: '',
    cantidad: null as number | null,
    precio: null as number | null,
    descuento: null as number | null,
    descripcion: '',
    fechaInicio: '',
    fechaFin: '',
    categoria: null as number | null,
    terminos: '',
    estado: '',
    image: null as string | null,
    imageName: '',
    imageMime: '',
  };
  readonly todayIso = this.buildTodayIso();

  // Estado para el modal de editar cupón
  editCouponOpen = false;
  editingCoupon = false;
  couponEditSuccess = false;
  editCouponError = '';
  editCouponImageError = '';
  editCouponImageLoading = false;
  editPromotionType: '' | 'descuento' | 'precio' = '';
  editMinAvailableQuantity = 0;
  editForm = {
    id: null as number | null,
    titulo: '',
    cantidad: null as number | null,
    precio: null as number | null,
    descuento: null as number | null,
    descripcion: '',
    fechaInicio: '',
    fechaFin: '',
    categoria: null as number | null,
    terminos: '',
    estado: '',
    image: null as string | null,
    imageName: '',
    imageMime: '',
  };

  // Estado para eliminar cupón
  viewCouponOpen = false;
  viewCouponImageLoading = false;
  private viewCouponImageLoadingTimeoutId: ReturnType<typeof setTimeout> | null = null;
  viewTarget: {
    id: number | null;
    titulo: string;
    descripcion: string;
    empresa: string;
    empresaNit: string;
    categoria: string;
    oferta: string;
    vigencia: string;
    fechaInicio: string;
    fechaFin: string;
    cantidad: number | null;
    estado: string;
    terminos: string;
    image: string | null;
    imageMime: string;
  } = {
      id: null,
      titulo: '',
      descripcion: '',
      empresa: '',
      empresaNit: '',
      categoria: '',
      oferta: '',
      vigencia: '',
      fechaInicio: '',
      fechaFin: '',
      cantidad: null,
      estado: '',
      terminos: '',
      image: null,
      imageMime: '',
    };

  // Estado para eliminar cupón
  deleteCouponOpen = false;
  deletingCoupon = false;
  couponDeleteSuccess = false;
  deleteCouponError = '';
  deleteCouponImageLoading = false;
  private couponImageLoadingTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private editCouponImageLoadingTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private deleteCouponImageLoadingTimeoutId: ReturnType<typeof setTimeout> | null = null;
  deleteTarget: {
    id: number | null;
    titulo: string;
    descripcion: string;
    categoria: string;
    fechaInicio: string;
    fechaFin: string;
    cantidad: number | null;
    estado: string;
    terminos: string;
    image: string | null;
    imageMime: string;
  } = {
      id: null,
      titulo: '',
      descripcion: '',
      categoria: '',
      fechaInicio: '',
      fechaFin: '',
      cantidad: null,
      estado: '',
      terminos: '',
      image: null,
      imageMime: '',
    };

  couponStatisticsOpen = false;
  couponStatisticsLoading = false;
  statisticsMonthlyHistory: Array<{ monthLabel: string; redemptions: number }> = [];
  statisticsTransactions: StatisticsTransactionRow[] = [];
  private statisticsTransactionsSource: StatisticsTransactionRow[] = [];
  statisticsTransactionsSortField: StatisticsTransactionSortField = 'fecha';
  statisticsTransactionsSortDirection: 'asc' | 'desc' = 'desc';
  private readonly statisticsTransactionsVisibleLimit = 5;
  statisticsTarget: {
    id: number | null;
    titulo: string;
    empresa: string;
    empresaNit: string;
    categoria: string;
    estado: string;
    fechaInicio: string;
    fechaFin: string;
    publicados: number;
    disponibles: number;
    adquiridos: number;
    canjeados: number;
  } = {
      id: null,
      titulo: '',
      empresa: '',
      empresaNit: '',
      categoria: '',
      estado: '',
      fechaInicio: '',
      fechaFin: '',
      publicados: 0,
      disponibles: 0,
      adquiridos: 0,
      canjeados: 0,
    };

  get statisticsTotalLabel(): string {
    return `${this.statisticsTarget.canjeados}/${this.statisticsTarget.publicados}`;
  }

  get statisticsHistoryBars(): Array<{ monthLabel: string; redemptions: number; height: number; active: boolean }> {
    const maxValue = Math.max(...this.statisticsMonthlyHistory.map((item) => item.redemptions), 0);
    const activeIndex = this.statisticsMonthlyHistory.length - 1;

    return this.statisticsMonthlyHistory.map((item, index) => {
      const normalized = maxValue > 0 ? Math.round((item.redemptions / maxValue) * 100) : 0;
      return {
        monthLabel: item.monthLabel,
        redemptions: item.redemptions,
        height: Math.max(30, normalized),
        active: index === activeIndex,
      };
    });
  }

  selectAuditType(option: string): void {
    this.auditTypeSelected = option;
    this.auditTypeOpen = false;
  }

  openDatePicker(input: HTMLInputElement): void {
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    }
    input.focus();
  }

  openQrModal(): void {
    this.scannedCouponCode = '';
    this.showConfirmRedeemModal = false;
    this.scannerError = null;
    this.showQrModal = true;
  }

  closeQrModal(): void {
    this.showConfirmRedeemModal = false;
    this.showQrModal = false;
  }

  submitCouponCode(): void {
    const code = this.couponCode?.trim();
    if (!code) {
      return;
    }

    this.scannerError = null;
    this.validateCode.emit(code);
  }

  onQrScan(result: string): void {
    this.scannedCouponCode = result;
    this.couponCode = result;
    this.closeQrModal();
    // Notificar al padre para que cargue la información del cupón si es necesario
    this.validateCode.emit(this.couponCode);
  }

  statisticsMetricTypeSelected = 'Seleccionar tipo de métrica';
  statisticsMetricTypeOptions = ['Canjes', 'Vistas', 'Conversión', 'Ingresos'];

  toggleStatisticsFilters(): void {
    if (this.variant === 'historial-canjes') {
      this.historialCanjesStartDate = '';
      this.historialCanjesEndDate = '';
      this.historialCanjesResponsible = '';
      this.submitHistorialCanjesFilters();
    }

    this.statisticsFiltersOpen = !this.statisticsFiltersOpen;
  }

  submitHistorialCanjesFilters(): void {
    this.historialCanjesFilterChange.emit({
      search: this.historialCanjesSearch.trim(),
      startDate: this.historialCanjesStartDate,
      endDate: this.historialCanjesEndDate,
      responsible: this.historialCanjesResponsible.trim(),
    });
  }

  onCouponStatusFilterChange(): void {
    this.couponStatusFilterChange.emit(this.couponStatusFilter);
  }

  submitCouponSearch(): void {
    if (this.role === 'admin') {
      this.submitAdminCouponFilters();
      return;
    }
    this.couponSearch.emit(this.couponSearchTerm.trim());
  }

  submitCompaniesFilters(): void {
    const categoryOptions = this.companyCategoryFilterOptions;
    if (
      this.companiesCategoryFilter !== 'all' &&
      !categoryOptions.includes(this.companiesCategoryFilter)
    ) {
      this.companiesCategoryFilter = 'all';
    }

    this.companiesFilterChange.emit({
      search: this.companiesSearchTerm.trim(),
      status: this.companiesStatusFilter,
      category: this.companiesCategoryFilter,
    });
  }

  toggleCompaniesFilters(): void {
    this.companiesFiltersOpen = !this.companiesFiltersOpen;

    if (!this.companiesFiltersOpen) {
      this.companiesStatusOpen = false;
      this.companiesCategoryOpen = false;
    }
  }

  selectCompanyStatusFilter(status: CompanyStatusFilter): void {
    this.companiesStatusFilter = status;
    this.companiesStatusOpen = false;
    this.submitCompaniesFilters();
  }

  selectCompanyCategoryFilter(category: string): void {
    this.companiesCategoryFilter = category;
    this.companiesCategoryOpen = false;
    this.submitCompaniesFilters();
  }

  clearCompaniesFilters(): void {
    this.companiesSearchTerm = '';
    this.companiesStatusFilter = 'all';
    this.companiesCategoryFilter = 'all';
    this.companiesStatusOpen = false;
    this.companiesCategoryOpen = false;
    this.submitCompaniesFilters();
  }

  getCompanyStatusFilterLabel(): string {
    if (this.companiesStatusFilter === 'all') return 'Seleccionar estado';
    return this.companiesStatusFilter;
  }

  getCompanyCategoryFilterLabel(): string {
    if (this.companiesCategoryFilter === 'all') return 'Seleccionar categoría';
    return this.companiesCategoryFilter;
  }

  get companyCategoryFilterOptions(): string[] {
    const normalized = (this.companiesCategoryOptions ?? [])
      .map((category) => category?.trim())
      .filter((category): category is string => !!category);

    return Array.from(new Set(normalized)).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );
  }

  getCouponStatusFilterLabel(): string {
    if (this.couponStatusFilter === 'Borrador') return 'Borradores';
    if (this.couponStatusFilter === 'Publicado') return 'Publicados';
    return 'Todos';
  }

  get adminCouponCategoryFilterOptions(): string[] {
    const normalized = (this.couponCategoryOptions ?? [])
      .map((category) => category?.trim())
      .filter((category): category is string => !!category);

    return Array.from(new Set(normalized)).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );
  }

  getAdminCouponStatusLabel(): string {
    if (this.adminCouponStatus === 'all') return 'Seleccionar';
    return this.adminCouponStatus;
  }

  getAdminCouponCategoryLabel(): string {
    if (this.adminCouponCategory === 'all') return 'Seleccionar';
    return this.adminCouponCategory;
  }

  get hasAdminCouponFiltersActive(): boolean {
    return (
      this.adminCouponCompanyTerm.trim().length > 0 ||
      this.adminCouponTitleTerm.trim().length > 0 ||
      this.adminCouponDate.trim().length > 0 ||
      this.adminCouponCategory !== 'all' ||
      this.adminCouponStatus !== 'all'
    );
  }

  selectAdminCouponStatus(filter: AdminCouponStatusFilter): void {
    this.adminCouponStatus = filter;
    this.adminCouponStatusOpen = false;
    this.submitAdminCouponFilters();
  }

  selectAdminCouponCategory(category: string): void {
    this.adminCouponCategory = category;
    this.adminCouponCategoryOpen = false;
    this.submitAdminCouponFilters();
  }

  clearAdminCouponFilters(): void {
    this.adminCouponCompanyTerm = '';
    this.adminCouponTitleTerm = '';
    this.adminCouponDate = '';
    this.adminCouponCategory = 'all';
    this.adminCouponStatus = 'all';
    this.adminCouponCategoryOpen = false;
    this.adminCouponStatusOpen = false;
    this.submitAdminCouponFilters();
  }

  submitAdminCouponFilters(): void {
    this.adminCouponFilterChange.emit({
      company: this.adminCouponCompanyTerm.trim(),
      title: this.adminCouponTitleTerm.trim(),
      vigencia: this.adminCouponDate,
      category: this.adminCouponCategory,
      status: this.adminCouponStatus,
    });
  }

  selectCouponStatusFilter(filter: 'all' | 'Borrador' | 'Publicado'): void {
    this.couponStatusFilter = filter;
    this.couponStatusOpen = false;
    this.onCouponStatusFilterChange();
  }

  selectStatisticsMetricType(option: string): void {
    this.statisticsMetricTypeSelected = option;
    this.statisticsMetricTypeOpen = false;
  }

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    this.availableDevices = devices;
    this.scannerHasDevices = devices?.length > 0;
    if (devices.length > 0) {
      this.currentDevice = devices[0];
    }
  }

  onHasPermission(has: boolean): void {
    this.scannerHasPermission = has;
    this.scannerError = has ? null : 'No se otorgó permiso para acceder a la cámara.';
  }

  onScanError(error: any): void {
    this.scannerError = 'Error al acceder a la cámara: ' + (error?.message || error);
  }

  onQrScanButtonClick(): void {
    const scannedCode = this.scannedCouponCode?.trim();
    if (!scannedCode) {
      return;
    }

    this.couponCode = scannedCode;
    this.submitCouponCode();
    this.closeQrModal();
  }

  closeConfirmRedeemModal(): void {
    this.showConfirmRedeemModal = false;
  }

  async confirmRedeem(): Promise<void> {
    const code = this.couponCode?.trim();
    if (!code) {
      this.scannerError = 'Ingresa o escanea un código de cupón válido.';
      this.showConfirmRedeemModal = false;
      return;
    }

    const token = this.auth.token;
    if (!token) {
      this.scannerError = 'Debes iniciar sesión para validar cupones.';
      this.showConfirmRedeemModal = false;
      return;
    }

    this.showConfirmRedeemModal = false;
    this.redeemingCoupon = true;
    this.scannerError = null;
    this.cdr.detectChanges();

    try {
      const acquired = await firstValueFrom(
        this.couponService
          .getCouponWithImageByCode(token, code)
          .pipe(take(1), timeout(15000))
      );

      if (!acquired) {
        throw new Error(this.buildCouponNotFoundMessage());
      }

      if (acquired.redeemed) {
        throw new Error('Este cupón ya fue canjeado.');
      }

      const redeemed = await firstValueFrom(
        this.couponService
          .redeemCouponByCode(token, code)
          .pipe(take(1), timeout(15000))
      );

      let redeemedConfirmed = !!redeemed?.redeemed && redeemed?.validated_by != null;

      if (!redeemedConfirmed) {
        const verifiedCoupon = await firstValueFrom(
          this.couponService
            .getCouponWithImageByCode(token, code)
            .pipe(take(1), timeout(15000))
        );

        if (verifiedCoupon?.redeemed && verifiedCoupon.validated_by != null) {
          redeemedConfirmed = true;
        }
      }

      if (!redeemedConfirmed) {
        throw new Error('No se pudo confirmar la asignación del canje.');
      }

      // Notificar al componente padre para que pueda cargar los detalles del cupón
      this.validateCode.emit(code);

      this.redeemingCoupon = false;
      this.redeemSuccess = true;
      this.cdr.detectChanges();
    } catch (error: any) {
      console.error('[FILTER-BAR] Error canjeando cupón', error);
      this.redeemingCoupon = false;
      const message = error?.message || 'No se pudo canjear el cupón. Intenta nuevamente.';

      try {
        const verifiedCoupon = await firstValueFrom(
          this.couponService
            .getCouponWithImageByCode(token, code)
            .pipe(take(1), timeout(8000))
        );

        if (verifiedCoupon?.redeemed) {
          this.validateCode.emit(code);
          this.redeemSuccess = true;
          this.cdr.detectChanges();
          return;
        }
      } catch (verificationError) {
        console.error('[FILTER-BAR] No fue posible verificar el estado final del cupón', verificationError);
      }

      this.showQrModal = false;
      this.scannerError = message;
      this.cdr.detectChanges();
    }
  }

  closeRedeemSuccess(): void {
    this.redeemSuccess = false;
    this.closeQrModal();
  }

  private buildCouponNotFoundMessage(): string {
    return 'No se encontró un cupón con ese código para esta empresa. Este cupón podría pertenecer a otra empresa.';
  }

  private ensureCategoriesLoaded(force = false): void {
    if (this.categoriesLoading) return;
    if (this.categoriesLoaded && !force) return;

    const token = this.auth.token;
    if (!token) {
      this.categories = [];
      this.categoriesLoaded = true;
      this.categoryLoadError = false;
      return;
    }

    this.categoriesLoading = true;
    this.categoryLoadError = false;

    this.categoryService.getCategories(token).subscribe({
      next: (categories) => {
        this.categories = categories
          .filter((category) => category.active)
          .map((category) => ({
            ...category,
            id: Number(category.id),
          }))
          .filter((category) => Number.isFinite(category.id));
        this.categoriesLoaded = true;
        this.categoriesLoading = false;
      },
      error: (error) => {
        console.error('[FILTER-BAR] Error cargando categorías', error);
        this.categories = [];
        this.categoriesLoaded = true;
        this.categoriesLoading = false;
        this.categoryLoadError = true;
      },
    });
  }

  get bgClass(): string {
    return FILTER_BG_MAP[this.role]?.[this.variant] ?? 'bg-[#E6EFFF]';
  }

  openCreateCoupon(): void {
    this.resetCreateFlow();
    this.ensureCategoriesLoaded();
    this.syncCreatePromotionTypeFromForm();
    this.createCouponOpen = true;
    this.setBodyModalLock(true);
  }

  closeCreateCoupon(): void {
    this.createCouponOpen = false;
    this.resetCreateFlow();
    this.setBodyModalLock(false);
  }

  submitCreateCoupon(): void {
    if (!this.isCouponFormValid()) {
      return;
    }

    const categoria = this.categories.find((item) => item.id === this.couponForm.categoria);
    if (!categoria) return;

    this.createCouponError = '';
    this.creatingCoupon = true;
    this.couponCreateSuccess = false;

    const failSafeTimer = setTimeout(() => {
      if (this.creatingCoupon) {
        this.onCreateCouponError('La creación tardó demasiado. Intenta nuevamente.');
      }
    }, 15000);

    this.createCoupon.emit({
      titulo: this.couponForm.titulo,
      cantidad: this.couponForm.cantidad,
      precio: this.couponForm.precio,
      descuento: this.couponForm.descuento,
      descripcion: this.couponForm.descripcion,
      fechaInicio: this.toDisplayDate(this.couponForm.fechaInicio),
      fechaFin: this.toDisplayDate(this.couponForm.fechaFin),
      categoriaId: Number(categoria.id),
      categoriaNombre: categoria.name,
      terminos: this.couponForm.terminos,
      estado: this.couponForm.estado,
      image: this.couponForm.image,
      onSuccess: () => {
        clearTimeout(failSafeTimer);
        this.onCreateCouponSuccess();
      },
      onError: (message?: string) => {
        clearTimeout(failSafeTimer);
        this.onCreateCouponError(message);
      },
    });
  }

  isCouponFormValid(): boolean {
    const f = this.couponForm;
    const cantidadValida = this.isPositiveInteger(f.cantidad);
    const tituloValido = f.titulo.trim().length > 0;
    const descripcionValida = f.descripcion.trim().length > 0;
    const fechasValidas = !!f.fechaInicio && !!f.fechaFin;
    const fechaInicioValida = this.isOnOrAfterToday(f.fechaInicio);
    const fechaFinValida = this.isOnOrAfterToday(f.fechaFin);
    const rangoFechasValido = this.isOnOrAfterDate(f.fechaFin, f.fechaInicio);
    const categoriaValida = typeof f.categoria === 'number' && f.categoria > 0;
    const terminosValidos = f.terminos.trim().length > 0;
    const estadoValido = f.estado !== '';
    const tipoPromocionValido = this.couponPromotionType !== '';
    const valorPromocionValido = this.getCurrentPromotionValue(this.couponPromotionType, f.precio, f.descuento) !== null;
    const precioValido = this.isValidNumericOrNull(f.precio);
    const descuentoValido = this.isValidNumericOrNull(f.descuento);
    return (
      cantidadValida &&
      tituloValido &&
      descripcionValida &&
      fechasValidas &&
      fechaInicioValida &&
      fechaFinValida &&
      rangoFechasValido &&
      categoriaValida &&
      terminosValidos &&
      estadoValido &&
      tipoPromocionValido &&
      valorPromocionValido &&
      precioValido &&
      descuentoValido
    );
  }

  onCreatePromotionTypeChange(): void {
    if (this.couponPromotionType === 'precio') {
      this.couponForm.descuento = null;
      return;
    }

    if (this.couponPromotionType === 'descuento') {
      this.couponForm.precio = null;
      return;
    }

    this.couponForm.precio = null;
    this.couponForm.descuento = null;
  }

  getCreatePromotionLabel(): string {
    if (this.couponPromotionType === 'precio') return 'Precio';
    if (this.couponPromotionType === 'descuento') return 'Porcentaje';
    return 'Valor de promoción';
  }

  getCreatePromotionPlaceholder(): string {
    if (this.couponPromotionType === 'precio') return 'Ingresar precio';
    if (this.couponPromotionType === 'descuento') return 'Ingresar descuento';
    return 'Selecciona tipo de promoción';
  }

  getCreatePromotionValue(): number | null {
    return this.getCurrentPromotionValue(this.couponPromotionType, this.couponForm.precio, this.couponForm.descuento);
  }

  onCreatePromotionValueInput(value: string): void {
    const parsedValue = this.parsePromotionInput(value);
    if (this.couponPromotionType === 'precio') {
      this.couponForm.precio = parsedValue;
      this.couponForm.descuento = null;
      return;
    }

    if (this.couponPromotionType === 'descuento') {
      this.couponForm.descuento = parsedValue;
      this.couponForm.precio = null;
    }
  }

  onSuccessContinue(): void {
    // Cerrar overlay de éxito y el modal
    this.couponCreateSuccess = false;
    this.closeCreateCoupon();
    // Navegar siempre a gestión de cupones
    this.router.navigate(['/company/dashboard/gestion-cupones']);
  }

  private resetCreateFlow(): void {
    this.creatingCoupon = false;
    this.couponCreateSuccess = false;
    this.createCouponError = '';
    this.couponImageError = '';
    this.couponImageLoading = false;
    this.clearCouponImageLoadingTimeout();
  }

  onCreateCouponSuccess(): void {
    this.creatingCoupon = false;
    this.couponCreateSuccess = true;
    this.createCouponError = '';
    this.cdr.detectChanges();
  }

  onCreateCouponError(message = 'No se pudo crear el cupón. Intenta nuevamente.'): void {
    this.creatingCoupon = false;
    this.couponCreateSuccess = false;
    this.createCouponError = message;
    this.cdr.detectChanges();
  }

  async onCouponImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    this.couponImageError = '';
    this.couponImageLoading = true;
    this.startCouponImageLoadingTimeout();

    if (!this.allowedCouponMimeTypes.includes(file.type)) {
      this.couponImageError = 'Formato no permitido. Solo JPG, JPEG, PNG o PDF.';
      this.couponForm.image = null;
      this.couponForm.imageName = '';
      this.couponForm.imageMime = '';
      this.couponImageLoading = false;
      this.clearCouponImageLoadingTimeout();
      if (input) input.value = '';
      return;
    }

    if (file.size > this.maxCouponFileSizeBytes) {
      this.couponImageError = 'La imagen supera el tamaño máximo de 500 KB.';
      this.couponForm.image = null;
      this.couponForm.imageName = '';
      this.couponForm.imageMime = '';
      this.couponImageLoading = false;
      this.clearCouponImageLoadingTimeout();
      if (input) input.value = '';
      return;
    }

    try {
      const base64 = await this.readFileAsDataUrl(file);
      this.couponForm.image = base64;
      this.couponForm.imageName = file.name;
      this.couponForm.imageMime = file.type;
    } catch (error) {
      console.error('[FILTER-BAR] error reading coupon image', error);
      this.couponImageError = 'No se pudo leer el archivo seleccionado.';
      this.couponForm.image = null;
      this.couponForm.imageName = '';
      this.couponForm.imageMime = '';
      if (input) input.value = '';
    } finally {
      this.couponImageLoading = false;
      this.clearCouponImageLoadingTimeout();
      this.cdr.detectChanges();
    }
  }

  removeCouponImage(input: HTMLInputElement): void {
    this.couponForm.image = null;
    this.couponForm.imageName = '';
    this.couponForm.imageMime = '';
    this.couponImageError = '';
    this.couponImageLoading = false;
    this.clearCouponImageLoadingTimeout();
    input.value = '';
  }

  pickCouponImage(input: HTMLInputElement): void {
    input.value = '';
    input.click();
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          resolve(result);
          return;
        }

        reject(new Error('No se pudo convertir el archivo a base64.'));
      };

      reader.onerror = () => reject(reader.error ?? new Error('Error leyendo archivo.'));
      reader.readAsDataURL(file);
    });
  }

  async onEditCouponImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    this.editCouponImageError = '';
    this.editCouponImageLoading = true;
    this.startEditCouponImageLoadingTimeout();

    if (!this.allowedCouponMimeTypes.includes(file.type)) {
      this.editCouponImageError = 'Formato no permitido. Solo JPG, JPEG, PNG o PDF.';
      this.editForm.image = null;
      this.editForm.imageName = '';
      this.editForm.imageMime = '';
      this.editCouponImageLoading = false;
      this.clearEditCouponImageLoadingTimeout();
      if (input) input.value = '';
      return;
    }

    if (file.size > this.maxCouponFileSizeBytes) {
      this.editCouponImageError = 'La imagen supera el tamaño máximo de 500 KB.';
      this.editForm.image = null;
      this.editForm.imageName = '';
      this.editForm.imageMime = '';
      this.editCouponImageLoading = false;
      this.clearEditCouponImageLoadingTimeout();
      if (input) input.value = '';
      return;
    }

    try {
      const base64 = await this.readFileAsDataUrl(file);
      this.editForm.image = base64;
      this.editForm.imageName = file.name;
      this.editForm.imageMime = file.type;
    } catch (error) {
      console.error('[FILTER-BAR] error reading edit coupon image', error);
      this.editCouponImageError = 'No se pudo leer el archivo seleccionado.';
      this.editForm.image = null;
      this.editForm.imageName = '';
      this.editForm.imageMime = '';
      if (input) input.value = '';
    } finally {
      this.editCouponImageLoading = false;
      this.clearEditCouponImageLoadingTimeout();
      this.cdr.detectChanges();
    }
  }

  removeEditCouponImage(input: HTMLInputElement): void {
    this.editForm.image = null;
    this.editForm.imageName = '';
    this.editForm.imageMime = '';
    this.editCouponImageError = '';
    this.editCouponImageLoading = false;
    this.clearEditCouponImageLoadingTimeout();
    input.value = '';
  }

  pickEditCouponImage(input: HTMLInputElement): void {
    input.value = '';
    input.click();
  }

  // Abrir modal de edición con datos precargados
  openEditCoupon(coupon: {
    id: number;
    titulo: string;
    descripcion: string;
    categoria: string;
    categoriaId?: number;
    fechaInicio: string;
    fechaFin: string;
    disponibles: number;
    precio?: number | null;
    descuento?: number | null;
    estado: string;
    terminos?: string;
    image?: string | null;
    imageMime?: string;
    imageName?: string;
    minCantidadDisponible?: number;
  }): void {
    this.resetEditFlow();
    this.ensureCategoriesLoaded();
    const categoriaId =
      coupon.categoriaId ??
      ((): number | null => {
        const category = this.categories.find((item) => item.name === coupon.categoria);
        return category ? Number(category.id) : null;
      })() ??
      null;

    this.editForm = {
      id: coupon.id,
      titulo: coupon.titulo,
      cantidad: coupon.disponibles,
      precio: coupon.precio ?? null,
      descuento: coupon.descuento ?? null,
      descripcion: coupon.descripcion,
      fechaInicio: this.toISODate(coupon.fechaInicio),
      fechaFin: this.toISODate(coupon.fechaFin),
      categoria: categoriaId != null ? Number(categoriaId) : null,
      terminos: coupon.terminos ?? '',
      estado: coupon.estado,
      image: coupon.image ?? null,
      imageName: coupon.imageName ?? this.getDefaultImageName(coupon.imageMime),
      imageMime: coupon.imageMime ?? '',
    };
    this.editMinAvailableQuantity = Math.max(0, Math.trunc(coupon.minCantidadDisponible ?? 0));
    this.syncEditPromotionTypeFromForm();
    this.editCouponImageError = '';
    this.editCouponOpen = true;
    this.setBodyModalLock(true);
  }

  closeEditCoupon(): void {
    this.editCouponOpen = false;
    this.resetEditFlow();
    this.setBodyModalLock(false);
  }

  submitEditCoupon(): void {
    if (!this.isEditFormValid()) {
      return;
    }

    if ((this.editForm.cantidad ?? 0) < this.editMinAvailableQuantity) {
      this.editCouponError = `La cantidad disponible no puede ser menor a ${this.editMinAvailableQuantity} (cupones adquiridos).`;
      return;
    }

    const categoria = this.categories.find((item) => item.id === this.editForm.categoria);
    if (!categoria) {
      this.editCouponError = 'Selecciona una categoría válida.';
      return;
    }

    this.editCouponError = '';
    this.editingCoupon = true;
    this.couponEditSuccess = false;

    // Fail-safe por si el componente padre no devuelve callback por alguna excepción.
    const failSafeTimer = setTimeout(() => {
      if (this.editingCoupon) {
        this.onUpdateCouponError('La actualización tardó demasiado. Intenta nuevamente.');
      }
    }, 15000);

    this.updateCoupon.emit({
      id: this.editForm.id!,
      titulo: this.editForm.titulo,
      descripcion: this.editForm.descripcion,
      categoriaId: Number(categoria.id),
      categoriaNombre: categoria.name,
      fechaInicio: this.toDisplayDate(this.editForm.fechaInicio),
      fechaFin: this.toDisplayDate(this.editForm.fechaFin),
      disponibles: this.editForm.cantidad ?? 0,
      precio: this.editForm.precio,
      descuento: this.editForm.descuento,
      estado: this.editForm.estado,
      terminos: this.editForm.terminos,
      image: this.editForm.image,
      onSuccess: () => {
        clearTimeout(failSafeTimer);
        this.onUpdateCouponSuccess();
      },
      onError: (message?: string) => {
        clearTimeout(failSafeTimer);
        this.onUpdateCouponError(message);
      },
    });
  }

  isEditFormValid(): boolean {
    const f = this.editForm;
    const cantidadValida = this.isPositiveInteger(f.cantidad);
    const tituloValido = f.titulo.trim().length > 0;
    const descripcionValida = f.descripcion.trim().length > 0;
    const fechasValidas = !!f.fechaInicio && !!f.fechaFin;
    // En edición NO validamos que sean fechas futuras, solo que sean válidas entre sí
    const rangoFechasValido = this.isOnOrAfterDate(f.fechaFin, f.fechaInicio);
    const categoriaValida = typeof f.categoria === 'number' && f.categoria > 0;
    const terminosValidos = true; // opcional en edición
    const estadoValido = f.estado !== '';
    const cantidadMayorIgualAdquiridos = typeof f.cantidad === 'number' && f.cantidad >= this.editMinAvailableQuantity;
    const tipoPromocionValido = this.editPromotionType !== '';
    const valorPromocionValido = this.getCurrentPromotionValue(this.editPromotionType, f.precio, f.descuento) !== null;
    const precioValido = this.isValidNumericOrNull(f.precio);
    const descuentoValido = this.isValidNumericOrNull(f.descuento);
    return (
      cantidadValida &&
      tituloValido &&
      descripcionValida &&
      fechasValidas &&
      rangoFechasValido &&
      cantidadMayorIgualAdquiridos &&
      categoriaValida &&
      terminosValidos &&
      estadoValido &&
      tipoPromocionValido &&
      valorPromocionValido &&
      precioValido &&
      descuentoValido
    );
  }

  onEditPromotionTypeChange(): void {
    if (this.editPromotionType === 'precio') {
      this.editForm.descuento = null;
      return;
    }

    if (this.editPromotionType === 'descuento') {
      this.editForm.precio = null;
      return;
    }

    this.editForm.precio = null;
    this.editForm.descuento = null;
  }

  getEditPromotionLabel(): string {
    if (this.editPromotionType === 'precio') return 'Precio';
    if (this.editPromotionType === 'descuento') return 'Porcentaje';
    return 'Valor de promoción';
  }

  getEditPromotionPlaceholder(): string {
    if (this.editPromotionType === 'precio') return 'Ingresar precio';
    if (this.editPromotionType === 'descuento') return 'Ingresar descuento';
    return 'Selecciona tipo de promoción';
  }

  getEditPromotionValue(): number | null {
    return this.getCurrentPromotionValue(this.editPromotionType, this.editForm.precio, this.editForm.descuento);
  }

  onEditPromotionValueInput(value: string): void {
    const parsedValue = this.parsePromotionInput(value);
    if (this.editPromotionType === 'precio') {
      this.editForm.precio = parsedValue;
      this.editForm.descuento = null;
      return;
    }

    if (this.editPromotionType === 'descuento') {
      this.editForm.descuento = parsedValue;
      this.editForm.precio = null;
    }
  }

  onEditSuccessContinue(): void {
    this.couponEditSuccess = false;
    this.closeEditCoupon();
  }

  private resetEditFlow(): void {
    this.editingCoupon = false;
    this.couponEditSuccess = false;
    this.editCouponError = '';
    this.editCouponImageError = '';
    this.editCouponImageLoading = false;
    this.editMinAvailableQuantity = 0;
    this.clearEditCouponImageLoadingTimeout();
  }

  private syncCreatePromotionTypeFromForm(): void {
    this.couponPromotionType = this.resolvePromotionType(this.couponForm.precio, this.couponForm.descuento);
  }

  private syncEditPromotionTypeFromForm(): void {
    this.editPromotionType = this.resolvePromotionType(this.editForm.precio, this.editForm.descuento);
  }

  private resolvePromotionType(price: number | null, discount: number | null): '' | 'descuento' | 'precio' {
    if (discount != null) return 'descuento';
    if (price != null) return 'precio';
    return '';
  }

  private getCurrentPromotionValue(
    type: '' | 'descuento' | 'precio',
    price: number | null,
    discount: number | null
  ): number | null {
    if (type === 'precio') return this.isValidNumericOrNull(price) && price != null ? price : null;
    if (type === 'descuento') return this.isValidNumericOrNull(discount) && discount != null ? discount : null;
    return null;
  }

  private parsePromotionInput(value: string): number | null {
    const normalized = value.trim();
    if (!normalized.length) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  private onUpdateCouponSuccess(): void {
    this.editingCoupon = false;
    this.couponEditSuccess = true;
    this.editCouponError = '';
    this.cdr.detectChanges();
  }

  private onUpdateCouponError(message = 'No se pudo actualizar el cupón. Intenta nuevamente.'): void {
    this.editingCoupon = false;
    this.couponEditSuccess = false;
    this.editCouponError = message;
    this.cdr.detectChanges();
  }

  openViewCoupon(coupon: {
    id: number;
    titulo: string;
    descripcion: string;
    empresa?: string;
    empresaNit?: string;
    categoria: string;
    oferta?: string;
    vigencia?: string;
    fechaInicio: string;
    fechaFin: string;
    disponibles: number;
    estado: string;
    terminos?: string;
    image?: string | null;
    imageMime?: string;
  }): void {
    this.viewCouponImageLoading = false;
    this.clearViewCouponImageLoadingTimeout();
    this.viewTarget = {
      id: coupon.id,
      titulo: coupon.titulo,
      descripcion: coupon.descripcion,
      empresa: coupon.empresa ?? '',
      empresaNit: coupon.empresaNit ?? '',
      categoria: coupon.categoria,
      oferta: coupon.oferta ?? '-',
      vigencia: coupon.vigencia ?? `${this.toDisplayDate(coupon.fechaInicio)} - ${this.toDisplayDate(coupon.fechaFin)}`,
      fechaInicio: this.toDisplayDate(coupon.fechaInicio),
      fechaFin: this.toDisplayDate(coupon.fechaFin),
      cantidad: coupon.disponibles,
      estado: coupon.estado,
      terminos: coupon.terminos ?? '',
      image: coupon.image ?? null,
      imageMime: coupon.imageMime ?? '',
    };
    this.viewCouponOpen = true;
    this.setBodyModalLock(true);
  }

  closeViewCoupon(): void {
    this.viewCouponOpen = false;
    this.viewCouponImageLoading = false;
    this.clearViewCouponImageLoadingTimeout();
    this.viewTarget.empresa = '';
    this.viewTarget.empresaNit = '';
    this.viewTarget.oferta = '';
    this.viewTarget.vigencia = '';
    this.viewTarget.image = null;
    this.viewTarget.imageMime = '';
    this.setBodyModalLock(false);
  }

  openCouponStatistics(coupon: {
    id: number;
    titulo: string;
    empresa?: string;
    empresaNit?: string;
    categoria?: string;
    estado?: string;
    fechaInicio: string;
    fechaFin: string;
    publicados: number;
    disponibles?: number;
    adquiridos: number;
    canjeados: number;
  }): void {
    this.statisticsMonthlyHistory = this.buildRecentMonthsWindow(4).map((item) => ({
      monthLabel: item.monthLabel,
      redemptions: 0,
    }));
    this.statisticsTransactionsSource = [];
    this.statisticsTransactions = [];
    this.statisticsTransactionsSortField = 'fecha';
    this.statisticsTransactionsSortDirection = 'desc';

    this.statisticsTarget = {
      id: coupon.id,
      titulo: coupon.titulo,
      empresa: coupon.empresa ?? '',
      empresaNit: coupon.empresaNit ?? '',
      categoria: coupon.categoria ?? '',
      estado: coupon.estado ?? '',
      fechaInicio: this.toDisplayDate(coupon.fechaInicio),
      fechaFin: this.toDisplayDate(coupon.fechaFin),
      publicados: Math.max(0, Math.trunc(coupon.publicados ?? 0)),
      disponibles: Math.max(0, Math.trunc(coupon.disponibles ?? 0)),
      adquiridos: Math.max(0, Math.trunc(coupon.adquiridos ?? 0)),
      canjeados: Math.max(0, Math.trunc(coupon.canjeados ?? 0)),
    };
    this.couponStatisticsLoading = false;
    this.couponStatisticsOpen = true;
    this.setBodyModalLock(true);
  }

  setCouponStatisticsLoading(loading: boolean): void {
    this.couponStatisticsLoading = loading;
    this.cdr.detectChanges();
  }

  updateCouponStatistics(metrics: { publicados?: number; disponibles?: number; adquiridos?: number; canjeados?: number }): void {
    if (metrics.publicados != null) {
      this.statisticsTarget.publicados = Math.max(0, Math.trunc(metrics.publicados));
    }
    if (metrics.disponibles != null) {
      this.statisticsTarget.disponibles = Math.max(0, Math.trunc(metrics.disponibles));
    }
    if (metrics.adquiridos != null) {
      this.statisticsTarget.adquiridos = Math.max(0, Math.trunc(metrics.adquiridos));
    }
    if (metrics.canjeados != null) {
      this.statisticsTarget.canjeados = Math.max(0, Math.trunc(metrics.canjeados));
    }
    this.cdr.detectChanges();
  }

  updateCouponStatisticsHistory(rows: Array<{ monthName: string; redemptionYear?: number; totalRedemptions: number }>): void {
    const recentMonths = this.buildRecentMonthsWindow(4);
    const redemptionsByMonth = new Map<string, number>();

    for (const row of rows ?? []) {
      const monthNumber = this.toMonthNumber(row.monthName);
      if (!monthNumber) continue;

      const year = typeof row.redemptionYear === 'number' && Number.isFinite(row.redemptionYear)
        ? Math.trunc(row.redemptionYear)
        : new Date().getFullYear();
      const key = this.buildMonthKey(year, monthNumber);
      const current = redemptionsByMonth.get(key) ?? 0;
      const next = current + Math.max(0, Math.trunc(row.totalRedemptions ?? 0));
      redemptionsByMonth.set(key, next);
    }

    this.statisticsMonthlyHistory = recentMonths.map((item) => ({
      monthLabel: item.monthLabel,
      redemptions: redemptionsByMonth.get(this.buildMonthKey(item.year, item.month)) ?? 0,
    }));
    this.cdr.detectChanges();
  }

  updateCouponStatisticsTransactions(rows: Array<{
    createdAt: string;
    userEmail?: string | null;
    userFirstName?: string | null;
    userLastName?: string | null;
    actionType?: string | null;
  }>): void {
    this.statisticsTransactionsSource = (rows ?? []).map((row) => ({
      fecha: this.toDisplayDateTime(row.createdAt),
      cliente: this.resolveAuditClientLabel(row.userEmail ?? null, row.userFirstName ?? null, row.userLastName ?? null),
      tipo: this.normalizeAuditType(row.actionType ?? ''),
      createdAtTimestamp: this.toTimestamp(row.createdAt),
    }));
    this.applyStatisticsTransactionsSortAndLimit();
    this.cdr.detectChanges();
  }

  sortStatisticsTransactions(field: StatisticsTransactionSortField): void {
    if (this.statisticsTransactionsSortField === field) {
      this.statisticsTransactionsSortDirection = this.statisticsTransactionsSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.statisticsTransactionsSortField = field;
      this.statisticsTransactionsSortDirection = field === 'fecha' ? 'desc' : 'asc';
    }

    this.applyStatisticsTransactionsSortAndLimit();
    this.cdr.detectChanges();
  }

  isStatisticsTransactionsSortActive(field: StatisticsTransactionSortField): boolean {
    return this.statisticsTransactionsSortField === field;
  }

  closeCouponStatistics(): void {
    this.couponStatisticsOpen = false;
    this.couponStatisticsLoading = false;
    this.setBodyModalLock(false);
  }

  // Abrir modal de eliminación
  openDeleteCoupon(coupon: {
    id: number;
    titulo: string;
    descripcion: string;
    categoria: string;
    fechaInicio: string;
    fechaFin: string;
    disponibles: number;
    estado: string;
    terminos?: string;
    image?: string | null;
    imageMime?: string;
  }): void {
    this.deletingCoupon = false;
    this.deleteCouponImageLoading = false;
    this.clearDeleteCouponImageLoadingTimeout();
    this.deleteTarget = {
      id: coupon.id,
      titulo: coupon.titulo,
      descripcion: coupon.descripcion,
      categoria: coupon.categoria,
      fechaInicio: this.toDisplayDate(coupon.fechaInicio),
      fechaFin: this.toDisplayDate(coupon.fechaFin),
      cantidad: coupon.disponibles,
      estado: coupon.estado,
      terminos: coupon.terminos ?? '',
      image: coupon.image ?? null,
      imageMime: coupon.imageMime ?? '',
    };
    this.deleteCouponOpen = true;
  }

  closeDeleteCoupon(): void {
    this.deleteCouponOpen = false;
    this.deletingCoupon = false;
    this.couponDeleteSuccess = false;
    this.deleteCouponError = '';
    this.deleteCouponImageLoading = false;
    this.clearDeleteCouponImageLoadingTimeout();
    this.deleteTarget.image = null;
    this.deleteTarget.imageMime = '';
  }

  submitDeleteCoupon(): void {
    if (this.deleteTarget.id == null) return;

    this.deleteCouponError = '';
    this.deletingCoupon = true;
    this.couponDeleteSuccess = false;

    const failSafeTimer = setTimeout(() => {
      if (this.deletingCoupon) {
        this.onDeleteCouponError('La eliminación tardó demasiado. Intenta nuevamente.');
      }
    }, 15000);

    this.deleteCoupon.emit({
      id: this.deleteTarget.id,
      onSuccess: () => {
        clearTimeout(failSafeTimer);
        this.onDeleteCouponSuccess();
      },
      onError: (message?: string) => {
        clearTimeout(failSafeTimer);
        this.onDeleteCouponError(message);
      },
    });
  }

  onDeleteSuccessContinue(): void {
    this.couponDeleteSuccess = false;
    this.closeDeleteCoupon();
    // Navegar siempre a gestión de cupones
    this.router.navigate(['/company/dashboard/gestion-cupones']);
  }

  private onDeleteCouponSuccess(): void {
    this.deletingCoupon = false;
    this.couponDeleteSuccess = true;
    this.deleteCouponError = '';
    this.cdr.detectChanges();
  }

  private onDeleteCouponError(message = 'No se pudo eliminar el cupón. Intenta nuevamente.'): void {
    this.deletingCoupon = false;
    this.couponDeleteSuccess = false;
    this.deleteCouponError = message;
    this.cdr.detectChanges();
  }

  setEditCouponImageLoading(loading: boolean): void {
    this.editCouponImageLoading = loading;
    if (loading) this.startEditCouponImageLoadingTimeout();
    else this.clearEditCouponImageLoadingTimeout();
    this.cdr.detectChanges();
  }

  setEditCouponImagePreview(image: string | null, imageMime = '', imageName = ''): void {
    this.editForm.image = image;
    this.editForm.imageMime = imageMime;
    this.editForm.imageName = image ? (imageName || this.getDefaultImageName(imageMime)) : '';
    this.editCouponImageLoading = false;
    this.clearEditCouponImageLoadingTimeout();
    this.cdr.detectChanges();
  }

  setDeleteCouponImageLoading(loading: boolean): void {
    this.deleteCouponImageLoading = loading;
    if (loading) this.startDeleteCouponImageLoadingTimeout();
    else this.clearDeleteCouponImageLoadingTimeout();
    this.cdr.detectChanges();
  }

  setViewCouponImageLoading(loading: boolean): void {
    this.viewCouponImageLoading = loading;
    if (loading) this.startViewCouponImageLoadingTimeout();
    else this.clearViewCouponImageLoadingTimeout();
    this.cdr.detectChanges();
  }

  setViewCouponImagePreview(image: string | null, imageMime = ''): void {
    this.viewTarget.image = image;
    this.viewTarget.imageMime = imageMime;
    this.viewCouponImageLoading = false;
    this.clearViewCouponImageLoadingTimeout();
    this.cdr.detectChanges();
  }

  setDeleteCouponImagePreview(image: string | null, imageMime = ''): void {
    this.deleteTarget.image = image;
    this.deleteTarget.imageMime = imageMime;
    this.deleteCouponImageLoading = false;
    this.clearDeleteCouponImageLoadingTimeout();
    this.cdr.detectChanges();
  }

  getCouponStateBadgeClass(status: string | null | undefined): string {
    const normalized = String(status ?? '').trim().toLowerCase();
    if (normalized === 'borrador') return 'bg-[#FFE8A8] text-[#7A6200]';
    if (normalized === 'publicado') return 'bg-[#C8E8D2] text-[#1E6D3D]';
    if (normalized === 'agotado') return 'bg-[#F6D2D8] text-[#9B2230]';
    if (normalized === 'vencido') return 'bg-[#B8D5F3] text-[#0C56A5]';
    return 'bg-[#D8E4F6] text-[#2A3A65]';
  }

  getCouponTermsList(terms: string): string[] {
    const normalized = String(terms ?? '').replace(/\r/g, '').trim();
    if (!normalized.length) return [];

    return normalized
      .split(/\n|•|;/g)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  // Utilidades de fecha
  private toISODate(dateStr: string): string {
    if (!dateStr) return '';
    // Formato ISO ya válido
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return dateStr;
    // Formato dd/mm/yyyy o dd-mm-yyyy
    const dmYMatch = dateStr.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (dmYMatch) {
      const [_, d, m, y] = dmYMatch;
      return `${y}-${m}-${d}`;
    }
    return dateStr; // fallback
  }

  private toDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    // Si viene como yyyy-mm-dd
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [_, y, m, d] = isoMatch;
      return `${d}/${m}/${y}`;
    }
    // Si ya está en dd/mm/yyyy o dd-mm-yyyy, normalizar a dd/mm/yyyy
    const dmYMatch = dateStr.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (dmYMatch) {
      const [_, d, m, y] = dmYMatch;
      return `${d}/${m}/${y}`;
    }
    return dateStr;
  }

  private toDisplayDateTime(input: string): string {
    if (!input) return '-';

    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return input;

    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');

    return `${dd}/${mm}/${yyyy} - ${hh}:${min}`;
  }

  private toTimestamp(input: string): number {
    const timestamp = new Date(input).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  private applyStatisticsTransactionsSortAndLimit(): void {
    const direction = this.statisticsTransactionsSortDirection === 'asc' ? 1 : -1;
    const field = this.statisticsTransactionsSortField;
    const sorted = [...this.statisticsTransactionsSource].sort((a, b) => {
      if (field === 'fecha') {
        return (a.createdAtTimestamp - b.createdAtTimestamp) * direction;
      }

      if (field === 'tipo') {
        const byType = a.tipo.localeCompare(b.tipo, 'es', { sensitivity: 'base' });
        if (byType !== 0) return byType * direction;
        return (a.createdAtTimestamp - b.createdAtTimestamp) * -1;
      }

      const byClient = a.cliente.localeCompare(b.cliente, 'es', { sensitivity: 'base' });
      if (byClient !== 0) return byClient * direction;
      return (a.createdAtTimestamp - b.createdAtTimestamp) * -1;
    });

    this.statisticsTransactions = sorted.slice(0, this.statisticsTransactionsVisibleLimit);
  }

  private toMonthShortLabel(monthName: string): string {
    const normalized = String(monthName ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();

    if (!normalized) return '---';

    const byPrefix: Record<string, string> = {
      ENE: 'ENE', ENERO: 'ENE',
      FEB: 'FEB', FEBRERO: 'FEB',
      MAR: 'MAR', MARZO: 'MAR',
      ABR: 'ABR', ABRIL: 'ABR',
      MAY: 'MAY', MAYO: 'MAY',
      JUN: 'JUN', JUNIO: 'JUN',
      JUL: 'JUL', JULIO: 'JUL',
      AGO: 'AGO', AGOSTO: 'AGO',
      SEP: 'SEP', SEPT: 'SEP', SEPTIEMBRE: 'SEP',
      OCT: 'OCT', OCTUBRE: 'OCT',
      NOV: 'NOV', NOVIEMBRE: 'NOV',
      DIC: 'DIC', DICIEMBRE: 'DIC',
    };

    return byPrefix[normalized] ?? normalized.slice(0, 3);
  }

  private toMonthNumber(monthName: string): number | null {
    const normalized = this.toMonthShortLabel(monthName);
    const monthMap: Record<string, number> = {
      ENE: 1, JAN: 1,
      FEB: 2,
      MAR: 3,
      ABR: 4, APR: 4,
      MAY: 5,
      JUN: 6,
      JUL: 7,
      AGO: 8, AUG: 8,
      SEP: 9,
      OCT: 10,
      NOV: 11,
      DIC: 12, DEC: 12,
    };

    return monthMap[normalized] ?? null;
  }

  private buildRecentMonthsWindow(size: number): Array<{ year: number; month: number; monthLabel: string }> {
    const safeSize = Math.max(1, Math.trunc(size));
    const now = new Date();
    const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthLabels = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const result: Array<{ year: number; month: number; monthLabel: string }> = [];

    for (let offset = safeSize - 1; offset >= 0; offset -= 1) {
      const current = new Date(cursor.getFullYear(), cursor.getMonth() - offset, 1);
      const month = current.getMonth() + 1;
      result.push({
        year: current.getFullYear(),
        month,
        monthLabel: monthLabels[month - 1] ?? '---',
      });
    }

    return result;
  }

  private buildMonthKey(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  private resolveAuditClientLabel(email: string | null, firstName: string | null, lastName: string | null): string {
    const fullName = `${String(firstName ?? '').trim()} ${String(lastName ?? '').trim()}`.trim();
    if (fullName) return fullName;
    if (email) return email;
    return 'Sin cliente';
  }

  private normalizeAuditType(actionType: string): 'Canje' | 'Adquisición' {
    const value = String(actionType ?? '').toUpperCase();
    if (value.includes('REDEEM') || value.includes('CANJE')) return 'Canje';
    return 'Adquisición';
  }

  private buildTodayIso(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isOnOrAfterToday(dateStr: string): boolean {
    if (!dateStr) return false;
    const iso = this.toISODate(dateStr);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    return iso >= this.todayIso;
  }

  private isOnOrAfterDate(dateStr: string, minDateStr: string): boolean {
    if (!dateStr || !minDateStr) return false;
    const isoDate = this.toISODate(dateStr);
    const isoMin = this.toISODate(minDateStr);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate) || !/^\d{4}-\d{2}-\d{2}$/.test(isoMin)) return false;
    return isoDate >= isoMin;
  }

  private isPositiveInteger(value: number | null): boolean {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
  }

  private isValidNumericOrNull(value: any): boolean {
    // Permite null, undefined, o números no negativos
    if (value === null || value === undefined || value === '') return true;
    if (typeof value === 'number') {
      return Number.isFinite(value) && value >= 0;
    }
    if (typeof value === 'string' && value.trim() === '') return true;
    return false;
  }

  private getDefaultImageName(mimeType?: string): string {
    if (!mimeType) return '';
    return mimeType.startsWith('application/pdf') ? 'Archivo actual.pdf' : 'Imagen actual';
  }

  private startCouponImageLoadingTimeout(): void {
    this.clearCouponImageLoadingTimeout();
    this.couponImageLoadingTimeoutId = setTimeout(() => {
      this.couponImageLoading = false;
      this.cdr.detectChanges();
    }, 15000);
  }

  private clearCouponImageLoadingTimeout(): void {
    if (!this.couponImageLoadingTimeoutId) return;
    clearTimeout(this.couponImageLoadingTimeoutId);
    this.couponImageLoadingTimeoutId = null;
  }

  private startEditCouponImageLoadingTimeout(): void {
    this.clearEditCouponImageLoadingTimeout();
    this.editCouponImageLoadingTimeoutId = setTimeout(() => {
      this.editCouponImageLoading = false;
      this.cdr.detectChanges();
    }, 15000);
  }

  private clearEditCouponImageLoadingTimeout(): void {
    if (!this.editCouponImageLoadingTimeoutId) return;
    clearTimeout(this.editCouponImageLoadingTimeoutId);
    this.editCouponImageLoadingTimeoutId = null;
  }

  private startViewCouponImageLoadingTimeout(): void {
    this.clearViewCouponImageLoadingTimeout();
    this.viewCouponImageLoadingTimeoutId = setTimeout(() => {
      this.viewCouponImageLoading = false;
      this.cdr.detectChanges();
    }, 15000);
  }

  private clearViewCouponImageLoadingTimeout(): void {
    if (!this.viewCouponImageLoadingTimeoutId) return;
    clearTimeout(this.viewCouponImageLoadingTimeoutId);
    this.viewCouponImageLoadingTimeoutId = null;
  }

  private startDeleteCouponImageLoadingTimeout(): void {
    this.clearDeleteCouponImageLoadingTimeout();
    this.deleteCouponImageLoadingTimeoutId = setTimeout(() => {
      this.deleteCouponImageLoading = false;
      this.cdr.detectChanges();
    }, 15000);
  }

  private clearDeleteCouponImageLoadingTimeout(): void {
    if (!this.deleteCouponImageLoadingTimeoutId) return;
    clearTimeout(this.deleteCouponImageLoadingTimeoutId);
    this.deleteCouponImageLoadingTimeoutId = null;
  }

  constructor(
    private router: Router,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    private auth: AuthService,
    private categoryService: CategoryService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private couponService: CouponService
  ) { }

  private setBodyModalLock(on: boolean): void {
    const body = this.document.body;
    if (on) {
      this.renderer.addClass(body, 'modal-open-lock');
    } else {
      this.renderer.removeClass(body, 'modal-open-lock');
    }
  }

  private getCouponsRoute(): string {
    if (this.role === 'admin') return '/admin/dashboard/coupons-list';
    if (this.role === 'empresa') return '/company/dashboard/gestion-cupones';
    // Fallback para usuario estándar (si aplica)
    return '/company/dashboard/gestion-cupones';
  }
}
