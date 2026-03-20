import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  Category,
  CategoryService,
  GetCategoriesPagedResult,
} from '../../../service/category.service';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { AuthService } from '../../../service/auth.service';

interface CategoryTableRow {
  id: string;
  name: string;
  description: string;
  active: boolean;
  statusLabel: string;
  statusClass: string;
  iconName: string;
}

interface CategoryIconOption {
  value: string;
  label: string;
  iconSrc: string;
  bgColor: string;
  invertIcon?: boolean;
}

type CategoryStatusFilter = 'all' | 'active' | 'inactive';
type CategoryModalMode = 'create' | 'edit';
type CategoryModalStep = 'form' | 'confirm' | 'processing' | 'success';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent],
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.css',
})
export class CategoryListComponent implements OnInit, OnDestroy {
  readonly pageSize = 10;

  readonly iconOptions: CategoryIconOption[] = [
    {
      value: 'coupon1',
      label: 'Cupón principal',
      iconSrc: 'assets/icons/coupon1.svg',
      bgColor: '#1438A0',
      invertIcon: true,
    },
    {
      value: 'coupon-title',
      label: 'Cupón alterno',
      iconSrc: 'assets/icons/coupon1.svg',
      bgColor: '#E8EEFF',
    },
    {
      value: 'double-bed',
      label: 'Alojamiento',
      iconSrc: 'assets/icons/double-bed.svg',
      bgColor: '#FFF1A8',
    },
    {
      value: 'lotus1',
      label: 'Bienestar',
      iconSrc: 'assets/icons/lotus1.svg',
      bgColor: '#D8F6D9',
    },
    {
      value: 'product-quality1',
      label: 'Productos',
      iconSrc: 'assets/icons/product-quality1.svg',
      bgColor: '#D8FCFF',
    },
    {
      value: 'traveler1',
      label: 'Experiencias',
      iconSrc: 'assets/icons/traveler1.svg',
      bgColor: '#D4EDFF',
    },
    {
      value: 'gift-bag1',
      label: 'Regalos',
      iconSrc: 'assets/icons/gift-bag1.svg',
      bgColor: '#FFD9CC',
    },
    {
      value: 'hospital1',
      label: 'Salud',
      iconSrc: 'assets/icons/hospital1.svg',
      bgColor: '#FFD9E2',
    },
    {
      value: 'bus1',
      label: 'Transporte',
      iconSrc: 'assets/icons/bus1.svg',
      bgColor: '#D9F6DE',
    },
    {
      value: 'sunbed',
      label: 'Turismo',
      iconSrc: 'assets/icons/sunbed.svg',
      bgColor: '#DDD9FF',
    },
    {
      value: 'add',
      label: 'General',
      iconSrc: 'assets/icons/add.svg',
      bgColor: '#DCE2FF',
    },
  ];

  searchTerm = '';
  statusFilter: CategoryStatusFilter = 'all';
  showStatusDropdown = false;
  rows: CategoryTableRow[] = [];
  loading = false;
  errorMessage = '';
  totalRows = 0;
  currentPage = 1;

  showCategoryModal = false;
  showIconDropdown = false;
  modalMode: CategoryModalMode = 'create';
  modalStep: CategoryModalStep = 'form';
  modalError = '';
  successMessage = '';
  editingOriginalName = '';
  editingOriginalActive = true;

