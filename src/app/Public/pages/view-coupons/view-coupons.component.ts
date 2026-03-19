import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { FeaturedDealsComponent } from '../../../shared/components/featured-deals/featured-deals.component';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { ContacUsComponent } from '../../../shared/components/contac-us/contac-us.component';
import { RelatedPagesComponent } from '../../../shared/components/related-pages/related-pages.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { AcquiredCoupon, CompanySocialLinks, Coupon, CouponService } from '../../../service/coupon.service';
import { AuthService, AuthUser } from '../../../service/auth.service';
import { take, timeout } from 'rxjs';

@Component({
  selector: 'app-view-coupons',
  standalone: true,
  imports: [
    CommonModule,
    FeaturedDealsComponent,
    NavbarComponent,
    ContacUsComponent,
    RelatedPagesComponent,
    FooterComponent
  ],
  templateUrl: './view-coupons.component.html',
  styleUrls: ['./view-coupons.component.css']
})
export class ViewCouponsComponent implements OnInit {
  private readonly USER_ROLE_LABEL = 'USER';

  loading = true;
  error = '';
  coupon: Coupon | null = null;
  showLoginRequiredModal = false;
  showAcquireModal = false;
  acquireState: 'confirm' | 'loading' | 'success' = 'confirm';
  acquireError = '';
  acquiredCoupon: AcquiredCoupon | null = null;
  isCouponAlreadyAcquired = false;
  companySocialLinks: CompanySocialLinks | null = null;

  private readonly categoryNames: Record<number, string> = {
    1: 'Alojamiento',
    2: 'Alimentos y bebidas',
    3: 'Turismo',
    4: 'Entretenimiento',
  };

  private readonly categoryIcons: Record<number, string> = {
    1: 'assets/icons/double-bed.svg',
    2: 'assets/icons/dinner.svg',
    3: 'assets/icons/sunbed.svg',
    4: 'assets/icons/gift-bag1.svg',
  };

  private readonly categoryBgColors: Record<number, string> = {
    1: '#FFF8D2', // Alojamiento
    2: '#ABE9FF', // Alimentos y bebidas
    3: '#D8D7FF', // Turismo
    4: '#FFD5D6', // Entretenimiento
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly couponService: CouponService,
    private readonly cdr: ChangeDetectorRef,
    private readonly auth: AuthService,
    private readonly router: Router
  ) { }

