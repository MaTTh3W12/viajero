import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Coupon, CouponService } from '../../../service/coupon.service';
import { finalize, take, timeout } from 'rxjs';

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
  @Output() couponsFound = new EventEmitter<number>();
  coupons: Coupon[] = [];
  displayedCoupons: Coupon[] = [];
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
    6: 'Productos nostalgicos',
    7: 'Productos y servicios',
    8: 'Tour operadores',
    9: 'Transporte',
  };
  private readonly categoryIcons: Record<number, string> = {
    1: 'assets/icons/double-bed.svg', // Alojamiento
    2: 'assets/icons/dinner.svg', // Alimentos y bebidas
    3: 'assets/icons/sunbed.svg', // Turismo
    4: 'assets/icons/gift-bag1.svg', // Entretenimiento
  };
  private readonly categoryBgColors: Record<number, string> = {
    1: '#FFF8D2', // Alojamiento
    2: '#ABE9FF', // Alimentos y bebidas
    3: '#D8D7FF', // Turismo
    4: '#FFD5D6', // Entretenimiento
  };

  constructor(
    private couponService: CouponService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadCoupons();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedCategoryId'] || changes['sortBy']) {
      this.applyFiltersAndSort();
    }
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

  private loadCoupons(): void {
    this.loading = true;
    this.error = '';

    this.couponService
      .getPublicCoupons({ limit: 40, offset: 0 })
      .pipe(
        take(1),
        timeout(15000),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.coupons = (response.rows ?? []).filter((coupon) => coupon.published);
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