  categoryForm = {
    id: '',
    name: '',
    description: '',
    active: true,
    icon: 'coupon1',
  };

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly auth: AuthService,
    private readonly categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  ngOnDestroy(): void {
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalRows / this.pageSize));
  }

  get visiblePages(): Array<number | string> {
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }

    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, '...', current - 1, current, current + 1, '...', total];
  }

  get hasRows(): boolean {
    return this.rows.length > 0;
  }

  get canSubmitCategory(): boolean {
    return this.categoryForm.name.trim().length > 0 && this.modalStep === 'form';
  }

  get modalTitle(): string {
    return this.modalMode === 'create' ? 'Crear categoría' : 'Editar categoría';
  }

  get primaryButtonLabel(): string {
    return this.modalMode === 'create' ? 'Crear categoría' : 'Guardar cambios';
  }

  get selectedIconOption(): CategoryIconOption {
    return (
      this.iconOptions.find((option) => option.value === this.categoryForm.icon) ??
      this.iconOptions[0]
    );
  }

  get statusFilterLabel(): string {
    if (this.statusFilter === 'active') return 'Activas';
    if (this.statusFilter === 'inactive') return 'No activas';
    return 'Todas';
  }

  trackRow(_index: number, row: CategoryTableRow): string {
    return row.id;
  }

  trackPage(_index: number, page: number | string): string {
    return String(page);
  }

  trackIcon(_index: number, icon: CategoryIconOption): string {
    return icon.value;
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadCategories();
  }

  toggleStatusDropdown(): void {
    this.showStatusDropdown = !this.showStatusDropdown;
  }

  selectStatusFilter(filter: CategoryStatusFilter): void {
    this.statusFilter = filter;
    this.showStatusDropdown = false;
    this.currentPage = 1;
    this.loadCategories();
  }

  toggleIconDropdown(): void {
    this.showIconDropdown = !this.showIconDropdown;
  }

  selectIcon(option: CategoryIconOption): void {
    this.categoryForm.icon = option.value;
    this.showIconDropdown = false;
  }

  openCreateModal(): void {
    this.modalMode = 'create';
    this.modalStep = 'form';
    this.modalError = '';
    this.successMessage = '';
    this.showCategoryModal = true;
    this.showIconDropdown = false;
    this.categoryForm = {
      id: '',
      name: '',
      description: '',
      active: true,
      icon: 'coupon1',
    };
    this.editingOriginalName = '';
    this.editingOriginalActive = true;
  }

  openEditModal(row: CategoryTableRow): void {
    this.modalMode = 'edit';
    this.modalStep = 'form';
    this.modalError = '';
    this.successMessage = '';
    this.showCategoryModal = true;
    this.showIconDropdown = false;
    this.categoryForm = {
      id: row.id,
      name: row.name,
      description: row.description === 'Sin comentarios.' ? '' : row.description,
      active: row.active,
      icon: row.iconName,
    };
    this.editingOriginalName = row.name;
    this.editingOriginalActive = row.active;
  }

  closeModal(): void {
    if (this.modalStep === 'processing') {
      return;
    }

    this.showCategoryModal = false;
    this.showIconDropdown = false;
  }

  openConfirmationStep(): void {
    if (!this.canSubmitCategory) {
      return;
    }

    this.modalError = '';
    this.modalStep = 'confirm';
  }

  backToFormStep(): void {
    if (this.modalStep === 'processing') {
      return;
    }

    this.modalStep = 'form';
  }

  async submitCategory(): Promise<void> {
    const token = this.auth.token;
    if (!token) {
      this.modalStep = 'form';
      this.modalError = 'No se encontró una sesión activa.';
      return;
    }

    try {
      this.modalError = '';
      this.modalStep = 'processing';

      const saved = await firstValueFrom(
        this.categoryService.upsertCategory(token, {
          name: this.categoryForm.name.trim(),
          description: this.normalizeDescription(this.categoryForm.description),
          active: this.categoryForm.active,
          icon: this.categoryForm.icon,
        })
      );

      if (
        this.modalMode === 'edit' &&
        saved?.id != null &&
        this.editingOriginalActive !== this.categoryForm.active
      ) {
        await firstValueFrom(
          this.categoryService.changeCategoryStatus(token, {
            id: String(saved.id),
            active: this.categoryForm.active,
          })
        );
      }

      await this.reloadCurrentPage();
      this.successMessage =
        this.modalMode === 'create'
          ? 'Categoría creada correctamente.'
          : 'Categoría creada/actualizada correctamente.';
      this.modalStep = 'success';
    } catch (error) {
      console.error('[CategoryList] Error saving category', error);
      this.modalStep = 'form';
      this.modalError = 'No se pudo guardar la categoría en este momento.';
    }
  }

  finishSuccessFlow(): void {
    this.showCategoryModal = false;
    this.showIconDropdown = false;
    this.modalStep = 'form';
  }

  goToFirstPage(): void {
    if (this.currentPage === 1) return;
    this.currentPage = 1;
    this.loadCategories();
  }

  goToPreviousPage(): void {
    if (this.currentPage === 1) return;
    this.currentPage -= 1;
    this.loadCategories();
  }

  goToNextPage(): void {
    if (this.currentPage >= this.totalPages) return;
    this.currentPage += 1;
    this.loadCategories();
  }

  goToLastPage(): void {
    if (this.currentPage >= this.totalPages) return;
    this.currentPage = this.totalPages;
    this.loadCategories();
  }

  goToPage(page: number | string): void {
    if (typeof page !== 'number' || page === this.currentPage) return;
    this.currentPage = page;
    this.loadCategories();
  }

  private async loadCategories(): Promise<void> {
    const token = this.auth.token;
    if (!token) {
      this.rows = [];
      this.totalRows = 0;
      this.loading = false;
      this.errorMessage = 'No se encontró una sesión activa.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      const result = await firstValueFrom(
        this.categoryService.getCategoriesPaged(token, {
          limit: this.pageSize,
          offset: (this.currentPage - 1) * this.pageSize,
          where: this.buildWhere(),
        })
      );

      this.rows = this.toTableRows(result.rows ?? []);
      this.totalRows = result.total ?? 0;
    } catch (error) {
      console.error('[CategoryList] Error loading categories', error);
      this.rows = [];
      this.totalRows = 0;
      this.errorMessage = 'No se pudieron cargar las categorías.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private async reloadCurrentPage(): Promise<void> {
    const token = this.auth.token;
    if (!token) return;

    const result = await firstValueFrom(
      this.categoryService.getCategoriesPaged(token, {
        limit: this.pageSize,
        offset: (this.currentPage - 1) * this.pageSize,
        where: this.buildWhere(),
      })
    );

    this.rows = this.toTableRows(result.rows ?? []);
    this.totalRows = result.total ?? 0;
    this.cdr.detectChanges();
  }

  private buildWhere(): Record<string, unknown> {
    const andConditions: Record<string, unknown>[] = [
      { name: { _ilike: `%${this.searchTerm.trim()}%` } },
    ];

    if (this.statusFilter === 'active') {
      andConditions.push({ active: { _eq: true } });
    }

    if (this.statusFilter === 'inactive') {
      andConditions.push({ active: { _eq: false } });
    }

    return { _and: andConditions };
  }

  private mapRow(category: Category): CategoryTableRow {
    const active = Boolean(category.active);
    const iconName =
      typeof category.icon === 'string' && category.icon.trim()
        ? category.icon.trim()
        : this.inferIconName(category.name ?? '');

    return {
      id: String(category.id),
      name: String(category.name ?? ''),
      description: category.description?.trim() || 'Sin comentarios.',
      active,
      statusLabel: active ? 'Activa' : 'No activa',
      statusClass: active ? 'bg-[#DDF4DE] text-[#226C34]' : 'bg-[#FFDDE2] text-[#A63E53]',
      iconName,
    };
  }

  private toTableRows(categories: Category[]): CategoryTableRow[] {
    return categories
      .map((category) => {
        try {
          return this.mapRow(category);
        } catch (error) {
          console.error('[CategoryList] Invalid category row skipped', category, error);
          return null;
        }
      })
      .filter((row): row is CategoryTableRow => row !== null);
  }

  private inferIconName(name: string): string {
    const normalized = name.trim().toLowerCase();

    if (normalized.includes('aloj')) return 'double-bed';
    if (normalized.includes('alimento') || normalized.includes('bebida') || normalized.includes('rest')) return 'dinner';
    if (normalized.includes('turis')) return 'sunbed';
    if (normalized.includes('entreten') || normalized.includes('regalo')) return 'gift-bag1';
    if (normalized.includes('bien')) return 'lotus1';
    if (normalized.includes('product')) return 'product-quality1';
    if (normalized.includes('trans')) return 'bus1';
    if (normalized.includes('salud') || normalized.includes('med')) return 'hospital1';
    if (normalized.includes('exper') || normalized.includes('tour')) return 'traveler1';

    return 'coupon1';
  }

  private normalizeDescription(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
}
