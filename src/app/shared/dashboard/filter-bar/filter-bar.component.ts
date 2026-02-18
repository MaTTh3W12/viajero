import { Component, EventEmitter, Input, Output, Renderer2, Inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FilterVariant } from '../../../service/filter-bar.types';
import { UserRole } from '../../../service/auth.service';

const FILTER_BG_MAP: Record<UserRole, Record<FilterVariant, string>> = {
  admin: {
    users:     'bg-[#D4FFF1]', // Todos los usuarios
    audit:     'bg-[#FFE3C1]', // Auditoría
    category:  'bg-[#FFE2DB]', // Categorías
    coupons:   'bg-[#C8E7FF]', // Todos los cupones
    messages:  'bg-[#D4FFF1]', // Mensajes
    companies: 'bg-[#D4D6FF]', // Empresas
    statistics: 'bg-[#E6EFFF]', // Estadísticas
    'canje-cupones': 'bg-[#e6e6fa]', // Canje de cupones
    'historial-canjes': 'bg-[#E6EFFF]', // Historial de canjes (igual que statistics)
  },
  empresa: {
    users:     'bg-[#D4FFF1]', // Todos los usuarios
    audit:     'bg-[#FFE3C1]', // Auditoría
    category:  'bg-[#FFE2DB]', // Categorías
    coupons:   'bg-[#C8E7FF]', // Todos los cupones
    messages:  'bg-[#D4FFF1]', // Mensajes
    companies: 'bg-[#D4D6FF]', // Empresas
    statistics: 'bg-[#FFE3C1]', // Estadísticas
    'canje-cupones': 'bg-[#D4D6FF]', // Canje de cupones
    'historial-canjes': 'bg-[#FFE2DB]', // Historial de canjes (igual que statistics)
  },
  usuario: {
    users:     'bg-[#D4FFF1]',
    audit:     'bg-[#FFE3C1]',
    category:  'bg-[#FFE2DB]',
    coupons:   'bg-[#C8E7FF]',
    messages:  'bg-[#D4FFF1]',
    companies: 'bg-[#D4D6FF]',
    statistics: 'bg-[#E6EFFF]',
    'canje-cupones': 'bg-[#e6e6fa]', // Canje de cupones
    'historial-canjes': 'bg-[#E6EFFF]', // Historial de canjes (igual que statistics)
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
  constructor(
    private router: Router,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  // Estados para overlays de canje
  redeemingCoupon = false;
  redeemSuccess = false;
  showConfirmRedeemModal = false;

  // Acción al hacer clic en 'Escanear QR' dentro del modal
  onQrScanButtonClick(): void {
    this.showConfirmRedeemModal = true;
  }

  // Cerrar el modal de confirmación
  closeConfirmRedeemModal(): void {
    this.showConfirmRedeemModal = false;
  }

  // Acción al confirmar canje
  confirmRedeem(): void {
    console.log('VALIDAR CUPON: inicia overlay canjeando');
    this.showConfirmRedeemModal = false;
    this.redeemingCoupon = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.redeemingCoupon = false;
      this.redeemSuccess = true;
      this.cdr.detectChanges();
      console.log('VALIDAR CUPON: overlay éxito');
    }, 3000);
  }

  // Cerrar overlay de éxito
  closeRedeemSuccess(): void {
    this.redeemSuccess = false;
    this.closeQrModal();
  }
  // Para el input de código de cupón
  couponCode: string = '';
  scannerHasDevices: boolean = false;
  scannerHasPermission: boolean = false;
  scannerError: string | null = null;
  availableDevices: MediaDeviceInfo[] = [];
  currentDevice: MediaDeviceInfo | null = null;
    onCamerasFound(devices: MediaDeviceInfo[]): void {
      this.availableDevices = devices;
      this.scannerHasDevices = devices && devices.length > 0;
      if (devices.length > 0) {
        this.currentDevice = devices[0];
      }
    }

    onHasPermission(has: boolean): void {
      this.scannerHasPermission = has;
      if (!has) {
        this.scannerError = 'No se otorgó permiso para acceder a la cámara.';
      } else {
        this.scannerError = null;
      }
    }

    onScanError(error: any): void {
      this.scannerError = 'Error al acceder a la cámara: ' + (error?.message || error);
    }
  @Input({ required: true }) variant!: FilterVariant;
  @Input({ required: true }) role!: UserRole;
  @Output() createCoupon = new EventEmitter<{
    titulo: string;
    cantidad: number | null;
    descripcion: string;
    fechaInicio: string;
    fechaFin: string;
    categoria: string;
    terminos: string;
    estado: string;
  }>();
  @Output() updateCoupon = new EventEmitter<{
    id: number;
    titulo: string;
    descripcion: string;
    categoria: string;
    fechaInicio: string;
    fechaFin: string;
    disponibles: number;
    estado: string;
    terminos: string[];
  }>();
  @Output() deleteCoupon = new EventEmitter<number>();

  auditTypeOpen = false;
  auditTypeSelected = 'Seleccionar tipo';
  auditTypeOptions = ['Desactivación', 'Aprobación'];

  // Estado para filtros de estadísticas
  statisticsFiltersOpen = false;
  statisticsMetricTypeOpen = false;

    // Estado y métodos para el modal de escaneo QR
    showQrModal = false;

    openQrModal(): void {
      this.showQrModal = true;
    }

    closeQrModal(): void {
      this.showQrModal = false;
    }

  onQrScan(result: string): void {
    this.couponCode = result;
    this.closeQrModal();
  }
  statisticsMetricTypeSelected = 'Seleccionar tipo de métrica';
  statisticsMetricTypeOptions = ['Canjes', 'Vistas', 'Conversión', 'Ingresos'];

  toggleStatisticsFilters(): void {
    this.statisticsFiltersOpen = !this.statisticsFiltersOpen;
  }

  selectStatisticsMetricType(option: string): void {
    this.statisticsMetricTypeSelected = option;
    this.statisticsMetricTypeOpen = false;
  }

  // Estado para el modal de crear cupón
  createCouponOpen = false;
  // Estados de overlay dentro del modal (similar a login)
  creatingCoupon = false;
  couponCreateSuccess = false;
  couponForm = {
    titulo: '',
    cantidad: null as number | null,
    descripcion: '',
    fechaInicio: '',
    fechaFin: '',
    categoria: '',
    terminos: '',
    estado: '',
  };

  // Estado para el modal de editar cupón
  editCouponOpen = false;
  editingCoupon = false;
  couponEditSuccess = false;
  editForm = {
    id: null as number | null,
    titulo: '',
    cantidad: null as number | null,
    descripcion: '',
    fechaInicio: '',
    fechaFin: '',
    categoria: '',
    terminos: '',
    estado: '',
  };

  // Estado para eliminar cupón
  deleteCouponOpen = false;
  deletingCoupon = false;
  couponDeleteSuccess = false;
  deleteTarget: {
    id: number | null;
    titulo: string;
    descripcion: string;
    categoria: string;
    fechaInicio: string;
    fechaFin: string;
    cantidad: number | null;
    estado: string;
    terminos: string[];
  } = {
    id: null,
    titulo: '',
    descripcion: '',
    categoria: '',
    fechaInicio: '',
    fechaFin: '',
    cantidad: null,
    estado: '',
    terminos: [],
  };

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

  get bgClass(): string {
    return FILTER_BG_MAP[this.role]?.[this.variant] ?? 'bg-[#E6EFFF]';
  }

  openCreateCoupon(): void {
    this.resetCreateFlow();
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

    // Simular creación: mostrar overlay de carga por 3s y luego éxito
    this.creatingCoupon = true;
    setTimeout(() => {
      this.creatingCoupon = false;
      this.couponCreateSuccess = true;
      this.createCoupon.emit({
        ...this.couponForm,
        fechaInicio: this.toDisplayDate(this.couponForm.fechaInicio),
        fechaFin: this.toDisplayDate(this.couponForm.fechaFin),
      });
    }, 3000);
  }

  isCouponFormValid(): boolean {
    const f = this.couponForm;
    const cantidadValida = typeof f.cantidad === 'number' && f.cantidad > 0;
    const tituloValido = f.titulo.trim().length > 0;
    const descripcionValida = f.descripcion.trim().length > 0;
    const fechasValidas = !!f.fechaInicio && !!f.fechaFin;
    const categoriaValida = f.categoria !== '';
    const terminosValidos = f.terminos.trim().length > 0;
    const estadoValido = f.estado !== '';
    return (
      cantidadValida &&
      tituloValido &&
      descripcionValida &&
      fechasValidas &&
      categoriaValida &&
      terminosValidos &&
      estadoValido
    );
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
  }

  // Abrir modal de edición con datos precargados
  openEditCoupon(coupon: {
    id: number;
    titulo: string;
    descripcion: string;
    categoria: string;
    fechaInicio: string;
    fechaFin: string;
    disponibles: number;
    estado: string;
  }): void {
    this.resetEditFlow();
    this.editForm = {
      id: coupon.id,
      titulo: coupon.titulo,
      cantidad: coupon.disponibles,
      descripcion: coupon.descripcion,
      fechaInicio: this.toISODate(coupon.fechaInicio),
      fechaFin: this.toISODate(coupon.fechaFin),
      categoria: coupon.categoria,
      terminos: '',
      estado: coupon.estado,
    };
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

    this.editingCoupon = true;
    setTimeout(() => {
      this.editingCoupon = false;
      this.couponEditSuccess = true;
      this.updateCoupon.emit({
        id: this.editForm.id!,
        titulo: this.editForm.titulo,
        descripcion: this.editForm.descripcion,
        categoria: this.editForm.categoria,
        fechaInicio: this.toDisplayDate(this.editForm.fechaInicio),
        fechaFin: this.toDisplayDate(this.editForm.fechaFin),
        disponibles: this.editForm.cantidad ?? 0,
        estado: this.editForm.estado,
        terminos: this.editForm.terminos ? this.editForm.terminos.split('\n').filter(t => t.trim() !== '') : [],
      });
    }, 1500);
  }

  isEditFormValid(): boolean {
    const f = this.editForm;
    const cantidadValida = typeof f.cantidad === 'number' && f.cantidad >= 0;
    const tituloValido = f.titulo.trim().length > 0;
    const descripcionValida = f.descripcion.trim().length > 0;
    const fechasValidas = !!f.fechaInicio && !!f.fechaFin;
    const categoriaValida = f.categoria !== '';
    const terminosValidos = true; // opcional en edición
    const estadoValido = f.estado !== '';
    return (
      cantidadValida &&
      tituloValido &&
      descripcionValida &&
      fechasValidas &&
      categoriaValida &&
      terminosValidos &&
      estadoValido
    );
  }

  onEditSuccessContinue(): void {
    this.couponEditSuccess = false;
    this.closeEditCoupon();
  }

  private resetEditFlow(): void {
    this.editingCoupon = false;
    this.couponEditSuccess = false;
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
    terminos: string[];
  }): void {
    this.deletingCoupon = false;
    this.deleteTarget = {
      id: coupon.id,
      titulo: coupon.titulo,
      descripcion: coupon.descripcion,
      categoria: coupon.categoria,
      fechaInicio: this.toDisplayDate(coupon.fechaInicio),
      fechaFin: this.toDisplayDate(coupon.fechaFin),
      cantidad: coupon.disponibles,
      estado: coupon.estado,
      terminos: coupon.terminos || [],
    };
    this.deleteCouponOpen = true;
  }

  closeDeleteCoupon(): void {
    this.deleteCouponOpen = false;
    this.deletingCoupon = false;
    this.couponDeleteSuccess = false;
  }

  submitDeleteCoupon(): void {
    if (this.deleteTarget.id == null) return;
    this.deletingCoupon = true;
    setTimeout(() => {
      this.deletingCoupon = false;
      this.deleteCoupon.emit(this.deleteTarget.id!);
      this.couponDeleteSuccess = true;
    }, 1000);
  }

  onDeleteSuccessContinue(): void {
    this.couponDeleteSuccess = false;
    this.closeDeleteCoupon();
    // Navegar siempre a gestión de cupones
    this.router.navigate(['/company/dashboard/gestion-cupones']);
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
