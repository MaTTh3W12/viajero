import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Coupon, CouponListResult, CouponService } from '../../../service/coupon.service';
import { CategoryService } from '../../../service/category.service';
import { resolveCategoryVisual, toCategorySlug } from '../../../service/category-visuals';
import { catchError, finalize, map, Observable, of, take, timeout } from 'rxjs';

@Component({
  selector: 'app-savings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './savings.component.html',
  styleUrls: ['./savings.component.css']
})
export class SavingsComponent implements OnInit, OnChanges {
  @Input() selectedCategoryId: number | null = null;
  @Input() sortBy: 'recent' | 'expiring' = 'recent';
  @Input() dateFrom: string | null = null;
  @Input() dateTo: string | null = null;
  @Input() enablePagination = false;
  @Input() pageSize = 8;
  @Input() useHomeFeaturedCoupons = false;
  @Output() couponsFound = new EventEmitter<number>();
  coupons: Coupon[] = [];
  displayedCoupons: Coupon[] = [];
  currentPage = 1;
  loading = false;
  error = '';
  readonly fixedAddress = 'San Salvador, El Salvador';
  readonly defaultCommercialName = 'Comercio participante';
  readonly fallbackCategoryName = 'Categoria';
  private couponsFoundEmitVersion = 0;
  private couponImageById = new Map<number, string>();
  private categoryNameById = new Map<number, string>();
  private categoryIconById = new Map<number, string>();
  private categoryBgColorById = new Map<number, string>();

  constructor(
    private couponService: CouponService,
    private categoryService: CategoryService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadCategoryMetadata();
    this.loadCoupons();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['useHomeFeaturedCoupons'] && !changes['useHomeFeaturedCoupons'].firstChange) {
      this.currentPage = 1;
      this.loadCoupons();
      return;
    }

    if (changes['sortBy'] && !changes['sortBy'].firstChange && !this.useHomeFeaturedCoupons) {
      this.currentPage = 1;
      this.loadCoupons();
      return;
    }

