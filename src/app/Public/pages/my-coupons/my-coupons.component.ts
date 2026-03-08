import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom, take, timeout } from 'rxjs';
import * as QRCode from 'qrcode';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { ContacUsComponent } from '../../../shared/components/contac-us/contac-us.component';
import { RelatedPagesComponent } from '../../../shared/components/related-pages/related-pages.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { AuthService } from '../../../service/auth.service';
import { Coupon, CouponAcquired, CouponService } from '../../../service/coupon.service';

type CouponStatusFilter = 'activo' | 'canjeado' | 'vencido';

interface CouponCategoryFilter {
  key: string;
  label: string;
  categoryId: number | null;
  icon: string;
  bgColor: string;
  invertIcon?: boolean;
}

interface MyCouponItem {
  coupon: Coupon;
  acquired: CouponAcquired;
}

@Component({
  selector: 'app-my-coupons',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NavbarComponent,
    ContacUsComponent,
    RelatedPagesComponent,
    FooterComponent,
  ],
  templateUrl: './my-coupons.component.html',
  styleUrl: './my-coupons.component.css',
})
export class MyCouponsComponent implements OnInit {
  loading = false;
  error = '';
  qrLoading = false;
  qrError = '';
  qrModalOpen = false;
  qrImageZoomOpen = false;
  qrDataUrl = '';
  qrUniqueCode = '';
  qrSelectedItem: MyCouponItem | null = null;
  qrSelectedImage = '';

  coupons: MyCouponItem[] = [];
  searchText = '';
  selectedCategoryId: number | null = null;
  categoryDropdownOpen = false;
  selectedStatus: CouponStatusFilter = 'activo';
  sortBy: 'recent' | 'oldest' = 'recent';

  currentPage = 1;
  readonly pageSize = 8;

