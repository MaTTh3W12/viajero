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
  transferModalOpen = false;
  transferring = false;
  transferSuccess = false;
  transferError = '';
  transferEmail = '';
  transferTarget: MyCouponItem | null = null;
  transferConfirm = false;
  private couponImageById = new Map<number, string>();
  private latestLoadRequestId = 0;

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
      rows = rows.filter((item) => !this.isAcquiredRedeemed(item.acquired) && !this.isCouponExpiredForUser(item, now.getTime()));
    } else if (this.selectedStatus === 'vencido') {
      rows = rows.filter((item) => !this.isAcquiredRedeemed(item.acquired) && this.isCouponExpiredForUser(item, now.getTime()));
    } else if (this.selectedStatus === 'canjeado') {
      rows = rows.filter((item) => this.isAcquiredRedeemed(item.acquired));
    }

    if (this.selectedStatus !== 'activo') {
      const fromTime = this.toRangeDateTime(this.canjeadoDateFrom, 'start');
      const toTime = this.toRangeDateTime(this.canjeadoDateTo, 'end');

      if (fromTime != null || toTime != null) {
        rows = rows.filter((item) => {
          const sourceDate = this.selectedStatus === 'canjeado'
            ? (item.acquired.redeemed_at || item.acquired.acquired_at)
            : this.getCouponEndDate(item);

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

  getCouponCardLink(item: MyCouponItem): string[] | null {
    return null;
  }

  isCouponCardClickable(item: MyCouponItem): boolean {
    return true;
  }

  onCouponCardClick(item: MyCouponItem, event: Event): void {
    void this.openCouponDetailModal(item, this.getCardImage(item), event);
  }

  async openCouponDetailModal(item: MyCouponItem, imageSrc: string, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    this.qrSelectedItem = item;
    this.qrSelectedImage = imageSrc;
    this.qrModalOpen = true;

    if (!this.isCouponActive(item)) {
      this.qrLoading = false;
      this.qrError = '';
      this.qrUniqueCode = '';
      this.qrDataUrl = '';
      return;
    }

    await this.generateQrForItem(item);
  }

  async openQrModal(item: MyCouponItem, imageSrc: string, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isCouponActive(item)) return;

    this.qrSelectedItem = item;
    this.qrSelectedImage = imageSrc;
    this.qrModalOpen = true;
    await this.generateQrForItem(item);
  }

  isDetailItemActive(): boolean {
    if (!this.qrSelectedItem) return false;
    return this.isCouponActive(this.qrSelectedItem);
  }

  getDetailStatusText(item: MyCouponItem): string {
    return item.acquired.redeemed ? 'Cupón canjeado' : 'Cupón vencido';
  }

  getDetailStatusDateText(item: MyCouponItem): string {
    if (item.acquired.redeemed) {
      return `Canjeado: ${this.formatDateTime(item.acquired.redeemed_at || item.acquired.acquired_at)}`;
    }
    return `Venció: ${this.formatDateTime(this.getCouponEndDate(item), false)}`;
  }

  private async generateQrForItem(item: MyCouponItem): Promise<void> {
    const uniqueCode = item.acquired.unique_code ?? '';
    const trimmedCode = (uniqueCode ?? '').trim();
    if (!trimmedCode) {
      this.qrError = 'Este cupón no tiene código QR disponible.';
      this.qrDataUrl = '';
      return;
    }

    this.qrLoading = true;
    this.qrError = '';
    this.qrUniqueCode = trimmedCode;
    this.qrDataUrl = '';

    try {
      this.qrDataUrl = await QRCode.toDataURL(trimmedCode, {
        width: 320,
        margin: 1,
        errorCorrectionLevel: 'M',
      });
    } catch {
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

    this.transferError = '';

    if (!this.isValidEmail(email)) {
      this.transferError = 'Ingresa un correo electrónico válido.';
      return;
    }

    const uniqueCode = (this.transferTarget?.acquired.unique_code ?? '').trim();
    if (!uniqueCode) {
      this.transferError = 'El cupón no tiene un código válido para transferir.';
      return;
    }

    this.transferConfirm = true;
  }

  async executeTransfer(): Promise<void> {
    if (!this.transferTarget) return;

    const email = this.transferEmail.trim();
    const uniqueCode = (this.transferTarget.acquired.unique_code ?? '').trim();
    const currentUser = this.auth.getCurrentUser();
    const currentUserId = (currentUser?.sub ?? '').trim();
    const couponOwnerId = String(this.transferTarget.acquired.user_id ?? '').trim();

    if (!this.isValidEmail(email)) {
      this.transferError = 'Ingresa un correo electrónico válido.';
      return;
    }

    if (!uniqueCode) {
      this.transferError = 'El cupón no tiene un código válido para transferir.';
      return;
    }

    if (currentUserId && couponOwnerId && currentUserId !== couponOwnerId) {
      this.transferError = 'No puedes transferir este cupón porque no pertenece a tu cuenta.';
      return;
    }

    const token = this.auth.token;
    if (!token) {
      this.transferError = 'Debes iniciar sesión para transferir cupones.';
      return;
    }

    this.transferring = true;
    this.transferError = '';

    try {
      const transferred = await firstValueFrom(
        this.couponService.transferCoupon(token, uniqueCode, email.toLowerCase()).pipe(take(1), timeout(15000))
      );

      if (!transferred) {
        const reconciled = await this.reconcileTransferState(uniqueCode);
        if (reconciled) {
          this.transferError = '';
          this.transferSuccess = true;
          return;
        }
        throw new Error('No se pudo completar la transferencia.');
      }

      const transferredId = String(this.transferTarget.acquired.id);
      this.coupons = this.coupons.filter((item) => String(item.acquired.id) !== transferredId);

      this.transferSuccess = true;
    } catch (error) {
      const transferMessage = this.getTransferErrorMessage(error);

      if (this.isOwnershipTransferError(error, transferMessage)) {
        const reconciled = await this.reconcileTransferState(uniqueCode);
        if (reconciled) {
          this.transferError = '';
          this.transferSuccess = true;
          return;
        }
      }

      this.transferError = transferMessage;
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

  getCouponCommercialName(coupon: Coupon): string {
    const companyNameFromUser = coupon.user?.company_commercial_name?.trim() ?? '';
    const companyNameFromUserPublic = coupon.user_public?.company_commercial_name?.trim() ?? '';
    return companyNameFromUser || companyNameFromUserPublic || 'Empresa no disponible';
  }

  getCouponAddress(coupon: Coupon): string {
    const addressFromUser = coupon.user?.company_address?.trim() ?? '';
    const addressFromUserPublic = coupon.user_public?.company_address?.trim() ?? '';
    return addressFromUser || addressFromUserPublic || 'Ubicación no disponible';
  }

  getCouponMapUrl(coupon: Coupon): string | null {
    const rawMapUrl = (
      coupon.user?.company_map_url?.trim() ??
      coupon.user_public?.company_map_url?.trim() ??
      ''
    );

    if (!rawMapUrl) return null;
    if (/^https?:\/\//i.test(rawMapUrl)) return rawMapUrl;
    if (/^www\./i.test(rawMapUrl)) return `https://${rawMapUrl}`;
    return null;
  }

  getPriceBadgeLabel(coupon: Coupon): string {
    const discount = this.parseNumeric(coupon.price_discount);
    const price = this.parseNumeric(coupon.price);

    if (discount != null) return `${this.formatNumber(discount)}% OFF`;
    if (price != null) return `$${this.formatNumber(price)} USD`;
    return 'N/A';
  }

  formatExpirationDate(endDate: string): string {
    const normalized = String(endDate ?? '').trim();
    if (!normalized) return 'Vence: Fecha no disponible';

    const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

    const datePrefix = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (datePrefix) {
      const [, year, month, day] = datePrefix;
      const monthIndex = Number(month) - 1;
      const monthName = monthNames[monthIndex] ?? month;
      return `Vence: ${day} ${monthName} ${year}`;
    }

    const parsedDate = new Date(normalized);
    if (Number.isNaN(parsedDate.getTime())) return 'Vence: Fecha no disponible';

    const day = String(parsedDate.getDate()).padStart(2, '0');
    const monthIndex = parsedDate.getMonth();
    const year = String(parsedDate.getFullYear());
    const monthName = monthNames[monthIndex] ?? String(monthIndex + 1).padStart(2, '0');
    return `Vence: ${day} ${monthName} ${year}`;
  }

  getStockLabel(coupon: Coupon): string {
    const amount = typeof coupon.stock_available === 'number' ? coupon.stock_available : 0;
    return `${amount} cupones`;
  }

  canTransfer(item: MyCouponItem): boolean {
    const currentUserId = this.getCurrentUserId();
    const ownerId = String(item.acquired.user_id ?? '').trim();

    if (currentUserId && ownerId && currentUserId !== ownerId) return false;
    if (this.isAcquiredRedeemed(item.acquired)) return false;
    return !this.isCouponExpiredForUser(item);
  }

  private isCouponActive(item: MyCouponItem): boolean {
    if (this.isAcquiredRedeemed(item.acquired)) return false;
    return !this.isCouponExpiredForUser(item);
  }

  private isAcquiredRedeemed(acquired: CouponAcquired): boolean {
    const rawRedeemed: unknown = (acquired as { redeemed?: unknown }).redeemed;
    if (typeof rawRedeemed === 'boolean') return rawRedeemed;
    if (typeof rawRedeemed === 'number') return rawRedeemed === 1;
    if (typeof rawRedeemed === 'string') {
      const normalized = rawRedeemed.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0' || normalized === '') return false;
    }

    return !!acquired.redeemed_at;
  }

  private async loadCoupons(): Promise<void> {
    const currentRequestId = ++this.latestLoadRequestId;
    this.loading = true;
    this.error = '';

    const token = this.auth.token;
    const currentUser = this.auth.getCurrentUser();
    const kcRole = (this.auth.getKeycloakRole() ?? '').toUpperCase();
    const isUserRole = currentUser?.role === 'usuario' || kcRole === 'USER';

    if (!token || !isUserRole) {
      if (currentRequestId !== this.latestLoadRequestId) return;
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
        if (currentRequestId !== this.latestLoadRequestId) return;
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
      if (currentRequestId !== this.latestLoadRequestId) return;

      const couponRowsIds = couponRows.map((coupon) => Number(coupon.id));
      const missingCouponIds = couponIds.filter((id) => !couponRowsIds.includes(id));


      const couponById = new Map<number, Coupon>();
      couponRows.forEach((coupon) => couponById.set(Number(coupon.id), coupon));

      const stillMissingCouponIds = missingCouponIds.filter((id) => !couponById.has(id));

      if (stillMissingCouponIds.length > 0) {
        try {
          const publicFallbackRows = await firstValueFrom(
            this.couponService.getPublicCouponsByIds(stillMissingCouponIds).pipe(take(1), timeout(10000))
          );
          publicFallbackRows.forEach((coupon) => {
            const id = Number(coupon.id);
            if (!Number.isFinite(id) || couponById.has(id)) return;
            couponById.set(id, coupon);
          });

        } catch (error) {
        }
      }

      await this.enrichMissingCouponsFromUniqueCode(token, acquiredRows, couponById);
      if (currentRequestId !== this.latestLoadRequestId) return;

      const couponIdsNeedingPublicSnapshotEnrichment = couponIds.filter((id) => {
        const coupon = couponById.get(id);
        if (!coupon) return true;

        const title = String(coupon.title ?? '').trim();
        const endDate = String(coupon.end_date ?? '').trim();
        const hasCompany = this.hasCompanyData(coupon.user_public ?? null);

        return !title || title.startsWith(`Cupón #${id}`) || !endDate || !hasCompany;
      });

      await this.enrichMissingCouponsFromPublicImageSnapshots(
        couponIdsNeedingPublicSnapshotEnrichment,
        acquiredRows,
        couponById
      );
      if (currentRequestId !== this.latestLoadRequestId) return;

      await this.enrichMissingCouponTitlesFromStats(token, couponIds, couponById);
      if (currentRequestId !== this.latestLoadRequestId) return;

      const couponsForEnrichment = Array.from(couponById.values());

      await this.enrichCompanyDataFromUsersPublic(acquiredRows, couponsForEnrichment);
      if (currentRequestId !== this.latestLoadRequestId) return;

      await this.enrichCompanyDataFromCouponOwners(token, couponsForEnrichment);
      if (currentRequestId !== this.latestLoadRequestId) return;

      await this.loadImagesForCoupons(token, couponsForEnrichment, couponIds);
      if (currentRequestId !== this.latestLoadRequestId) return;

      this.coupons = acquiredRows
        .map((acquired) => {
          const normalizedAcquired: CouponAcquired = {
            ...acquired,
            redeemed: this.isAcquiredRedeemed(acquired),
          };
          const couponId = Number(acquired.coupon_id);
          const couponFromLookup = couponById.get(couponId);
          const coupon = couponFromLookup
            ? this.mergeCouponWithAcquiredSnapshot(couponFromLookup, normalizedAcquired)
            : this.createCouponFallbackFromAcquired(normalizedAcquired);
          if (!coupon) return null;
          couponById.set(couponId, coupon);
          return { coupon, acquired: normalizedAcquired } as MyCouponItem;
        })
        .filter((item): item is MyCouponItem => item !== null);
      if (currentRequestId !== this.latestLoadRequestId) return;

    } catch {
      if (currentRequestId !== this.latestLoadRequestId) return;
      this.error = 'No se pudieron cargar tus cupones en este momento.';
      this.coupons = [];
    } finally {
      if (currentRequestId !== this.latestLoadRequestId) return;
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

  private formatDateTime(value: string | null | undefined, withTime = true): string {
    const raw = String(value ?? '').trim();
    if (!raw) return 'Fecha no disponible';

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return 'Fecha no disponible';

    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = String(parsed.getFullYear());

    if (!withTime) {
      return `${day}/${month}/${year}`;
    }

    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} - ${hours}:${minutes}`;
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

  private getTransferErrorMessage(error: unknown): string {
    const defaultMessage = 'No se pudo transferir el cupón.';

    if (!(error instanceof Error)) return defaultMessage;

    const rawMessage = error.message?.trim();
    if (!rawMessage) return defaultMessage;

    const normalized = rawMessage.toLowerCase();

    if (normalized.includes('not found') || normalized.includes('no rows')) {
      return 'No se encontró el cupón para transferir.';
    }

    if (normalized.includes('email') || normalized.includes('correo')) {
      return 'El correo destino no es válido o no existe.';
    }

    if (
      normalized.includes('permission') ||
      normalized.includes('denied') ||
      normalized.includes('forbidden') ||
      normalized.includes('unauthorized')
    ) {
      return 'No tienes permisos para transferir este cupón.';
    }

    return rawMessage;
  }

  private isOwnershipTransferError(error: unknown, resolvedMessage: string): boolean {
    const raw = error instanceof Error ? error.message.toLowerCase() : '';
    const resolved = resolvedMessage.toLowerCase();

    return (
      raw.includes('you do not own this coupon') ||
      resolved.includes('no tienes permisos para transferir este cupón') ||
      resolved.includes('unauthorized')
    );
  }

  private async reconcileTransferState(uniqueCode: string): Promise<boolean> {
    try {
      await this.loadCoupons();

      if (this.error) return false;

      const stillOwned = this.coupons.some(
        (item) => (item.acquired.unique_code ?? '').trim() === uniqueCode
      );

      return !stillOwned;
    } catch {
      return false;
    }
  }

  private buildAcquiredWhere(): Record<string, unknown> {
    const currentUserId = this.getCurrentUserId();
    const ownerCondition = currentUserId ? { user_id: { _eq: currentUserId } } : null;

    if (this.selectedStatus === 'activo' || this.selectedStatus === 'vencido') {
      const andConditions: Record<string, unknown>[] = [{ redeemed: { _eq: false } }];
      if (ownerCondition) andConditions.push(ownerCondition);
      return { _and: andConditions };
    }

    const andConditions: Record<string, unknown>[] = [{ redeemed: { _eq: true } }];
    if (ownerCondition) {
      andConditions.push(ownerCondition);
    }
    const search = this.searchText.trim();

    if (search) {
      andConditions.push({
        _or: [
          { unique_code: { _ilike: `%${search}%` } },
          { coupon_public: { title: { _ilike: `%${search}%` } } },
        ],
      });
    }

    const redeemedRange = this.buildDateRange(this.canjeadoDateFrom, this.canjeadoDateTo);
    if (redeemedRange) {
      andConditions.push({ redeemed_at: redeemedRange });
    }

    return { _and: andConditions };
  }

  private getCurrentUserId(): string {
    return String(this.auth.getCurrentUser()?.sub ?? '').trim();
  }

  private toUuid(value: unknown): string | null {
    const normalized = String(value ?? '').trim();
    if (!normalized) return null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(normalized) ? normalized : null;
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

  private getCouponEndDate(item: MyCouponItem): string {
    return item.coupon.end_date || item.acquired.coupon?.end_date || '';
  }

  private getCouponEndDateTime(item: MyCouponItem): number {
    const endDate = this.getCouponEndDate(item);
    const parsed = new Date(endDate);
    if (Number.isNaN(parsed.getTime())) {
      return Number.POSITIVE_INFINITY;
    }

    return parsed.getTime();
  }

  private isCouponExpiredForUser(item: MyCouponItem, nowTime = Date.now()): boolean {
    if (item.coupon.active === false) return true;
    return this.getCouponEndDateTime(item) < nowTime;
  }

  private createCouponFallbackFromAcquired(acquired: CouponAcquired): Coupon {
    const companySnapshot = this.getCompanySnapshotFromAcquired(acquired);
    const couponImageSnapshot = acquired.coupon_with_image_base64 ?? null;
    const couponTitle =
      acquired.coupon?.title?.trim() ||
      couponImageSnapshot?.title?.trim() ||
      `Cupón #${String(acquired.coupon_id)}`;
    const couponDescription = acquired.coupon?.description ?? couponImageSnapshot?.description ?? null;
    const couponPrice = acquired.coupon?.price != null
      ? String(acquired.coupon.price)
      : couponImageSnapshot?.price != null
        ? String(couponImageSnapshot.price)
        : null;
    const couponPriceDiscount = acquired.coupon?.price_discount != null
      ? String(acquired.coupon.price_discount)
      : couponImageSnapshot?.price_discount != null
        ? String(couponImageSnapshot.price_discount)
        : null;
    const couponStartDate = acquired.coupon?.start_date ?? couponImageSnapshot?.start_date ?? '';
    const couponEndDate = acquired.coupon?.end_date ?? couponImageSnapshot?.end_date ?? '';
    const isMissingCouponPayload = !acquired.coupon && !couponImageSnapshot;

    return {
      id: Number(acquired.coupon_id),
      user_id: acquired.user_id,
      category_id: 0,
      auto_published: false,
      published: true,
      // If backend omits coupon relation (RLS/deleted/inactive), keep row visible as expired placeholder.
      active: isMissingCouponPayload ? false : undefined,
      title: couponTitle,
      end_date: couponEndDate,
      start_date: couponStartDate,
      stock_available: null,
      stock_total: null,
      price: couponPrice,
      price_discount: couponPriceDiscount,
      description: couponDescription,
      terms: null,
      created_at: acquired.acquired_at,
      updated_at: acquired.acquired_at,
      user_public: companySnapshot,
    };
  }

  private mergeCouponWithAcquiredSnapshot(coupon: Coupon, acquired: CouponAcquired): Coupon {
    const userPublicSnapshot = this.getCompanySnapshotFromAcquired(acquired);
    const couponRelationSnapshot = acquired.coupon ?? null;
    const couponImageSnapshot = acquired.coupon_with_image_base64 ?? null;

    const mergedTitle =
      coupon.title?.trim() ||
      couponRelationSnapshot?.title?.trim() ||
      couponImageSnapshot?.title?.trim() ||
      '';
    const mergedDescription = coupon.description ?? couponRelationSnapshot?.description ?? couponImageSnapshot?.description ?? null;
    const mergedPrice =
      coupon.price ??
      (couponRelationSnapshot?.price != null ? String(couponRelationSnapshot.price) : null) ??
      (couponImageSnapshot?.price != null ? String(couponImageSnapshot.price) : null);
    const mergedPriceDiscount =
      coupon.price_discount ??
      (couponRelationSnapshot?.price_discount != null ? String(couponRelationSnapshot.price_discount) : null) ??
      (couponImageSnapshot?.price_discount != null ? String(couponImageSnapshot.price_discount) : null);
    const mergedStartDate = coupon.start_date || couponRelationSnapshot?.start_date || couponImageSnapshot?.start_date || '';
    const mergedEndDate = coupon.end_date || couponRelationSnapshot?.end_date || couponImageSnapshot?.end_date || '';

    if (!userPublicSnapshot && mergedTitle === coupon.title && mergedDescription === coupon.description
      && mergedPrice === coupon.price && mergedPriceDiscount === coupon.price_discount
      && mergedStartDate === coupon.start_date && mergedEndDate === coupon.end_date) {
      return coupon;
    }

    const currentUserPublic = coupon.user_public ?? null;
    const mergedUserPublic = userPublicSnapshot
      ? {
          ...(userPublicSnapshot ?? {}),
          ...(currentUserPublic ?? {}),
          id: currentUserPublic?.id ?? userPublicSnapshot.id,
          company_commercial_name:
            currentUserPublic?.company_commercial_name ?? userPublicSnapshot.company_commercial_name,
          company_address: currentUserPublic?.company_address ?? userPublicSnapshot.company_address,
          company_map_url: currentUserPublic?.company_map_url ?? userPublicSnapshot.company_map_url,
        }
      : currentUserPublic;

    return {
      ...coupon,
      title: mergedTitle || coupon.title,
      description: mergedDescription,
      price: mergedPrice,
      price_discount: mergedPriceDiscount,
      start_date: mergedStartDate,
      end_date: mergedEndDate,
      user_public: mergedUserPublic,
    };
  }

  private getCompanySnapshotFromAcquired(couponAcquired: CouponAcquired): Coupon['user_public'] {
    const couponUserPublic = couponAcquired.coupon?.user_public ?? null;
    if (couponUserPublic) return couponUserPublic;

    const validatedUser = couponAcquired.userPublicByValidatedBy;
    if (!validatedUser) return null;

    const hasCompanyData = !!(
      validatedUser.company_commercial_name ||
      validatedUser.company_address ||
      validatedUser.company_map_url
    );
    if (!hasCompanyData) return null;

    return {
      id: validatedUser.id ?? String(couponAcquired.validated_by ?? couponAcquired.id),
      company_commercial_name: validatedUser.company_commercial_name ?? null,
      company_address: validatedUser.company_address ?? null,
      company_map_url: validatedUser.company_map_url ?? null,
    };
  }

  private async enrichMissingCouponsFromUniqueCode(
    token: string,
    acquiredRows: CouponAcquired[],
    couponById: Map<number, Coupon>
  ): Promise<void> {
    const rowsNeedingEnrichment = acquiredRows.filter((row) => {
      const couponId = Number(row.coupon_id);
      if (!Number.isFinite(couponId)) return false;

      const currentCoupon = couponById.get(couponId);
      if (!currentCoupon) return true;

      const currentTitle = String(currentCoupon.title ?? '').trim();
      const currentEndDate = String(currentCoupon.end_date ?? '').trim();

      return !currentTitle || currentTitle.startsWith(`Cupón #${couponId}`) || !currentEndDate;
    });
    if (rowsNeedingEnrichment.length === 0) return;

    const uniqueCodes = Array.from(
      new Set(
        rowsNeedingEnrichment
          .map((row) => (row.unique_code ?? '').trim())
          .filter((code) => !!code)
      )
    );
    if (uniqueCodes.length === 0) return;

    const snapshots = await Promise.all(
      uniqueCodes.map(async (uniqueCode) => {
        try {
          return await firstValueFrom(
            this.couponService.getCouponWithImageByCode(token, uniqueCode).pipe(take(1), timeout(10000))
          );
        } catch (error) {
          return null;
        }
      })
    );

    const snapshotByCode = new Map<string, NonNullable<(typeof snapshots)[number]>>();
    snapshots.forEach((snapshot) => {
      const key = (snapshot?.unique_code ?? '').trim();
      if (!snapshot || !key) return;
      snapshotByCode.set(key, snapshot);
    });

    let enrichedCoupons = 0;
    let enrichedCouponsWithTitle = 0;
    let enrichedCouponsWithEndDate = 0;
    let updatedExistingCoupons = 0;
    let updatedExistingCouponsWithTitle = 0;
    let updatedExistingCouponsWithEndDate = 0;

    rowsNeedingEnrichment.forEach((row) => {
      const uniqueCode = (row.unique_code ?? '').trim();
      const snapshot = snapshotByCode.get(uniqueCode);
      if (!snapshot) return;

      const snapshotCoupon = snapshot.coupon ?? null;
      const snapshotImageCoupon = snapshot.coupon_with_image_base64 ?? null;
      const snapshotCouponId = Number(snapshot.coupon?.id ?? snapshot.coupon_with_image_base64?.id ?? row.coupon_id);
      const couponId = Number.isFinite(snapshotCouponId) ? snapshotCouponId : Number(row.coupon_id);
      if (!Number.isFinite(couponId)) return;

      if (!row.userPublicByValidatedBy && snapshot.userPublicByValidatedBy) {
        row.userPublicByValidatedBy = snapshot.userPublicByValidatedBy;
      }

      const snapshotTitle = String(snapshotCoupon?.title ?? snapshotImageCoupon?.title ?? row.coupon?.title ?? '').trim();
      const snapshotDescription = snapshotCoupon?.description ?? snapshotImageCoupon?.description ?? row.coupon?.description ?? null;
      const snapshotPrice = snapshotCoupon?.price ?? snapshotImageCoupon?.price ?? null;
      const snapshotPriceDiscount = snapshotCoupon?.price_discount ?? snapshotImageCoupon?.price_discount ?? row.coupon?.price_discount ?? null;
      const snapshotStartDate = snapshotCoupon?.start_date ?? snapshotImageCoupon?.start_date ?? '';
      const snapshotEndDate = snapshotCoupon?.end_date ?? snapshotImageCoupon?.end_date ?? row.coupon?.end_date ?? '';
      const snapshotCategoryId = Number(snapshotCoupon?.category_id ?? 0);
      const snapshotUserPublic = snapshotCoupon?.user_public
        ? {
            id: snapshotCoupon.user_public.id ?? String(snapshotCoupon.user_id ?? couponId),
            company_commercial_name: snapshotCoupon.user_public.company_commercial_name ?? null,
            company_address: snapshotCoupon.user_public.company_address ?? null,
            company_map_url: snapshotCoupon.user_public.company_map_url ?? null,
          }
        : this.getCompanySnapshotFromAcquired(row);
      const snapshotUserPublicForCoupon = snapshotUserPublic
        ? {
            id: snapshotUserPublic.id ?? String(snapshotCoupon?.user_id ?? row.user_id ?? couponId),
            company_commercial_name: snapshotUserPublic.company_commercial_name ?? null,
            company_address: snapshotUserPublic.company_address ?? null,
            company_map_url: snapshotUserPublic.company_map_url ?? null,
          }
        : null;

      if (!row.coupon && (snapshotCoupon || snapshotImageCoupon)) {
        row.coupon = {
          id: snapshotCoupon?.id ?? snapshotImageCoupon?.id ?? couponId,
          title: snapshotTitle || null,
          description: snapshotDescription,
          price_discount: snapshotPriceDiscount,
          end_date: snapshotEndDate || null,
          user_public: snapshotUserPublicForCoupon,
        };
      }

      const existingCoupon = couponById.get(couponId);
      if (existingCoupon) {
        const currentTitle = String(existingCoupon.title ?? '').trim();
        const currentEndDate = String(existingCoupon.end_date ?? '').trim();
        const shouldReplaceTitle = !!snapshotTitle && (!currentTitle || currentTitle.startsWith(`Cupón #${couponId}`));
        const shouldReplaceEndDate = !!snapshotEndDate && !currentEndDate;
        const shouldReplaceStartDate = !!snapshotStartDate && !String(existingCoupon.start_date ?? '').trim();
        const shouldReplaceDescription = snapshotDescription != null && existingCoupon.description == null;
        const shouldReplacePrice = snapshotPrice != null && existingCoupon.price == null;
        const shouldReplacePriceDiscount = snapshotPriceDiscount != null && existingCoupon.price_discount == null;
        const shouldReplaceCompany = snapshotUserPublicForCoupon != null && !this.hasCompanyData(existingCoupon.user_public ?? null);

        if (
          shouldReplaceTitle ||
          shouldReplaceEndDate ||
          shouldReplaceStartDate ||
          shouldReplaceDescription ||
          shouldReplacePrice ||
          shouldReplacePriceDiscount ||
          shouldReplaceCompany
        ) {
          couponById.set(couponId, {
            ...existingCoupon,
            title: shouldReplaceTitle ? snapshotTitle : existingCoupon.title,
            end_date: shouldReplaceEndDate ? snapshotEndDate : existingCoupon.end_date,
            start_date: shouldReplaceStartDate ? snapshotStartDate : existingCoupon.start_date,
            description: shouldReplaceDescription ? snapshotDescription : existingCoupon.description,
            price: shouldReplacePrice ? String(snapshotPrice) : existingCoupon.price,
            price_discount: shouldReplacePriceDiscount
              ? String(snapshotPriceDiscount)
              : existingCoupon.price_discount,
            user_public: shouldReplaceCompany ? snapshotUserPublicForCoupon : existingCoupon.user_public,
          });
          updatedExistingCoupons += 1;
          if (shouldReplaceTitle) updatedExistingCouponsWithTitle += 1;
          if (shouldReplaceEndDate) updatedExistingCouponsWithEndDate += 1;
        }
        return;
      }

      if (!existingCoupon) {
        const title = snapshotTitle || `Cupón #${couponId}`;

        couponById.set(couponId, {
          id: couponId,
          user_id: snapshotCoupon?.user_id ?? row.user_id,
          category_id: Number.isFinite(snapshotCategoryId) ? snapshotCategoryId : 0,
          auto_published: false,
          published: true,
          active: snapshotCoupon?.active ?? false,
          title,
          end_date: snapshotEndDate || '',
          start_date: snapshotStartDate || '',
          stock_available: null,
          stock_total: null,
          price: snapshotPrice != null ? String(snapshotPrice) : null,
          price_discount:
            snapshotPriceDiscount != null
              ? String(snapshotPriceDiscount)
              : row.coupon?.price_discount != null
                ? String(row.coupon.price_discount)
                : null,
          description: snapshotDescription,
          terms: null,
          created_at: row.acquired_at,
          updated_at: row.acquired_at,
          user_public: snapshotUserPublicForCoupon,
        });
        enrichedCoupons += 1;
        if (snapshotTitle) enrichedCouponsWithTitle += 1;
        if (snapshotEndDate) enrichedCouponsWithEndDate += 1;
      }
    });

  }

  private async enrichMissingCouponsFromPublicImageSnapshots(
    targetCouponIds: number[],
    acquiredRows: CouponAcquired[],
    couponById: Map<number, Coupon>
  ): Promise<void> {
    const uniqueCouponIds = Array.from(new Set(targetCouponIds.filter((id) => Number.isFinite(id))));
    if (uniqueCouponIds.length === 0) return;

    let snapshots: Array<{
      id: number | string;
      title?: string | null;
      description?: string | null;
      price?: string | number | null;
      price_discount?: string | number | null;
      start_date?: string | null;
      end_date?: string | null;
      user?: {
        company_commercial_name?: string | null;
        company_address?: string | null;
        company_map_url?: string | null;
      } | null;
    }> = [];

    try {
      snapshots = await firstValueFrom(
        this.couponService.getPublicCouponImageSnapshotsByIds(uniqueCouponIds).pipe(take(1), timeout(10000))
      );
    } catch (error) {
      return;
    }

    let updatedCoupons = 0;
    let couponsWithCompany = 0;
    let couponsWithTitle = 0;

    snapshots.forEach((snapshot) => {
      const couponId = Number(snapshot.id);
      if (!Number.isFinite(couponId)) return;

      const acquired = acquiredRows.find((row) => Number(row.coupon_id) === couponId);
      const existing = couponById.get(couponId);
      const currentTitle = (existing?.title ?? '').trim();
      const snapshotTitle = String(snapshot.title ?? '').trim();
      const shouldUseSnapshotTitle = !!snapshotTitle && (!currentTitle || currentTitle.startsWith(`Cupón #${couponId}`));

      const snapshotUser = snapshot.user ?? null;
      const hasSnapshotCompany = !!(
        snapshotUser?.company_commercial_name ||
        snapshotUser?.company_address ||
        snapshotUser?.company_map_url
      );

      const snapshotUserPublic = hasSnapshotCompany
        ? {
            id: existing?.user_public?.id ?? `public-image-${couponId}`,
            company_commercial_name: snapshotUser?.company_commercial_name ?? null,
            company_address: snapshotUser?.company_address ?? null,
            company_map_url: snapshotUser?.company_map_url ?? null,
          }
        : null;

      if (existing) {
        const hasExistingCompany = this.hasCompanyData(existing.user_public ?? null);
        const mergedUserPublic = hasExistingCompany
          ? existing.user_public ?? null
          : snapshotUserPublic ?? existing.user_public ?? null;

        couponById.set(couponId, {
          ...existing,
          title: shouldUseSnapshotTitle ? snapshotTitle : existing.title,
          description: existing.description ?? snapshot.description ?? null,
          price:
            existing.price ?? (snapshot.price != null ? String(snapshot.price) : null),
          price_discount:
            existing.price_discount ??
            (snapshot.price_discount != null ? String(snapshot.price_discount) : null),
          start_date: existing.start_date || snapshot.start_date || '',
          end_date: existing.end_date || snapshot.end_date || '',
          user_public: mergedUserPublic,
        });
      } else {
        couponById.set(couponId, {
          id: couponId,
          user_id: acquired?.user_id ?? '',
          category_id: 0,
          auto_published: false,
          published: true,
          active: false,
          title: snapshotTitle || acquired?.coupon?.title?.trim() || `Cupón #${couponId}`,
          end_date: snapshot.end_date ?? acquired?.coupon?.end_date ?? '',
          start_date: snapshot.start_date ?? '',
          stock_available: null,
          stock_total: null,
          price: snapshot.price != null ? String(snapshot.price) : null,
          price_discount:
            snapshot.price_discount != null
              ? String(snapshot.price_discount)
              : acquired?.coupon?.price_discount != null
                ? String(acquired.coupon.price_discount)
                : null,
          description: snapshot.description ?? acquired?.coupon?.description ?? null,
          terms: null,
          created_at: acquired?.acquired_at ?? '',
          updated_at: acquired?.acquired_at ?? '',
          user_public: snapshotUserPublic,
        });
      }

      updatedCoupons += 1;
      if (hasSnapshotCompany) couponsWithCompany += 1;
      if (shouldUseSnapshotTitle) couponsWithTitle += 1;
    });

  }

  private async enrichMissingCouponTitlesFromStats(
    token: string,
    targetCouponIds: number[],
    couponById: Map<number, Coupon>
  ): Promise<void> {
    const uniqueCouponIds = Array.from(
      new Set(
        targetCouponIds.filter((couponId) => {
          if (!Number.isFinite(couponId)) return false;
          const coupon = couponById.get(couponId);
          if (!coupon) return true;
          const title = String(coupon.title ?? '').trim();
          return !title || title.startsWith(`Cupón #${couponId}`);
        })
      )
    );

    if (uniqueCouponIds.length === 0) return;

    const statsResults = await Promise.all(
      uniqueCouponIds.map(async (couponId) => {
        try {
          const stats = await firstValueFrom(
            this.couponService.getCouponStatsWithCompany(token, couponId).pipe(take(1), timeout(10000))
          );
          return { couponId, stats };
        } catch (error) {
          return { couponId, stats: null };
        }
      })
    );

    let updatedCoupons = 0;
    let updatedTitles = 0;

    statsResults.forEach(({ couponId, stats }) => {
      const existing = couponById.get(couponId);
      if (!existing || !stats) return;

      const statsTitle = String(stats.title ?? '').trim();
      const currentTitle = String(existing.title ?? '').trim();
      const shouldReplaceTitle = !!statsTitle && (!currentTitle || currentTitle.startsWith(`Cupón #${couponId}`));
      if (!shouldReplaceTitle) return;

      couponById.set(couponId, {
        ...existing,
        title: statsTitle,
      });
      updatedCoupons += 1;
      updatedTitles += 1;
    });

  }

  private hasCompanyData(candidate: {
    company_commercial_name?: string | null;
    company_address?: string | null;
    company_map_url?: string | null;
  } | null | undefined): boolean {
    return !!(
      candidate?.company_commercial_name ||
      candidate?.company_address ||
      candidate?.company_map_url
    );
  }

  private async enrichCompanyDataFromUsersPublic(acquiredRows: CouponAcquired[], couponRows: Coupon[]): Promise<void> {
    const ownerIds = couponRows
      .map((coupon) => this.toUuid(coupon.user_id))
      .filter((id): id is string => !!id);

    const validatedByIds = acquiredRows
      .map((row) => this.toUuid(row.validated_by))
      .filter((id): id is string => !!id);

    const userIds = Array.from(new Set([...ownerIds, ...validatedByIds]));
    if (userIds.length === 0) return;

    let usersPublic: Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      company_commercial_name: string | null;
      company_address: string | null;
      company_map_url: string | null;
    }> = [];

    try {
      usersPublic = await firstValueFrom(
        this.couponService.getUsersPublicByIds(userIds).pipe(take(1), timeout(10000))
      );
    } catch (error) {
      return;
    }

    const companyByUserId = new Map<
      string,
      {
        id: string;
        first_name: string | null;
        last_name: string | null;
        company_commercial_name: string | null;
        company_address: string | null;
        company_map_url: string | null;
      }
    >();

    usersPublic.forEach((row) => {
      const id = this.toUuid(row.id);
      if (!id) return;
      companyByUserId.set(id, row);
    });

    couponRows.forEach((coupon) => {
      const hasCompanyAlready = !!(
        coupon.user_public?.company_commercial_name ||
        coupon.user_public?.company_address ||
        coupon.user_public?.company_map_url
      );
      if (hasCompanyAlready) return;

      const ownerId = this.toUuid(coupon.user_id);
      if (!ownerId) return;

      const ownerPublic = companyByUserId.get(ownerId);
      if (!ownerPublic) return;

      const hasOwnerCompanyData = this.hasCompanyData(ownerPublic);
      if (!hasOwnerCompanyData) return;

      coupon.user_public = {
        id: ownerPublic.id,
        company_commercial_name: ownerPublic.company_commercial_name ?? null,
        company_address: ownerPublic.company_address ?? null,
        company_map_url: ownerPublic.company_map_url ?? null,
      };
    });

    acquiredRows.forEach((row) => {
      const hasValidatorData = !!(
        row.userPublicByValidatedBy?.company_commercial_name ||
        row.userPublicByValidatedBy?.company_address ||
        row.userPublicByValidatedBy?.company_map_url
      );
      if (hasValidatorData) return;

      const validatorId = this.toUuid(row.validated_by);
      if (!validatorId) return;

      const validatorPublic = companyByUserId.get(validatorId);
      if (!validatorPublic) return;

      const hasCompanyData = this.hasCompanyData(validatorPublic);
      if (!hasCompanyData) return;

      row.userPublicByValidatedBy = {
        id: validatorPublic.id,
        first_name: validatorPublic.first_name,
        last_name: validatorPublic.last_name,
        company_commercial_name: validatorPublic.company_commercial_name ?? null,
        company_address: validatorPublic.company_address ?? null,
        company_map_url: validatorPublic.company_map_url ?? null,
      };
    });

  }

  private async enrichCompanyDataFromUniqueCode(
    token: string,
    acquiredRows: CouponAcquired[],
    couponRows: Coupon[]
  ): Promise<void> {
    const couponById = new Map<number, Coupon>();
    couponRows.forEach((coupon) => couponById.set(Number(coupon.id), coupon));

    const uniqueCodes = Array.from(
      new Set(
        acquiredRows
          .filter((row) => {
            const coupon = couponById.get(Number(row.coupon_id));
            const hasCouponCompany = this.hasCompanyData(coupon?.user_public ?? null);
            const hasValidatorCompany = this.hasCompanyData(row.userPublicByValidatedBy ?? null);
            return !hasCouponCompany && !hasValidatorCompany;
          })
          .map((row) => (row.unique_code ?? '').trim())
          .filter((code) => !!code)
      )
    );

    if (uniqueCodes.length === 0) return;

    const snapshots = await Promise.all(
      uniqueCodes.map(async (uniqueCode) => {
        try {
          return await firstValueFrom(
            this.couponService.getCouponWithImageByCode(token, uniqueCode).pipe(take(1), timeout(10000))
          );
        } catch (error) {
          return null;
        }
      })
    );

    let rowsUpdated = 0;

    snapshots.forEach((snapshot) => {
      if (!snapshot) return;

      const uniqueCode = (snapshot.unique_code ?? '').trim();
      if (!uniqueCode) return;

      const validatorCompany = snapshot.userPublicByValidatedBy ?? null;
      if (!this.hasCompanyData(validatorCompany)) return;

      const normalizedValidator = {
        id: validatorCompany?.id ?? String(snapshot.validated_by ?? snapshot.id),
        first_name: validatorCompany?.first_name ?? null,
        last_name: validatorCompany?.last_name ?? null,
        company_commercial_name: validatorCompany?.company_commercial_name ?? null,
        company_address: validatorCompany?.company_address ?? null,
        company_map_url: validatorCompany?.company_map_url ?? null,
      };

      acquiredRows.forEach((row) => {
        if ((row.unique_code ?? '').trim() !== uniqueCode) return;
        if (this.hasCompanyData(row.userPublicByValidatedBy ?? null)) return;
        row.userPublicByValidatedBy = normalizedValidator;
        rowsUpdated += 1;
      });

      const snapshotCouponId = Number(snapshot.coupon_with_image_base64?.id);
      if (Number.isFinite(snapshotCouponId)) {
        const coupon = couponById.get(snapshotCouponId);
        if (coupon && !this.hasCompanyData(coupon.user_public ?? null)) {
          coupon.user_public = {
            id: normalizedValidator.id,
            company_commercial_name: normalizedValidator.company_commercial_name,
            company_address: normalizedValidator.company_address,
            company_map_url: normalizedValidator.company_map_url,
          };
        }
      }
    });

  }

  private async enrichCompanyDataFromCouponOwners(token: string, couponRows: Coupon[]): Promise<void> {
    const couponsMissingCompany = couponRows.filter((coupon) => {
      const userPublic = coupon.user_public;
      return !(
        userPublic?.company_commercial_name ||
        userPublic?.company_address ||
        userPublic?.company_map_url
      );
    });

    if (couponsMissingCompany.length === 0) return;

    const missingCouponIds = couponsMissingCompany.map((coupon) => Number(coupon.id));

    try {
      const publicCompanyRows = await firstValueFrom(
        this.couponService.getPublicCouponCompaniesByIds(missingCouponIds).pipe(take(1), timeout(10000))
      );
      const publicCompanyByCouponId = new Map(
        publicCompanyRows.map((row) => [Number(row.id), row.user_public] as const)
      );

      couponsMissingCompany.forEach((coupon) => {
        const publicCompany = publicCompanyByCouponId.get(Number(coupon.id)) ?? null;
        if (!publicCompany) return;
        const hasCompanyData = !!(
          publicCompany.company_commercial_name ||
          publicCompany.company_address ||
          publicCompany.company_map_url
        );
        if (!hasCompanyData) return;

        const currentUserPublic = coupon.user_public ?? null;
        coupon.user_public = {
          ...(currentUserPublic ?? {}),
          id: currentUserPublic?.id ?? publicCompany.id,
          company_commercial_name:
            currentUserPublic?.company_commercial_name ?? publicCompany.company_commercial_name ?? null,
          company_address: currentUserPublic?.company_address ?? publicCompany.company_address ?? null,
          company_map_url: currentUserPublic?.company_map_url ?? publicCompany.company_map_url ?? null,
        };
      });

    } catch (error) {
    }

    const couponsStillMissingCompany = couponRows.filter((coupon) => {
      const userPublic = coupon.user_public;
      return !(
        userPublic?.company_commercial_name ||
        userPublic?.company_address ||
        userPublic?.company_map_url
      );
    });

    if (couponsStillMissingCompany.length === 0) return;

    const ownerPairs = await Promise.all(
      couponsStillMissingCompany.map(async (coupon) => {
        try {
          const owner = await firstValueFrom(
            this.couponService.getCouponOwner(token, Number(coupon.id)).pipe(take(1), timeout(10000))
          );
          const ownerId = String(owner?.user_id ?? '').trim();
          return ownerId ? { couponId: Number(coupon.id), ownerId } : null;
        } catch (error) {
          return null;
        }
      })
    );

    const validOwnerPairs = ownerPairs.filter(
      (pair): pair is { couponId: number; ownerId: string } => pair !== null
    );
    if (validOwnerPairs.length === 0) return;

    const ownerIds = Array.from(new Set(validOwnerPairs.map((pair) => pair.ownerId)));
    let ownerCouponsRows: Coupon[];
    try {
      const ownerCoupons = await firstValueFrom(
        this.couponService.getCoupons(token, {
          limit: Math.max(60, ownerIds.length * 20),
          offset: 0,
          where: { user_id: { _in: ownerIds } },
          order_by: [{ created_at: 'desc' }],
        }).pipe(take(1), timeout(10000))
      );
      ownerCouponsRows = ownerCoupons.rows ?? [];
    } catch (error) {
      return;
    }

    const companyByOwnerId = new Map<string, Coupon['user_public']>();
    ownerCouponsRows.forEach((row) => {
      const ownerId = String(row.user_id ?? '').trim();
      if (!ownerId) return;

      const userPublic = row.user_public ?? null;
      if (!userPublic) return;
      const hasCompanyData = !!(
        userPublic.company_commercial_name ||
        userPublic.company_address ||
        userPublic.company_map_url
      );
      if (!hasCompanyData) return;
      if (companyByOwnerId.has(ownerId)) return;

      companyByOwnerId.set(ownerId, {
        id: userPublic.id,
        company_commercial_name: userPublic.company_commercial_name ?? null,
        company_address: userPublic.company_address ?? null,
        company_map_url: userPublic.company_map_url ?? null,
      });
    });

    validOwnerPairs.forEach(({ couponId, ownerId }) => {
      const coupon = couponRows.find((row) => Number(row.id) === couponId);
      const ownerCompany = companyByOwnerId.get(ownerId);
      if (!coupon || !ownerCompany) return;

      const currentUserPublic = coupon.user_public ?? null;
      coupon.user_public = {
        ...(currentUserPublic ?? {}),
        id: currentUserPublic?.id ?? ownerCompany.id,
        company_commercial_name:
          currentUserPublic?.company_commercial_name ?? ownerCompany.company_commercial_name ?? null,
        company_address: currentUserPublic?.company_address ?? ownerCompany.company_address ?? null,
        company_map_url: currentUserPublic?.company_map_url ?? ownerCompany.company_map_url ?? null,
      };
    });
  }

  private async loadImagesForCoupons(token: string, rows: Coupon[], extraCouponIds: number[] = []): Promise<void> {
    this.couponImageById.clear();
    if (!token || (rows.length === 0 && extraCouponIds.length === 0)) return;

    const uniqueCouponIds = Array.from(
      new Set(
        [
          ...rows
            .map((coupon) => Number(coupon.id))
            .filter((id) => Number.isFinite(id)),
          ...extraCouponIds.filter((id) => Number.isFinite(id)),
        ]
      )
    );


    try {
      const images = await firstValueFrom(
        this.couponService.getCouponImagesByIds(token, uniqueCouponIds).pipe(take(1), timeout(15000))
      );


      images.forEach((imageData) => {
        if (!imageData?.image_base64) return;
        const couponId = Number(imageData.id);
        if (!Number.isFinite(couponId)) return;

        const mime = this.normalizeMimeType(imageData.image_mime_type);
        const imageUrl = this.toDataUrl(imageData.image_base64, mime || 'image/jpeg');
        this.couponImageById.set(couponId, imageUrl);
      });

      const missingIdsAfterPrivateLoad = uniqueCouponIds.filter((id) => !this.couponImageById.has(id));
      if (missingIdsAfterPrivateLoad.length > 0) {
        try {
          const publicImages = await firstValueFrom(
            this.couponService.getPublicCouponImagesByIds(missingIdsAfterPrivateLoad).pipe(take(1), timeout(12000))
          );
          publicImages.forEach((imageData) => {
            if (!imageData?.image_base64) return;
            const couponId = Number(imageData.id);
            if (!Number.isFinite(couponId)) return;

            const mime = this.normalizeMimeType(imageData.image_mime_type);
            const imageUrl = this.toDataUrl(imageData.image_base64, mime || 'image/jpeg');
            this.couponImageById.set(couponId, imageUrl);
          });

        } catch (error) {
        }
      }

    } catch {
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