    if (
      changes['selectedCategoryId'] ||
      changes['dateFrom'] ||
      changes['dateTo'] ||
      changes['enablePagination'] ||
      changes['pageSize']
    ) {
      this.currentPage = 1;
      this.applyFiltersAndSort();
    }
  }

  get totalPages(): number {
    if (!this.enablePagination) return 1;
    return Math.max(1, Math.ceil(this.displayedCoupons.length / this.pageSize));
  }

  get paginatedCoupons(): Coupon[] {
    if (!this.enablePagination) return this.displayedCoupons;
    const start = (this.currentPage - 1) * this.pageSize;
    return this.displayedCoupons.slice(start, start + this.pageSize);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  getCardImage(coupon: Coupon): string {
    const couponId = Number(coupon.id);
    return this.couponImageById.get(couponId) ?? '';
  }

  hasCardImage(coupon: Coupon): boolean {
    return !!this.getCardImage(coupon);
  }

  getPriceBadgeLabel(coupon: Coupon): string {
    const discount = this.parseNumeric(coupon.price_discount);
    const price = this.parseNumeric(coupon.price);

    // Prioridad absoluta al descuento cuando exista (sin calculo con price).
    if (discount != null) {
      return `${this.formatNumber(discount)}% OFF`;
    }

    if (price != null) {
      return `$${this.formatNumber(price)} USD`;
    }

    return 'N/A';
  }

  formatExpirationDate(endDate: string): string {
    const parsed = endDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!parsed) return 'Vence: Fecha no disponible';

    const [, year, month, day] = parsed;
    const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const monthIndex = Number(month) - 1;
    const monthName = monthNames[monthIndex] ?? month;
    return `Vence: ${day} ${monthName} ${year}`;
  }

  getCategoryName(categoryId: number): string {
    return this.categoryNameById.get(Number(categoryId)) ?? this.fallbackCategoryName;
  }

  getCategoryIconPath(categoryId: number): string {
    return this.categoryIconById.get(Number(categoryId)) ?? 'assets/icons/coupon1.svg';
  }

  onCategoryIconError(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (!image) return;
    image.src = 'assets/icons/coupon1.svg';
  }

  getCategoryBgColor(categoryId: number): string {
    return this.categoryBgColorById.get(Number(categoryId)) ?? '#E5E7EB';
  }

  getStockLabel(coupon: Coupon): string {
    const amount = typeof coupon.stock_available === 'number' ? coupon.stock_available : 0;
    return `${amount} cupones`;
  }

  getCouponAddress(coupon: Coupon): string {
    const address = coupon.user_public?.company_address?.trim() || coupon.user?.company_address?.trim();
    return address || this.fixedAddress;
  }

  getCouponCommercialName(coupon: Coupon): string {
    const commercialName = coupon.user_public?.company_commercial_name?.trim() || coupon.user?.company_commercial_name?.trim();
    return commercialName || this.defaultCommercialName;
  }

  goToPage(page: number): void {
    if (!this.enablePagination) return;
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private loadCoupons(): void {
    this.loading = true;
    this.error = '';

    const request$: Observable<Coupon[]> = this.useHomeFeaturedCoupons
      ? this.couponService.getHomeFeaturedCoupons()
      : this.couponService.getPublicCoupons({
          limit: 40,
          offset: 0,
          order_by: this.getOrderByForCurrentSort(),
        }).pipe(
          map((response: CouponListResult) => response.rows ?? [])
        );

    request$
      .pipe(
        take(1),
        timeout(15000),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (coupons: Coupon[]) => {
          this.coupons = coupons;
          this.loadImagesForCoupons(coupons);
          this.applyFiltersAndSort();
        },
        error: (error: unknown) => {
          console.error('[SAVINGS] Error loading public coupons', error);
          this.error = 'No se pudieron cargar los cupones en este momento.';
          this.coupons = [];
          this.displayedCoupons = [];
          this.emitCouponsFound(0);
        },
      });
  }

  private applyFiltersAndSort(): void {
    let rows = [...this.coupons];

    if (this.selectedCategoryId != null) {
      rows = rows.filter((coupon) => Number(coupon.category_id) === Number(this.selectedCategoryId));
    }

    const fromTime = this.normalizeDateToTime(this.dateFrom, 'start');
    const toTime = this.normalizeDateToTime(this.dateTo, 'end');

    if (fromTime != null || toTime != null) {
      rows = rows.filter((coupon) => {
        const couponDate = this.normalizeDateToTime(coupon.end_date, 'start');
        if (couponDate == null) return false;
        if (fromTime != null && couponDate < fromTime) return false;
        if (toTime != null && couponDate > toTime) return false;
        return true;
      });
    }

    rows.sort((a, b) => {
      if (this.sortBy === 'expiring') {
        const aEnd = new Date(a.end_date).getTime();
        const bEnd = new Date(b.end_date).getTime();
        if (aEnd !== bEnd) return aEnd - bEnd;

        const aCreated = new Date(a.created_at).getTime();
        const bCreated = new Date(b.created_at).getTime();
        return bCreated - aCreated;
      }

      const aCreated = new Date(a.created_at).getTime();
      const bCreated = new Date(b.created_at).getTime();
      if (aCreated !== bCreated) return bCreated - aCreated;

      const aEnd = new Date(a.end_date).getTime();
      const bEnd = new Date(b.end_date).getTime();
      return aEnd - bEnd;
    });

    this.displayedCoupons = rows;
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    this.emitCouponsFound(this.displayedCoupons.length);
  }

  private emitCouponsFound(total: number): void {
    const version = ++this.couponsFoundEmitVersion;
    Promise.resolve().then(() => {
      if (version !== this.couponsFoundEmitVersion) return;
      this.couponsFound.emit(total);
    });
  }

  private parseNumeric(value: string | number | null | undefined): number | null {
    if (value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private formatNumber(value: number): string {
    if (Number.isInteger(value)) {
      return value.toString();
    }
    return value.toFixed(2).replace(/\.?0+$/, '');
  }

  private getOrderByForCurrentSort(): Array<Record<string, 'asc' | 'desc'>> {
    if (this.sortBy === 'expiring') {
      return [{ end_date: 'asc' }, { created_at: 'desc' }];
    }

    return [{ created_at: 'desc' }, { end_date: 'asc' }];
  }

  private loadImagesForCoupons(coupons: Coupon[]): void {
    this.couponImageById.clear();

    const couponIds = Array.from(
      new Set(
        coupons
          .map((coupon) => Number(coupon.id))
          .filter((id) => Number.isFinite(id))
      )
    );

    if (couponIds.length === 0) return;

    this.couponService.getPublicCouponImagesByIds(couponIds).pipe(
      take(1),
      timeout(15000)
    ).subscribe({
      next: (images) => {
        images.forEach((imageData) => {
          if (!imageData?.image_base64) return;

          const couponId = Number(imageData.id);
          if (!Number.isFinite(couponId)) return;

          const mime = this.normalizeMimeType(imageData.image_mime_type);
          this.couponImageById.set(couponId, this.toDataUrl(imageData.image_base64, mime || 'image/jpeg'));
        });

        this.cdr.detectChanges();
      },
      error: () => {
        return;
      },
    });
  }

  private toDataUrl(base64: string, mimeType: string): string {
    if (!base64) return '';
    if (base64.startsWith('data:')) return base64;
    return `data:${mimeType};base64,${base64}`;
  }

  private normalizeMimeType(mimeType: string | null | undefined): string {
    if (!mimeType) return '';
    return String(mimeType).replace(/^"+|"+$/g, '').trim().toLowerCase();
  }

  private normalizeDateToTime(dateValue: string | null | undefined, boundary: 'start' | 'end'): number | null {
    if (!dateValue) return null;

    const [year, month, day] = dateValue.slice(0, 10).split('-').map((value) => Number(value));
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return null;
    }

    if (boundary === 'end') {
      return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
    }

    return new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
  }

  private loadCategoryMetadata(): void {
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
      this.categoryNameById.clear();
      this.categoryIconById.clear();
      this.categoryBgColorById.clear();

      result.rows.forEach((category) => {
        const categoryId = Number(category.id);
        if (!Number.isFinite(categoryId)) return;

        const categoryName = (category.name ?? '').trim() || this.fallbackCategoryName;
        const visual = this.resolveCategoryVisual(categoryName, category.icon);

        this.categoryNameById.set(categoryId, categoryName);
        this.categoryIconById.set(categoryId, visual.icon);
        this.categoryBgColorById.set(categoryId, visual.bgColor);
      });

      this.cdr.detectChanges();
    });
  }

  private resolveCategoryVisual(
    categoryName: string,
    endpointIcon?: string | null
  ): { icon: string; bgColor: string } {
    return resolveCategoryVisual(categoryName, endpointIcon);
  }

  private toCategorySlug(value: string): string {
    return toCategorySlug(value);
  }

}
