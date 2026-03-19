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
  private readonly debugImageLogs = true;
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
  transferModalOpen = false;
  transferring = false;
  transferSuccess = false;
  transferError = '';
  transferEmail = '';
  transferTarget: MyCouponItem | null = null;
  transferConfirm = false;
  private couponImageById = new Map<number, string>();

  coupons: MyCouponItem[] = [];
  searchText = '';
  selectedCategoryId: number | null = null;
  categoryDropdownOpen = false;
  selectedStatus: CouponStatusFilter = 'activo';
  sortBy: 'recent' | 'oldest' = 'recent';
  canjeadoDateFrom = '';
  canjeadoDateTo = '';

  currentPage = 1;
  readonly pageSize = 8;

  readonly categories: CouponCategoryFilter[] = [
    { key: 'all', label: 'Todos los cupones', categoryId: null, icon: 'assets/icons/coupon1.svg', bgColor: '#1438A0', invertIcon: true },
    { key: 'stay', label: 'Alojamiento', categoryId: 1, icon: 'assets/icons/double-bed.svg', bgColor: '#FFF8D2' },
    { key: 'food', label: 'Alimentos y bebidas', categoryId: 2, icon: 'assets/icons/dinner.svg', bgColor: '#ABE9FF' },
    { key: 'fun', label: 'Entretenimiento', categoryId: 4, icon: 'assets/icons/gift-bag1.svg', bgColor: '#FFD5D6' },
    { key: 'tourism', label: 'Turismo', categoryId: 3, icon: 'assets/icons/sunbed.svg', bgColor: '#D8D7FF' },
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
  ) { }

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

    if (this.selectedStatus !== 'activo') {
      const fromTime = this.toRangeDateTime(this.canjeadoDateFrom, 'start');
      const toTime = this.toRangeDateTime(this.canjeadoDateTo, 'end');

      if (fromTime != null || toTime != null) {
        rows = rows.filter((item) => {
          const sourceDate = this.selectedStatus === 'canjeado'
            ? (item.acquired.redeemed_at || item.acquired.acquired_at)
            : item.coupon.end_date;

          const itemTime = this.toRangeDateTime(sourceDate, 'start');
          if (itemTime == null) return false;
          if (fromTime != null && itemTime < fromTime) return false;
          if (toTime != null && itemTime > toTime) return false;
          return true;
        });
      }
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
    void this.loadCoupons();
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.categoryDropdownOpen = false;
    void this.loadCoupons();
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

  openTransferModal(item: MyCouponItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.transferTarget = item;
    this.transferEmail = '';
    this.transferError = '';
    this.transferSuccess = false;
    this.transferring = false;
    this.transferModalOpen = true;
  }

  closeTransferModal(): void {
    if (this.transferring) return;

    this.transferModalOpen = false;
    this.transferConfirm = false;
    this.transferSuccess = false;
    this.transferError = '';
    this.transferEmail = '';
    this.transferTarget = null;
  }

  confirmTransfer(): void {
    const email = this.transferEmail.trim();

    if (!this.isValidEmail(email)) {
      this.transferError = 'Ingresa un correo electrónico válido.';
      return;
    }

    this.transferConfirm = true;
  }

  async executeTransfer(): Promise<void> {
    if (!this.transferTarget) return;

    const email = this.transferEmail.trim();
    const uniqueCode = (this.transferTarget.acquired.unique_code ?? '').trim();

    const token = this.auth.token;
    if (!token) {
      this.transferError = 'Debes iniciar sesión para transferir cupones.';
      return;
    }

    this.transferring = true;
    this.transferError = '';

    try {
      const transferred = await firstValueFrom(
        this.couponService.transferCoupon(token, uniqueCode, email).pipe(take(1), timeout(15000))
      );

      if (!transferred) throw new Error('No se pudo completar la transferencia.');

      const transferredId = String(this.transferTarget.acquired.id);
      this.coupons = this.coupons.filter((item) => String(item.acquired.id) !== transferredId);

      this.transferSuccess = true;
    } catch (error) {
      this.transferError = 'No se pudo transferir el cupón.';
    } finally {
      this.transferring = false;
      this.cdr.detectChanges();
    }
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

  getCardImage(item: MyCouponItem): string {
    const couponId = Number(item.coupon.id);
    return this.couponImageById.get(couponId) ?? '';
  }

  hasCardImage(item: MyCouponItem): boolean {
    return !!this.getCardImage(item);
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

  canTransfer(item: MyCouponItem): boolean {
    if (item.acquired.redeemed) return false;
    const endDate = new Date(item.coupon.end_date);
    if (Number.isNaN(endDate.getTime())) return false;
    return endDate >= new Date();
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
        this.couponService.getCouponsAcquired(token, {
          limit: 200,
          offset: 0,
          where: this.buildAcquiredWhere(),
        }).pipe(take(1), timeout(15000))
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

      if (this.debugImageLogs) {
        console.info('[MY-COUPONS][IMG] couponIds adquiridos', {
          totalAcquiredRows: acquiredRows.length,
          uniqueCouponIds: couponIds.length,
          couponIds,
        });
      }

      const couponRows = await firstValueFrom(
        this.couponService.getCouponsByIds(token, couponIds).pipe(take(1), timeout(15000))
      );

      if (this.debugImageLogs) {
        console.info('[MY-COUPONS][IMG] cupones base cargados', {
          totalCouponRows: couponRows.length,
          couponIdsFromCoupons: couponRows.map((coupon) => Number(coupon.id)),
        });
      }

      const couponById = new Map<number, Coupon>();
      couponRows.forEach((coupon) => couponById.set(Number(coupon.id), coupon));

      await this.loadImagesForCoupons(token, couponRows);

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

  private isValidEmail(value: string): boolean {
    if (!value) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private buildAcquiredWhere(): Record<string, unknown> {
    if (this.selectedStatus !== 'canjeado') {
      return {};
    }

    const andConditions: Record<string, unknown>[] = [{ redeemed: { _eq: true } }];
    const search = this.searchText.trim();

    if (search) {
      andConditions.push({
        _or: [
          { unique_code: { _ilike: `%${search}%` } },
          { coupon: { title: { _ilike: `%${search}%` } } },
        ],
      });
    }

    const acquiredRange = this.buildDateRange(this.canjeadoDateFrom, this.canjeadoDateTo);
    if (acquiredRange) {
      andConditions.push({ acquired_at: acquiredRange });
    }

    const redeemedRange = this.buildDateRange(this.canjeadoDateFrom, this.canjeadoDateTo);
    if (redeemedRange) {
      andConditions.push({ redeemed_at: redeemedRange });
    }

    return { _and: andConditions };
  }

  private buildDateRange(from: string, to: string): Record<string, string> | null {
    const range: Record<string, string> = {};
    const normalizedFrom = from?.trim();
    const normalizedTo = to?.trim();

    if (normalizedFrom) {
      range['_gte'] = normalizedFrom;
    }

    if (normalizedTo) {
      range['_lte'] = normalizedTo;
    }

    return Object.keys(range).length > 0 ? range : null;
  }

  private toRangeDateTime(value: string | null | undefined, boundary: 'start' | 'end'): number | null {
    if (!value) return null;
    const raw = value.slice(0, 10);
    const [year, month, day] = raw.split('-').map((part) => Number(part));
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return null;
    }

    if (boundary === 'end') {
      return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
    }

    return new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
  }

  private async loadImagesForCoupons(token: string, rows: Coupon[]): Promise<void> {
    this.couponImageById.clear();
    if (!token || rows.length === 0) return;

    const uniqueCouponIds = Array.from(
      new Set(
        rows
          .map((coupon) => Number(coupon.id))
          .filter((id) => Number.isFinite(id))
      )
    );

    if (this.debugImageLogs) {
      console.info('[MY-COUPONS][IMG] solicitando imágenes por IDs', {
        totalRequested: uniqueCouponIds.length,
        requestedIds: uniqueCouponIds,
      });
    }

    try {
      const images = await firstValueFrom(
        this.couponService.getCouponImagesByIds(token, uniqueCouponIds).pipe(take(1), timeout(15000))
      );

      if (this.debugImageLogs) {
        console.info('[MY-COUPONS][IMG] respuesta backend imágenes', {
          totalRows: images.length,
          rows: images.map((image) => ({
            id: Number(image.id),
            hasBase64: !!image.image_base64,
            mime: image.image_mime_type,
            size: image.image_size,
          })),
        });
      }

      images.forEach((imageData) => {
        if (!imageData?.image_base64) return;
        const couponId = Number(imageData.id);
        if (!Number.isFinite(couponId)) return;

        const mime = this.normalizeMimeType(imageData.image_mime_type);
        const imageUrl = this.toDataUrl(imageData.image_base64, mime || 'image/jpeg');
        this.couponImageById.set(couponId, imageUrl);
      });

      if (this.debugImageLogs) {
        const loadedIds = Array.from(this.couponImageById.keys());
        const missingIds = uniqueCouponIds.filter((id) => !this.couponImageById.has(id));

        console.info('[MY-COUPONS][IMG] resultado mapeo imágenes', {
          loadedCount: loadedIds.length,
          loadedIds,
          missingCount: missingIds.length,
          missingIds,
        });
      }
    } catch {
      if (this.debugImageLogs) {
        console.error('[MY-COUPONS][IMG] error cargando imágenes por lote');
      }
      return;
    }
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
