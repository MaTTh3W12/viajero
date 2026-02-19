import { Component, EventEmitter, Input, Output, Renderer2, Inject, ChangeDetectorRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FilterVariant } from '../../../service/filter-bar.types';
import { AuthService, UserRole } from '../../../service/auth.service';
import { Category, CategoryService } from '../../../service/category.service';

const FILTER_BG_MAP: Record<UserRole, Record<FilterVariant, string>> = {
  admin: {
    users:     'bg-[#D4FFF1]', // Todos los usuarios
    audit:     'bg-[#FFE3C1]', // Auditoría
    category:  'bg-[#FFE2DB]', // Categorías
    coupons:   'bg-[#C8E7FF]', // Todos los cupones
    messages:  'bg-[#D4FFF1]', // Mensajes
    companies: 'bg-[#D4D6FF]', // Empresas
  },
  empresa: {
    users:     'bg-[#D4FFF1]', // Todos los usuarios
    audit:     'bg-[#FFE3C1]', // Auditoría
    category:  'bg-[#FFE2DB]', // Categorías
    coupons:   'bg-[#C8E7FF]', // Todos los cupones
    messages:  'bg-[#D4FFF1]', // Mensajes
    companies: 'bg-[#D4D6FF]', // Empresas
  },
  usuario: {
    users:     'bg-[#D4FFF1]',
    audit:     'bg-[#FFE3C1]',
    category:  'bg-[#FFE2DB]',
    coupons:   'bg-[#C8E7FF]',
    messages:  'bg-[#D4FFF1]',
    companies: 'bg-[#D4D6FF]',
  },
};

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './filter-bar.component.html',
  styleUrl: './filter-bar.component.css',
})
export class FilterBarComponent {
  @Input({ required: true }) variant!: FilterVariant;
  @Input({ required: true }) role!: UserRole;
  @Output() createCoupon = new EventEmitter<{
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
  }>();
  @Output() deleteCoupon = new EventEmitter<number>();

  auditTypeOpen = false;
  auditTypeSelected = 'Seleccionar tipo';
  auditTypeOptions = ['Desactivación', 'Aprobación'];


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
  couponForm = {
    titulo: '',
    cantidad: null as number | null,
    descripcion: '',
    fechaInicio: '',
    fechaFin: '',
    categoria: null as number | null,
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
  } = {
    id: null,
    titulo: '',
    descripcion: '',
    categoria: '',
    fechaInicio: '',
    fechaFin: '',
    cantidad: null,
    estado: '',
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
        this.categories = categories.filter((category) => category.active);
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

    this.createCoupon.emit({
      titulo: this.couponForm.titulo,
      cantidad: this.couponForm.cantidad,
      descripcion: this.couponForm.descripcion,
      fechaInicio: this.toDisplayDate(this.couponForm.fechaInicio),
      fechaFin: this.toDisplayDate(this.couponForm.fechaFin),
      categoriaId: categoria.id,
      categoriaNombre: categoria.name,
      terminos: this.couponForm.terminos,
      estado: this.couponForm.estado,
      onSuccess: () => this.onCreateCouponSuccess(),
      onError: (message?: string) => this.onCreateCouponError(message),
    });
  }

  isCouponFormValid(): boolean {
    const f = this.couponForm;
    const cantidadValida = typeof f.cantidad === 'number' && f.cantidad > 0;
    const tituloValido = f.titulo.trim().length > 0;
    const descripcionValida = f.descripcion.trim().length > 0;
    const fechasValidas = !!f.fechaInicio && !!f.fechaFin;
    const categoriaValida = typeof f.categoria === 'number' && f.categoria > 0;
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
    this.createCouponError = '';
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
    this.ensureCategoriesLoaded();
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
      });
    }, 1500);
  }

  isEditFormValid(): boolean {
    const f = this.editForm;
    const cantidadValida = typeof f.cantidad === 'number' && f.cantidad >= 0;
    const tituloValido = f.titulo.trim().length > 0;
    const descripcionValida = f.descripcion.trim().length > 0;
    const fechasValidas = !!f.fechaInicio && !!f.fechaFin;
    const categoriaValida = typeof f.categoria === 'number' && f.categoria > 0;
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

  constructor(
    private router: Router,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    private auth: AuthService,
    private categoryService: CategoryService,
    private cdr: ChangeDetectorRef
  ) {}

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
