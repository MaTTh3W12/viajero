import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { ContacUsComponent } from '../../../shared/components/contac-us/contac-us.component';
import { RelatedPagesComponent } from '../../../shared/components/related-pages/related-pages.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { SavingsComponent } from '../../../shared/components/savings/savings.component';
import { Category, CategoryService } from '../../../service/category.service';
import { ALL_CATEGORY_VISUAL, resolveCategoryVisual, toCategorySlug } from '../../../service/category-visuals';
import { catchError, firstValueFrom, of, take, timeout } from 'rxjs';

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
  private readonly CATEGORY_PAGE_SIZE = 200;
  private readonly allCategoryFilter: CouponCategoryFilter = {
    key: 'all',
    label: 'Todos los cupones',
    categoryId: null,
    icon: ALL_CATEGORY_VISUAL.icon,
    bgColor: ALL_CATEGORY_VISUAL.bgColor,
    activeIcon: ALL_CATEGORY_VISUAL.activeIcon,
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
    void this.fetchAllCategories().then((rows) => {
      const usedKeys = new Set<string>();
      const dynamicFilters = rows
        .map((category) => {
          const categoryId = Number(category.id);
          if (!Number.isFinite(categoryId)) return null;

          const categoryName = (category.name ?? '').trim();
          if (!categoryName) return null;

          const slug = this.toCategorySlug(categoryName);
          const keyBase = slug || `category-${categoryId}`;
          const key = usedKeys.has(keyBase) ? `${keyBase}-${categoryId}` : keyBase;
          usedKeys.add(key);

          const visual = this.resolveCategoryVisual(categoryName, category.icon);

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

  private async fetchAllCategories(): Promise<Category[]> {
    const categories: Category[] = [];
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;

    while (offset < total) {
      const result = await firstValueFrom(
        this.categoryService.getCategoriesPaged(undefined, {
          limit: this.CATEGORY_PAGE_SIZE,
          offset,
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
        )
      );

      if (!result.rows.length) break;

      categories.push(...result.rows);
      total = result.total ?? categories.length;
      offset += result.rows.length;
    }

    return categories;
  }

  private applyRequestedCategory(): void {
    const hasCategory = this.categoryFilters.some((item) => item.key === this.requestedCategoryKey);
    this.selectCategory(hasCategory ? this.requestedCategoryKey : 'all', false);
  }

  onCategoryIconError(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (!image) return;
    image.src = 'assets/icons/coupon1.svg';
  }

  private resolveCategoryVisual(
    categoryName: string,
    endpointIcon?: string | null
  ): { icon: string; bgColor: string; activeIcon?: boolean } {
    return resolveCategoryVisual(categoryName, endpointIcon);
  }

  private toCategorySlug(value: string): string {
    return toCategorySlug(value);
  }

}
