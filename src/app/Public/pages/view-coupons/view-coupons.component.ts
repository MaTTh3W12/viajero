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
import { CategoryService } from '../../../service/category.service';
import { catchError, of, take, timeout } from 'rxjs';

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
  couponImageSrc: string | null = null;
  showLoginRequiredModal = false;
  showAcquireModal = false;
  acquireState: 'confirm' | 'loading' | 'success' = 'confirm';
  acquireError = '';
  acquiredCoupon: AcquiredCoupon | null = null;
  isCouponAlreadyAcquired = false;
  companySocialLinks: CompanySocialLinks | null = null;
  readonly fallbackCategoryName = 'Categoria';
  private categoryNameById = new Map<number, string>();
  private categoryIconById = new Map<number, string>();
  private categoryBgColorById = new Map<number, string>();
  private readonly categoryVisualBySlug: Record<string, { icon: string; bgColor: string }> = {
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

  constructor(
    private readonly route: ActivatedRoute,
    private readonly couponService: CouponService,
    private readonly categoryService: CategoryService,
    private readonly cdr: ChangeDetectorRef,
    private readonly auth: AuthService,
    private readonly router: Router
  ) { }

  ngOnInit(): void {
    this.loadCategoryMetadata();
    this.route.paramMap.subscribe((params) => {
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
    return this.categoryNameById.get(Number(categoryId)) ?? this.fallbackCategoryName;
  }

  getCategoryIconPath(categoryId: number): string {
    return this.categoryIconById.get(Number(categoryId)) ?? 'assets/icons/coupon1.svg';
  }

  getCategoryBgColor(categoryId: number): string {
    return this.categoryBgColorById.get(Number(categoryId)) ?? '#E5E7EB';
  }

  hasCouponImage(): boolean {
    return !!this.couponImageSrc;
  }

  getCouponImageSrc(): string {
    return this.couponImageSrc ?? '';
  }

  onCouponImageError(): void {
    this.couponImageSrc = null;
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
    const rawMapUrl = coupon.user_public?.company_map_url?.trim() ?? coupon.user?.company_map_url?.trim() ?? '';
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
    const rawAddress = coupon.user_public?.company_address?.trim() ?? coupon.user?.company_address?.trim() ?? '';
    return rawAddress || 'Ubicación no disponible';
  }

  getCouponCommercialName(coupon: Coupon): string {
    const companyNameFromUser = coupon.user?.company_commercial_name?.trim() ?? '';
    const companyNameFromUserPublic = coupon.user_public?.company_commercial_name?.trim() ?? '';
    return companyNameFromUser || companyNameFromUserPublic || 'Empresa no disponible';
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
    this.couponImageSrc = null;

    this.couponService.getPublicCouponById(id).pipe(
      take(1),
      timeout(15000)
    ).subscribe({
      next: (coupon) => {
        this.coupon = coupon && coupon.published ? coupon : null;
        if (!this.coupon) {
          this.error = 'No se encontró el cupón.';
        } else {
          this.loadCouponImage(Number(this.coupon.id));
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

  private loadCouponImage(couponId: number): void {
    if (!Number.isFinite(couponId) || couponId <= 0) {
      this.couponImageSrc = null;
      return;
    }

    this.couponService.getPublicCouponImagesByIds([couponId]).pipe(
      take(1),
      timeout(15000)
    ).subscribe({
      next: (images) => {
        const imageData = images.find((image) => Number(image.id) === couponId);
        if (!imageData?.image_base64) {
          this.couponImageSrc = null;
          this.cdr.detectChanges();
          return;
        }

        const mime = this.normalizeMimeType(imageData.image_mime_type);
        this.couponImageSrc = this.toDataUrl(imageData.image_base64, mime || 'image/jpeg');
        this.cdr.detectChanges();
      },
      error: () => {
        this.couponImageSrc = null;
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

  private toDataUrl(base64: string, mimeType: string): string {
    if (!base64) return '';
    if (base64.startsWith('data:')) return base64;
    return `data:${mimeType};base64,${base64}`;
  }

  private normalizeMimeType(mimeType: string | null | undefined): string {
    if (!mimeType) return '';
    return String(mimeType).replace(/^"+|"+$/g, '').trim().toLowerCase();
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
        const visual = this.resolveCategoryVisual(categoryName);

        this.categoryNameById.set(categoryId, categoryName);
        this.categoryIconById.set(categoryId, visual.icon);
        this.categoryBgColorById.set(categoryId, visual.bgColor);
      });

      this.cdr.detectChanges();
    });
  }

  private resolveCategoryVisual(categoryName: string): { icon: string; bgColor: string } {
    const slug = this.toCategorySlug(categoryName);
    return this.categoryVisualBySlug[slug] ?? { icon: 'assets/icons/coupon1.svg', bgColor: '#E5E7EB' };
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

  onAcquireCoupon(): void {
    if (!this.coupon || !this.hasAvailableStock(this.coupon)) return;

    const currentUser = this.auth.getCurrentUser();
    const token = this.auth.token;
    if (!this.canAcquire(currentUser, token)) {
      this.showAcquireModal = false;
      this.showLoginRequiredModal = true;
      return;
    }

    this.acquireError = '';
    this.acquireState = 'confirm';
    this.acquiredCoupon = null;
    this.showLoginRequiredModal = false;
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

  async confirmAcquireCoupon(): Promise<void> {
    if (!this.coupon || !this.hasAvailableStock(this.coupon)) return;

    const token = await this.resolveAcquireToken();
    if (!token) return;

    this.acquireError = '';
    this.acquireState = 'loading';
    this.executeAcquireCoupon(token);
  }

  private executeAcquireCoupon(token: string): void {
    if (!this.coupon) return;
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

  private async resolveAcquireToken(): Promise<string | null> {
    const currentUser = this.auth.getCurrentUser();
    const token = this.auth.token;

    if (!this.canAcquire(currentUser, token)) {
      this.showAcquireModal = false;
      this.showLoginRequiredModal = true;
      return null;
    }

    const needsProfileCompletion = await this.auth.userProfileNeedsCompletion(token);
    if (needsProfileCompletion) {
      this.showAcquireModal = false;
      this.showLoginRequiredModal = false;
      this.router.navigateByUrl('/register?type=user');
      return null;
    }

    return token;
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
    return this.isUsuarioRole(user) && !!token;
  }

  private checkIfCouponAlreadyAcquired(couponId: number): void {
    const currentUser = this.auth.getCurrentUser();
    const token = this.auth.token;
    const isUsuario = this.isUsuarioRole(currentUser);

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

  private isUsuarioRole(user: AuthUser | null): boolean {
    const role = String(user?.role ?? '').toLowerCase();
    const kcRole = (this.auth.getKeycloakRole() ?? '').toUpperCase();
    return role === 'usuario' || role === 'user' || kcRole === this.USER_ROLE_LABEL;
  }

}