  ngOnInit(): void {
    this.route.paramMap.pipe(take(1)).subscribe((params) => {
      const id = Number(params.get('id'));
      if (!Number.isFinite(id) || id <= 0) {
        this.loading = false;
        this.error = 'Cupón inválido.';
        this.cdr.detectChanges();
        return;
      }

      this.loadCoupon(id);
    });
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

  getPriceBadgeLabel(coupon: Coupon): string {
    const discount = this.parseNumeric(coupon.price_discount);
    const price = this.parseNumeric(coupon.price);

    if (discount != null) return `${this.formatNumber(discount)}% OFF`;
    if (price != null) return `$${this.formatNumber(price)} USD`;
    return 'N/A';
  }

  getStockLabel(coupon: Coupon): string {
    const amount = typeof coupon.stock_available === 'number' ? coupon.stock_available : 0;
    return `${amount} cupones`;
  }

  hasAvailableStock(coupon: Coupon): boolean {
    const amount = typeof coupon.stock_available === 'number' ? coupon.stock_available : 0;
    return amount > 0;
  }

  getTermsList(terms: string | null): string[] {
    if (!terms) return [];
    return terms
      .split(/\r?\n|;/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  getCouponMapUrl(coupon: Coupon): string | null {
    const rawMapUrl = coupon.user?.company_map_url?.trim() ?? '';
    if (!rawMapUrl) return null;

    if (/^https?:\/\//i.test(rawMapUrl)) {
      return rawMapUrl;
    }

    if (/^www\./i.test(rawMapUrl)) {
      return `https://${rawMapUrl}`;
    }

    return null;
  }

  getCouponAddress(coupon: Coupon): string {
    const rawAddress = coupon.user?.company_address?.trim() ?? '';
    return rawAddress || 'Ubicación no disponible';
  }

  hasAnySocialNetwork(): boolean {
    return !!(
      this.getFacebookUrl() ||
      this.getTwitterUrl() ||
      this.getInstagramUrl() ||
      this.getYoutubeUrl()
    );
  }

  getFacebookUrl(): string | null {
    return this.buildCompanySocialUrl(this.companySocialLinks?.company_facebook, 'facebook.com');
  }

  getTwitterUrl(): string | null {
    return this.buildCompanySocialUrl(this.companySocialLinks?.company_twitter, 'x.com');
  }

  getInstagramUrl(): string | null {
    return this.buildCompanySocialUrl(this.companySocialLinks?.company_instagram, 'instagram.com');
  }

  getYoutubeUrl(): string | null {
    return this.buildCompanySocialUrl(this.companySocialLinks?.company_youtube, 'youtube.com');
  }

  formatExpirationDate(endDate: string): string {
    return this.buildDateLabel(endDate, 'Vence');
  }

  private buildDateLabel(rawDate: string | null | undefined, prefix: string): string {
    const parsedDateParts = this.parseDateParts(rawDate);
    if (!parsedDateParts) return `${prefix}: Fecha no disponible`;

    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    const monthIndex = Number(parsedDateParts.month) - 1;
    const monthName = monthNames[monthIndex] ?? parsedDateParts.month;
    return `${prefix}: ${Number(parsedDateParts.day)} ${monthName} ${parsedDateParts.year}`;
  }

  private parseDateParts(rawDate: string | null | undefined): { year: string; month: string; day: string } | null {
    if (!rawDate) return null;

    const directMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (directMatch) {
      const [, year, month, day] = directMatch;
      return { year, month, day };
    }

    const parsedDate = new Date(rawDate);
    if (Number.isNaN(parsedDate.getTime())) return null;

    const year = String(parsedDate.getUTCFullYear());
    const month = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getUTCDate()).padStart(2, '0');
    return { year, month, day };
  }

  private loadCoupon(id: number): void {
    this.loading = true;
    this.error = '';
    this.isCouponAlreadyAcquired = false;
    this.companySocialLinks = null;

    this.couponService.getPublicCouponById(id).pipe(
      take(1),
      timeout(15000)
    ).subscribe({
      next: (coupon) => {
        this.coupon = coupon && coupon.published ? coupon : null;
        if (!this.coupon) {
          this.error = 'No se encontró el cupón.';
        } else {
          this.checkIfCouponAlreadyAcquired(Number(this.coupon.id));
          this.loadCompanySocialLinks(Number(this.coupon.id));
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudo cargar el cupón en este momento.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private parseNumeric(value: string | number | null | undefined): number | null {
    if (value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private loadCompanySocialLinks(couponId: number): void {
    const token = this.auth.token;
    if (!token) return;

    this.couponService.getCouponCompanySocials(token, couponId).pipe(
      take(1),
      timeout(15000)
    ).subscribe({
      next: (links) => {
        this.companySocialLinks = links;
        this.cdr.detectChanges();
      },
      error: () => {
        this.companySocialLinks = null;
        this.cdr.detectChanges();
      }
    });
  }

  private buildCompanySocialUrl(rawValue: string | null | undefined, domain: string): string | null {
    const raw = rawValue?.trim();
    if (!raw) return null;

    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }

    if (/^www\./i.test(raw) || raw.includes('.')) {
      return `https://${raw}`;
    }

    const sanitizedHandle = raw.replace(/^@+/, '');
    if (!sanitizedHandle) return null;

    return `https://${domain}/${encodeURIComponent(sanitizedHandle)}`;
  }

  private formatNumber(value: number): string {
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(2).replace(/\.?0+$/, '');
  }

  onAcquireCoupon(): void {
    if (!this.coupon || !this.hasAvailableStock(this.coupon)) return;

    const currentUser = this.auth.getCurrentUser();
    const kcRole = (this.auth.getKeycloakRole() ?? '').toUpperCase();
    const isUsuario = currentUser?.role === 'usuario' || kcRole === this.USER_ROLE_LABEL;

    if (!isUsuario) {
      this.showLoginRequiredModal = true;
      return;
    }

    this.acquireError = '';
    this.acquireState = 'confirm';
    this.showAcquireModal = true;
  }

  closeLoginRequiredModal(): void {
    this.showLoginRequiredModal = false;
  }

  goToLogin(): void {
    this.closeLoginRequiredModal();
    this.auth.keycloakLogin(this.router.url);
  }

  closeAcquireModal(): void {
    if (this.acquireState === 'loading') return;
    this.showAcquireModal = false;
    this.acquireState = 'confirm';
    this.acquireError = '';
  }

  confirmAcquireCoupon(): void {
    if (!this.coupon || !this.hasAvailableStock(this.coupon)) return;

    const currentUser = this.auth.getCurrentUser();
    const token = this.auth.token;

    if (!this.canAcquire(currentUser, token)) {
      this.showAcquireModal = false;
      this.showLoginRequiredModal = true;
      return;
    }

    this.acquireError = '';
    this.acquireState = 'loading';

    this.couponService.acquireCoupon(token, Number(this.coupon.id)).pipe(
      take(1),
      timeout(15000)
    ).subscribe({
      next: (result) => {
        this.acquiredCoupon = result;
        if (this.coupon && typeof this.coupon.stock_available === 'number' && this.coupon.stock_available > 0) {
          this.coupon = {
            ...this.coupon,
            stock_available: this.coupon.stock_available - 1,
          };
        }
        this.acquireState = 'success';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[VIEW-COUPONS] acquireCoupon error', err);
        this.acquireError = 'No se pudo adquirir el cupón. Intenta nuevamente.';
        this.acquireState = 'confirm';
        this.cdr.detectChanges();
      }
    });
  }

  acceptAcquireSuccess(): void {
    this.showAcquireModal = false;
    this.acquireState = 'confirm';
    this.acquireError = '';
  }

  goToMyCoupons(): void {
    this.acceptAcquireSuccess();
    this.router.navigate(['/my-coupons']);
  }

  private canAcquire(user: AuthUser | null, token: string | null): token is string {
    const kcRole = (this.auth.getKeycloakRole() ?? '').toUpperCase();
    const isUsuario = user?.role === 'usuario' || kcRole === this.USER_ROLE_LABEL;
    return isUsuario && !!token;
  }

  private checkIfCouponAlreadyAcquired(couponId: number): void {
    const currentUser = this.auth.getCurrentUser();
    const token = this.auth.token;
    const kcRole = (this.auth.getKeycloakRole() ?? '').toUpperCase();
    const isUsuario = currentUser?.role === 'usuario' || kcRole === this.USER_ROLE_LABEL;

    if (!isUsuario || !token) {
      this.isCouponAlreadyAcquired = false;
      return;
    }

    this.couponService.hasAcquiredCoupon(token, couponId).pipe(
      take(1),
      timeout(15000)
    ).subscribe({
      next: (alreadyAcquired) => {
        this.isCouponAlreadyAcquired = alreadyAcquired;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isCouponAlreadyAcquired = false;
        this.cdr.detectChanges();
      }
    });
  }

}
