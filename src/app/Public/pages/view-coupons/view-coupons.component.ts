import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { FeaturedDealsComponent } from '../../../shared/components/featured-deals/featured-deals.component';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { ContacUsComponent } from '../../../shared/components/contac-us/contac-us.component';
import { RelatedPagesComponent } from '../../../shared/components/related-pages/related-pages.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { AcquiredCoupon, Coupon, CouponService } from '../../../service/coupon.service';
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

  readonly fixedCouponBrand = 'El Salvador Tours';
  readonly fixedAddress = 'Los Cóbanos, Sonsonate';

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

  getTermsList(terms: string | null): string[] {
    if (!terms) return [];
    return terms
      .split(/\r?\n|;/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  formatExpirationDate(endDate: string): string {
    const parsed = endDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!parsed) return 'Vence: Fecha no disponible';

    const [, year, month, day] = parsed;
    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const monthIndex = Number(month) - 1;
    const monthName = monthNames[monthIndex] ?? month;
    return `Vence: ${Number(day)} ${monthName} ${year}`;
  }

  private loadCoupon(id: number): void {
    this.loading = true;
    this.error = '';

    this.couponService.getPublicCouponById(id).pipe(
      take(1),
      timeout(15000)
    ).subscribe({
      next: (coupon) => {
        this.coupon = coupon && coupon.published ? coupon : null;
        if (!this.coupon) {
          this.error = 'No se encontró el cupón.';
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

  private formatNumber(value: number): string {
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(2).replace(/\.?0+$/, '');
  }

  onAcquireCoupon(): void {
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
    this.router.navigate(['/login']);
  }

  closeAcquireModal(): void {
    if (this.acquireState === 'loading') return;
    this.showAcquireModal = false;
    this.acquireState = 'confirm';
    this.acquireError = '';
  }

  confirmAcquireCoupon(): void {
    if (!this.coupon) return;

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

}