  readonly categories: CouponCategoryFilter[] = [
    { key: 'all', label: 'Todos los cupones', categoryId: null, icon: 'assets/icons/coupon1.svg', bgColor: '#1438A0', invertIcon: true },
    { key: 'stay', label: 'Alojamiento', categoryId: 1, icon: 'assets/icons/double-bed.svg', bgColor: '#FFF8D2' },
    { key: 'food', label: 'Alimentos y bebidas', categoryId: 2, icon: 'assets/icons/dinner.svg', bgColor: '#ABE9FF' },
    { key: 'fun', label: 'Entretenimiento', categoryId: 4, icon: 'assets/icons/gift-bag1.svg', bgColor: '#FFD5D6' },
    { key: 'tourism', label: 'Turismo', categoryId: 3, icon: 'assets/icons/sunbed.svg', bgColor: '#D8D7FF' },
  ];

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
    1: 'assets/icons/double-bed.svg',
    2: 'assets/icons/dinner.svg',
    3: 'assets/icons/sunbed.svg',
    4: 'assets/icons/gift-bag1.svg',
    5: 'assets/icons/lotus1.svg',
    6: 'assets/icons/product-quality1.svg',
    7: 'assets/icons/gift-bag1.svg',
    8: 'assets/icons/traveler1.svg',
    9: 'assets/icons/bus1.svg',
  };

  private readonly categoryBgColors: Record<number, string> = {
    1: '#FFF8D2',
    2: '#ABE9FF',
    3: '#D8D7FF',
    4: '#FFD5D6',
    5: '#D3F6D2',
    6: '#FFD5D6',
    7: '#FFC6B3',
    8: '#CAFFFB',
    9: '#CAFFDC',
  };

  constructor(
    private readonly couponService: CouponService,
    private readonly auth: AuthService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void this.loadCoupons();
  }

  get filteredCoupons(): MyCouponItem[] {
    const search = this.normalizeText(this.searchText);
    const now = new Date();

    let rows = [...this.coupons];

    if (this.selectedCategoryId != null) {
      rows = rows.filter((item) => Number(item.coupon.category_id) === Number(this.selectedCategoryId));
    }

    if (this.selectedStatus === 'activo') {
      rows = rows.filter((item) => !item.acquired.redeemed && new Date(item.coupon.end_date) >= now);
    } else if (this.selectedStatus === 'vencido') {
      rows = rows.filter((item) => !item.acquired.redeemed && new Date(item.coupon.end_date) < now);
    } else if (this.selectedStatus === 'canjeado') {
      rows = rows.filter((item) => item.acquired.redeemed);
    }

    if (search) {
      rows = rows.filter((item) => {
        const title = this.normalizeText(item.coupon.title ?? '');
        const description = this.normalizeText(item.coupon.description ?? '');
        const uniqueCode = this.normalizeText(item.acquired.unique_code ?? '');
        return title.includes(search) || description.includes(search) || uniqueCode.includes(search);
      });
    }

    rows.sort((a, b) => {
      const aDate = new Date(a.acquired.acquired_at).getTime();
      const bDate = new Date(b.acquired.acquired_at).getTime();
      return this.sortBy === 'recent' ? bDate - aDate : aDate - bDate;
    });

    return rows;
  }

  get totalCoupons(): number {
    return this.filteredCoupons.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredCoupons.length / this.pageSize));
  }

  get paginatedCoupons(): MyCouponItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCoupons.slice(start, start + this.pageSize);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  setCategory(categoryId: number | null): void {
    this.selectedCategoryId = categoryId;
    this.categoryDropdownOpen = false;
    this.currentPage = 1;
  }

  get selectedCategory(): CouponCategoryFilter {
    return this.categories.find((item) => item.categoryId === this.selectedCategoryId) ?? this.categories[0];
  }

  toggleCategoryDropdown(): void {
    this.categoryDropdownOpen = !this.categoryDropdownOpen;
  }

  setStatus(status: CouponStatusFilter): void {
    this.selectedStatus = status;
    this.currentPage = 1;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.categoryDropdownOpen = false;
  }

  onSortChange(value: 'recent' | 'oldest'): void {
    this.sortBy = value;
    this.currentPage = 1;
  }

  async openQrModal(item: MyCouponItem, imageSrc: string, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    this.qrSelectedItem = item;
    this.qrSelectedImage = imageSrc;

    const uniqueCode = item.acquired.unique_code ?? '';
    const trimmedCode = (uniqueCode ?? '').trim();
    if (!trimmedCode) {
      this.qrError = 'Este cupón no tiene código QR disponible.';
      this.qrDataUrl = '';
      this.qrModalOpen = true;
      return;
    }

    this.qrLoading = true;
    this.qrError = '';
    this.qrUniqueCode = trimmedCode;
    this.qrDataUrl = '';
    this.qrModalOpen = true;

    try {
      this.qrDataUrl = await QRCode.toDataURL(trimmedCode, {
        width: 320,
        margin: 1,
        errorCorrectionLevel: 'M',
      });
    } catch (error) {
      console.error('[MY-COUPONS] Error generating QR', error);
      this.qrError = 'No se pudo generar el QR en este momento.';
    } finally {
      this.qrLoading = false;
      this.cdr.detectChanges();
    }
  }

  closeQrModal(): void {
    this.qrModalOpen = false;
    this.qrImageZoomOpen = false;
    this.qrLoading = false;
    this.qrError = '';
    this.qrDataUrl = '';
    this.qrUniqueCode = '';
    this.qrSelectedItem = null;
    this.qrSelectedImage = '';
  }

  openQrImageZoom(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.qrDataUrl || this.qrLoading || this.qrError) return;
    this.qrImageZoomOpen = true;
  }

  closeQrImageZoom(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.qrImageZoomOpen = false;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  getCardImage(index: number): string {
    return this.cardImages[index % this.cardImages.length];
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

  formatExpirationDate(endDate: string): string {
    const parsed = endDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!parsed) return 'Vence: Fecha no disponible';

    const [, year, month, day] = parsed;
    const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const monthIndex = Number(month) - 1;
    const monthName = monthNames[monthIndex] ?? month;
    return `Vence: ${day} ${monthName} ${year}`;
  }

  getStockLabel(coupon: Coupon): string {
    const amount = typeof coupon.stock_available === 'number' ? coupon.stock_available : 0;
    return `${amount} cupones`;
  }

  private async loadCoupons(): Promise<void> {
    this.loading = true;
    this.error = '';

    const token = this.auth.token;
    const currentUser = this.auth.getCurrentUser();
    const kcRole = (this.auth.getKeycloakRole() ?? '').toUpperCase();
    const isUserRole = currentUser?.role === 'usuario' || kcRole === 'USER';

    if (!token || !isUserRole) {
      this.error = 'Debes iniciar sesión como usuario para ver tus cupones.';
      this.coupons = [];
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    try {
      const acquiredResponse = await firstValueFrom(
        this.couponService.getCouponsAcquired(token, { limit: 200, offset: 0 }).pipe(take(1), timeout(15000))
      );

      const acquiredRows = acquiredResponse.rows ?? [];
      if (acquiredRows.length === 0) {
        this.coupons = [];
        return;
      }

      const couponIds = Array.from(
        new Set(
          acquiredRows
            .map((row) => Number(row.coupon_id))
            .filter((id) => Number.isFinite(id))
        )
      );

      const couponRows = await firstValueFrom(
        this.couponService.getCouponsByIds(token, couponIds).pipe(take(1), timeout(15000))
      );

      const couponById = new Map<number, Coupon>();
      couponRows.forEach((coupon) => couponById.set(Number(coupon.id), coupon));

      this.coupons = acquiredRows
        .map((acquired) => {
          const coupon = couponById.get(Number(acquired.coupon_id));
          if (!coupon) return null;
          return { coupon, acquired } as MyCouponItem;
        })
        .filter((item): item is MyCouponItem => item !== null);
    } catch (error) {
      console.error('[MY-COUPONS] Error loading acquired coupons', error);
      this.error = 'No se pudieron cargar tus cupones en este momento.';
      this.coupons = [];
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
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

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
