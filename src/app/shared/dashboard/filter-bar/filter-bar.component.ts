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
  couponImageError = '';
  couponImageLoading = false;
  private readonly maxCouponFileSizeBytes = 500 * 1024;
  private readonly allowedCouponMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  couponForm = {
    titulo: '',
    cantidad: null as number | null,
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

  // Estado para el modal de editar cupón
  editCouponOpen = false;
  editingCoupon = false;
  couponEditSuccess = false;
  editCouponError = '';
  editCouponImageError = '';
  editCouponImageLoading = false;
  editForm = {
    id: null as number | null,
    titulo: '',
    cantidad: null as number | null,
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

    const failSafeTimer = setTimeout(() => {
      if (this.creatingCoupon) {
        this.onCreateCouponError('La creación tardó demasiado. Intenta nuevamente.');
      }
    }, 15000);

    console.log('[FILTER-BAR] submitCreateCoupon', {
      title: this.couponForm.titulo,
      categoryId: categoria.id,
      hasImage: !!this.couponForm.image,
      imageName: this.couponForm.imageName,
      imageChars: this.couponForm.image?.length ?? 0,
    });

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

      console.log('[FILTER-BAR] coupon image selected', {
        name: file.name,
        size: file.size,
        type: file.type,
        base64Chars: base64.length,
      });
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

      console.log('[FILTER-BAR] edit coupon image selected', {
        name: file.name,
        size: file.size,
        type: file.type,
        base64Chars: base64.length,
      });
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
    estado: string;
    terminos?: string;
    image?: string | null;
    imageMime?: string;
    imageName?: string;
  }): void {
    this.resetEditFlow();
    this.ensureCategoriesLoaded();
    const categoriaId =
      coupon.categoriaId ??
      this.categories.find((category) => category.name === coupon.categoria)?.id ??
      null;

    this.editForm = {
      id: coupon.id,
      titulo: coupon.titulo,
      cantidad: coupon.disponibles,
      descripcion: coupon.descripcion,
      fechaInicio: this.toISODate(coupon.fechaInicio),
      fechaFin: this.toISODate(coupon.fechaFin),
      categoria: categoriaId,
      terminos: coupon.terminos ?? '',
      estado: coupon.estado,
      image: coupon.image ?? null,
      imageName: coupon.imageName ?? this.getDefaultImageName(coupon.imageMime),
      imageMime: coupon.imageMime ?? '',
    };
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

    console.log('[FILTER-BAR] submitEditCoupon', {
      id: this.editForm.id,
      title: this.editForm.titulo,
      stock_available: this.editForm.cantidad,
      hasImage: !!this.editForm.image,
      imageName: this.editForm.imageName,
      imageChars: this.editForm.image?.length ?? 0,
    });

    this.updateCoupon.emit({
      id: this.editForm.id!,
      titulo: this.editForm.titulo,
      descripcion: this.editForm.descripcion,
      categoriaId: categoria.id,
      categoriaNombre: categoria.name,
      fechaInicio: this.toDisplayDate(this.editForm.fechaInicio),
      fechaFin: this.toDisplayDate(this.editForm.fechaFin),
      disponibles: this.editForm.cantidad ?? 0,
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
    this.editCouponError = '';
    this.editCouponImageError = '';
    this.editCouponImageLoading = false;
    this.clearEditCouponImageLoadingTimeout();
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

  setDeleteCouponImagePreview(image: string | null, imageMime = ''): void {
    this.deleteTarget.image = image;
    this.deleteTarget.imageMime = imageMime;
    this.deleteCouponImageLoading = false;
    this.clearDeleteCouponImageLoadingTimeout();
    this.cdr.detectChanges();
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
