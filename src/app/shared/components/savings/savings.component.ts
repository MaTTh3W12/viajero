import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Coupon, CouponService } from '../../../service/coupon.service';
import { finalize, map, take, timeout } from 'rxjs';

@Component({
  selector: 'app-savings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './savings.component.html',
  styleUrls: ['./savings.component.css']
})
export class SavingsComponent implements OnInit, OnChanges {
  @Input() selectedCategoryId: number | null = null;
  @Input() sortBy: 'recent' = 'recent';
  @Input() enablePagination = false;
  @Input() pageSize = 8;
  @Input() useHomeFeaturedCoupons = false;
  @Output() couponsFound = new EventEmitter<number>();
  coupons: Coupon[] = [];
  displayedCoupons: Coupon[] = [];
  currentPage = 1;
  loading = false;
  error = '';
  readonly fixedCouponTitle = 'EL SALVADOR TOURS';
  readonly fixedCouponBrand = 'El Salvador Tours';
  readonly fixedAddress = 'San Salvador, El Salvador';
  private couponsFoundEmitVersion = 0;

  private readonly cardImages = [
    'assets/img/card1.png',
    'assets/img/card2.png',
    'assets/img/card3.png',
    'assets/img/card4.png',
  ];
  private readonly categoryNames: Record<number, string> = {
    1: 'Alojamiento',
    2: 'Alimentos y bebidas',
    3: 'Turismo',
    4: 'Entretenimiento',
    5: 'Cuidado personal',
    6: 'Productos nostálgicos',
    7: 'Productos y servicios',
    8: 'Tour operadores',
    9: 'Transporte',
  };
  private readonly categoryIcons: Record<number, string> = {
    1: 'assets/icons/double-bed.svg', // Alojamiento
    2: 'assets/icons/dinner.svg', // Alimentos y bebidas
    3: 'assets/icons/sunbed.svg', // Turismo
    4: 'assets/icons/gift-bag1.svg', // Entretenimiento
    5: 'assets/icons/lotus1.svg', // Cuidado personal
    6: 'assets/icons/product-quality1.svg', // Productos nostálgicos
    7: 'assets/icons/gift-bag1.svg', // Productos y servicios
    8: 'assets/icons/traveler1.svg', // Tour operadores
    9: 'assets/icons/bus1.svg', // Transporte
  };
  private readonly categoryBgColors: Record<number, string> = {
    1: '#FFF8D2', // Alojamiento
    2: '#ABE9FF', // Alimentos y bebidas
    3: '#D8D7FF', // Turismo
    4: '#FFD5D6', // Entretenimiento
    5: '#D3F6D2', // Cuidado personal
    6: '#FFD5D6', // Productos nostálgicos
    7: '#FFC6B3', // Productos y servicios
    8: '#CAFFFB', // Tour operadores
    9: '#CAFFDC', // Transporte
  };

  constructor(
    private couponService: CouponService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadCoupons();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['useHomeFeaturedCoupons'] && !changes['useHomeFeaturedCoupons'].firstChange) {
      this.currentPage = 1;
      this.loadCoupons();
      return;
    }

    if (
      changes['selectedCategoryId'] ||
      changes['sortBy'] ||
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

  getCardImage(index: number): string {
    return this.cardImages[index % this.cardImages.length];
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
    return this.categoryNames[categoryId] ?? 'Turismo';
  }

  getCategoryIconPath(categoryId: number): string {
    return this.categoryIcons[categoryId] ?? 'assets/icons/coupon1.svg';
  }

  getCategoryBgColor(categoryId: number): string {
    return this.categoryBgColors[categoryId] ?? '#E5E7EB';
  }

  getStockLabel(coupon: Coupon): string {
    const amount = typeof coupon.stock_available === 'number' ? coupon.stock_available : 0;
    return `${amount} cupones`;
  }

  getCouponAddress(coupon: Coupon): string {
    const address = coupon.user?.company_address?.trim();
    return address || this.fixedAddress;
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

    const request$ = this.useHomeFeaturedCoupons
      ? this.couponService.getHomeFeaturedCoupons()
      : this.couponService.getPublicCoupons({ limit: 40, offset: 0 }).pipe(
          map((response) => (response.rows ?? []).filter((coupon) => coupon.published))
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
        next: (coupons) => {
          this.coupons = coupons;
          this.applyFiltersAndSort();
        },
        error: (error) => {
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

    if (this.sortBy === 'recent') {
      rows.sort((a, b) => {
        const aDate = new Date(a.created_at).getTime();
        const bDate = new Date(b.created_at).getTime();
        return bDate - aDate;
      });
    }

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

}
