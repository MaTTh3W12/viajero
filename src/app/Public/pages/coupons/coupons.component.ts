import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { ContacUsComponent } from '../../../shared/components/contac-us/contac-us.component';
import { RelatedPagesComponent } from '../../../shared/components/related-pages/related-pages.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { SavingsComponent } from '../../../shared/components/savings/savings.component';
import { CategoryService } from '../../../service/category.service';
import { catchError, of, take, timeout } from 'rxjs';

interface CouponCategoryFilter {
  key: string;
  label: string;
  categoryId: number | null;
  icon: string;
  bgColor: string;
  activeIcon?: boolean;
}

@Component({
  selector: 'app-coupons',
  standalone: true,
  imports: [
    NavbarComponent,
    SavingsComponent,
    ContacUsComponent,
    RelatedPagesComponent,
    FooterComponent,
    CommonModule,
    FormsModule
  ],
  templateUrl: './coupons.component.html',
  styleUrls: ['./coupons.component.css']
})
export class CouponsComponent implements OnInit {

  selectedCategory = 'all';
  selectedCategoryId: number | null = null;
  sortBy: 'recent' | 'expiring' = 'recent';
  dateDropdownOpen = false;
  sortDropdownOpen = false;
  dateFrom: string | null = null;
  dateTo: string | null = null;
  pendingDateFrom = '';
  pendingDateTo = '';
  foundCoupons = 0;
  private requestedCategoryKey = 'all';
  private readonly categoryVisualBySlug: Record<string, { icon: string; bgColor: string; activeIcon?: boolean }> = {
    alojamiento: { icon: 'assets/icons/double-bed.svg', bgColor: '#FFF8D2' },
    'alimentos-y-bebidas': { icon: 'assets/icons/dinner.svg', bgColor: '#ABE9FF' },
    turismo: { icon: 'assets/icons/sunbed.svg', bgColor: '#D8D7FF' },
    entretenimiento: { icon: 'assets/icons/gift-bag1.svg', bgColor: '#FFD5D6' },
    'cuidado-personal': { icon: 'assets/icons/lotus1.svg', bgColor: '#D3F6D2' },
    'productos-nostalgicos': { icon: 'assets/icons/product-quality1.svg', bgColor: '#FFD5D6' },
    'productos-y-servicios': { icon: 'assets/icons/gift-bag1.svg', bgColor: '#FFC6B3' },
    'tour-operadores': { icon: 'assets/icons/traveler1.svg', bgColor: '#CAFFFB' },
    transporte: { icon: 'assets/icons/bus1.svg', bgColor: '#CAFFDC' },
  };
  private readonly allCategoryFilter: CouponCategoryFilter = {
    key: 'all',
    label: 'Todos los cupones',
    categoryId: null,
    icon: 'assets/icons/coupon1.svg',
    bgColor: '#1438A0',
    activeIcon: true,
  };
  categoryFilters: CouponCategoryFilter[] = [this.allCategoryFilter];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private categoryService: CategoryService
  ) { }

  isActive(cat: string) {
    return this.selectedCategory === cat;
  }

  selectCategory(cat: string, syncQueryParam = true) {
    this.selectedCategory = cat;
    const selected = this.categoryFilters.find((item) => item.key === cat);
    this.selectedCategoryId = selected?.categoryId ?? null;

    if (syncQueryParam) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { category: cat === 'all' ? null : cat },
        queryParamsHandling: 'merge',
      });
    }
  }

  onCouponsFound(total: number): void {
    this.foundCoupons = total;
  }

  setSortBy(sort: 'recent' | 'expiring'): void {
    if (this.sortBy === sort) return;
    this.sortBy = sort;
  }

  toggleSortDropdown(): void {
    this.dateDropdownOpen = false;
    this.sortDropdownOpen = !this.sortDropdownOpen;
  }

  toggleDateDropdown(): void {
    this.sortDropdownOpen = false;
    this.pendingDateFrom = this.dateFrom ?? '';
    this.pendingDateTo = this.dateTo ?? '';
    this.dateDropdownOpen = !this.dateDropdownOpen;
  }

  applyDateRange(): void {
    const from = this.pendingDateFrom?.trim() || '';
    const to = this.pendingDateTo?.trim() || '';

    if (from && to && from > to) {
      this.dateFrom = to;
      this.dateTo = from;
    } else {
      this.dateFrom = from || null;
      this.dateTo = to || null;
    }

    this.dateDropdownOpen = false;
  }

  clearDateRange(): void {
    this.pendingDateFrom = '';
    this.pendingDateTo = '';
    this.dateFrom = null;
    this.dateTo = null;
    this.dateDropdownOpen = false;
  }

  selectSortOption(sort: 'recent' | 'expiring'): void {
    this.setSortBy(sort);
    this.dateDropdownOpen = false;
    this.sortDropdownOpen = false;
  }

  get sortByLabel(): string {
    return this.sortBy === 'expiring' ? 'Por vencer' : 'Más recientes';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.sort-dropdown') || target?.closest('.date-dropdown')) return;
    this.dateDropdownOpen = false;
    this.sortDropdownOpen = false;
  }

  ngOnInit(): void {
    this.loadCategoryFilters();
    this.route.queryParamMap.subscribe((params) => {
      this.requestedCategoryKey = params.get('category') ?? 'all';
      this.applyRequestedCategory();
    });
  }

  private loadCategoryFilters(): void {
    this.categoryService.getCategoriesPaged(undefined, {
      limit: 500,
      offset: 0,
      where: {
        _and: [
          { active: { _eq: true } },
          { name: { _ilike: '%%' } },
        ],
      },
    }).pipe(
      take(1),
      timeout(15000),
      catchError(() => of({ rows: [], total: 0 }))
    ).subscribe((result) => {
      const usedKeys = new Set<string>();
      const dynamicFilters = result.rows
        .map((category) => {
          const categoryId = Number(category.id);
          if (!Number.isFinite(categoryId)) return null;

          const categoryName = (category.name ?? '').trim();
          if (!categoryName) return null;

          const slug = this.toCategorySlug(categoryName);
          const keyBase = slug || `category-${categoryId}`;
          const key = usedKeys.has(keyBase) ? `${keyBase}-${categoryId}` : keyBase;
          usedKeys.add(key);

          const visual = this.resolveCategoryVisual(categoryName);

          return {
            key,
            label: categoryName,
            categoryId,
            icon: visual.icon,
            bgColor: visual.bgColor,
            activeIcon: visual.activeIcon,
          } as CouponCategoryFilter;
        })
        .filter((item): item is CouponCategoryFilter => item !== null);

      this.categoryFilters = [this.allCategoryFilter, ...dynamicFilters];
      this.applyRequestedCategory();
    });
  }

  private applyRequestedCategory(): void {
    const hasCategory = this.categoryFilters.some((item) => item.key === this.requestedCategoryKey);
    this.selectCategory(hasCategory ? this.requestedCategoryKey : 'all', false);
  }

  private resolveCategoryVisual(categoryName: string): { icon: string; bgColor: string; activeIcon?: boolean } {
    const slug = this.toCategorySlug(categoryName);
    return this.categoryVisualBySlug[slug] ?? {
      icon: 'assets/icons/coupon1.svg',
      bgColor: '#E5E7EB',
    };
  }

  private toCategorySlug(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' y ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

}
