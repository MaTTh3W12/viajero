import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin, take, timeout } from 'rxjs';
import { Coupon, CouponService } from '../../../service/coupon.service';

@Component({
  selector: 'app-featured-deals',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './featured-deals.component.html',
  styleUrls: ['./featured-deals.component.css']
})
export class FeaturedDealsComponent implements OnInit, OnDestroy {
  activeFilter: 'recent' | 'expiring' = 'expiring';

  @ViewChild('recentContainer') recentContainer?: ElementRef<HTMLElement>;
  @ViewChild('expiringContainer') expiringContainer?: ElementRef<HTMLElement>;

  recentCoupons: Coupon[] = [];
  expiringCoupons: Coupon[] = [];
  activeCoupons: Coupon[] = [];
  loading = false;
  error = '';
  readonly defaultCommercialName = 'Comercio participante';
  private couponImageById = new Map<number, string>();

  private autoScrollInterval: ReturnType<typeof setInterval> | null = null;
  private initTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private couponService: CouponService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCoupons();
  }

  setFilter(filter: 'recent' | 'expiring'): void {
    if (this.activeFilter === filter) return;

    this.activeFilter = filter;
    this.updateActiveCoupons();
    this.scheduleAutoScrollRestart();
  }

  scrollContainer(container: HTMLElement | undefined, direction: 'left' | 'right'): void {
    this.stopAutoScroll();

    if (!container) return;

    const scrollAmount = 420;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });

    this.scheduleAutoScrollRestart(5000);
  }

  startAutoScroll(): void {
    this.stopAutoScroll();

    this.autoScrollInterval = setInterval(() => {
      this.moveNext();
    }, 3000);
  }

  stopAutoScroll(): void {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }

    if (this.initTimeout) {
      clearTimeout(this.initTimeout);
      this.initTimeout = null;
    }
  }

  getCardImage(coupon: Coupon): string {
    const couponId = Number(coupon.id);
    return this.couponImageById.get(couponId) ?? '';
  }

  hasCardImage(coupon: Coupon): boolean {
    return !!this.getCardImage(coupon);
  }

  getCategoryName(categoryId: number): string {
    const categories: Record<number, string> = {
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

    return categories[categoryId] ?? 'Cupón';
  }

  getCouponAddress(coupon: Coupon): string {
    return coupon.user_public?.company_address?.trim() || coupon.user?.company_address?.trim() || 'Dirección no disponible';
  }

  getCouponCommercialName(coupon: Coupon): string {
    return coupon.user_public?.company_commercial_name?.trim() || coupon.user?.company_commercial_name?.trim() || this.defaultCommercialName;
  }

  getBadgeLabel(coupon: Coupon): string {
    const discount = this.parseNumeric(coupon.price_discount);
    const price = this.parseNumeric(coupon.price);

    if (discount != null) {
      return `${this.formatNumber(discount)}% OFF`;
    }

    if (price != null) {
      return `$${this.formatNumber(price)} USD`;
    }

    return 'N/A';
  }

  getDateLabel(coupon: Coupon): string {
    return this.formatExpirationDate(coupon.end_date);
  }

  truncateTitle(title: string | null | undefined): string {
    const value = (title ?? '').trim();
    if (!value) return 'Cupón disponible';
    return value.length > 15 ? `${value.slice(0, 15)}...` : value;
  }

  ngOnDestroy(): void {
    this.stopAutoScroll();
  }

  private loadCoupons(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      recent: this.couponService.getLatestCoupons(3),
      expiring: this.couponService.getExpiringSoonCoupons(),
    })
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: ({ recent, expiring }) => {
          this.recentCoupons = recent;
          this.expiringCoupons = expiring;
          this.loadImagesForCoupons([...recent, ...expiring]);
          this.updateActiveCoupons();
          this.scheduleAutoScrollRestart();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[FEATURED_DEALS] Error loading coupon highlights', error);
          this.error = 'No se pudieron cargar los cupones destacados en este momento.';
          this.recentCoupons = [];
          this.expiringCoupons = [];
          this.activeCoupons = [];
          this.cdr.detectChanges();
        },
      });
  }

  private updateActiveCoupons(): void {
    this.activeCoupons = this.activeFilter === 'recent' ? this.recentCoupons : this.expiringCoupons;
  }

  private scheduleAutoScrollRestart(delay = 100): void {
    this.stopAutoScroll();
    this.initTimeout = setTimeout(() => {
      this.startAutoScroll();
    }, delay);
  }

  private moveNext(): void {
    const containerRef = this.activeFilter === 'recent' ? this.recentContainer : this.expiringContainer;
    const container = containerRef?.nativeElement;

    if (!container) return;

    const maxScroll = container.scrollWidth - container.clientWidth;
    const scrollAmount = 420;

    if (container.scrollLeft >= maxScroll - 10) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  private formatExpirationDate(endDate: string): string {
    const parsed = endDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!parsed) return 'Vence: Fecha no disponible';

    const [, year, month, day] = parsed;
    const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const monthIndex = Number(month) - 1;
    const monthName = monthNames[monthIndex] ?? month;
    return `Vence: ${day} ${monthName} ${year}`;
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
}
