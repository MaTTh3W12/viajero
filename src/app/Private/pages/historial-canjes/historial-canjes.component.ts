import { AuthService, UserRole } from '../../../service/auth.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { FilterBarComponent, HistorialCanjesFilters } from '../../../shared/dashboard/filter-bar/filter-bar.component';
import { CouponAcquired, CouponService, UserBasic } from '../../../service/coupon.service';
import { Subject, firstValueFrom } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { timeout } from 'rxjs/operators';

type SortKey = 'fechaHora' | 'cuponOferta' | 'usuario' | 'responsableCanje';
type SortDirection = 'asc' | 'desc';

interface HistorialCanjeRow {
  id: number | string;
  fechaHora: string;
  fechaOrden: number;
  cuponOferta: string;
  categoria: string;
  usuario: string;
  responsableCanje: string;
}

@Component({
  selector: 'app-historial-canjes',
  standalone: true,
  imports: [CommonModule, TopbarComponent, FilterBarComponent],
  templateUrl: './historial-canjes.component.html',
  styleUrls: ['./historial-canjes.component.css'],
})
export class HistorialCanjesComponent implements OnInit, OnDestroy {
  private readonly maxTitleLength = 20;
  readonly pageSize = 6;
  private currentRequestId = 0;
  private readonly destroy$ = new Subject<void>();

  role: UserRole;
  currentPage = 1;
  sortKey: SortKey = 'fechaHora';
  sortDirection: SortDirection = 'desc';
  loading = false;
  loadError = '';
  totalItems = 0;

  filters: HistorialCanjesFilters = {
    search: '',
    startDate: '',
    endDate: '',
    responsible: '',
  };

  constructor(
    private auth: AuthService,
    private couponService: CouponService,
    private cdr: ChangeDetectorRef
  ) {
    this.role = this.auth.getRole()!;
  }

  historial: HistorialCanjeRow[] = [];

  ngOnInit(): void {
    if (this.auth.token) {
      void this.loadHistorial();
    }

    setTimeout(() => {
      if (!this.historial.length && !this.loading && !this.loadError) {
        void this.loadHistorial();
      }
    }, 700);

    this.auth.token$
      .pipe(
        takeUntil(this.destroy$),
        filter((token): token is string => !!token)
      )
      .subscribe(() => {
        if (!this.historial.length && !this.loading) {
          void this.loadHistorial();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get sortedHistorial(): HistorialCanjeRow[] {
    const direction = this.sortDirection === 'asc' ? 1 : -1;
    return [...this.historial].sort((a, b) => {
      if (this.sortKey === 'fechaHora') {
        return (a.fechaOrden - b.fechaOrden) * direction;
      }

      const valueA = this.getSortValue(a, this.sortKey);
      const valueB = this.getSortValue(b, this.sortKey);
      return valueA.localeCompare(valueB, 'es', { sensitivity: 'base' }) * direction;
    });
  }

  get pagedHistorial(): HistorialCanjeRow[] {
    return this.sortedHistorial;
  }

  get visiblePages(): number[] {
    const windowSize = 3;
    const halfWindow = Math.floor(windowSize / 2);
    let start = Math.max(1, this.currentPage - halfWindow);
    let end = Math.min(this.totalPages, start + windowSize - 1);

    if (end - start + 1 < windowSize) {
      start = Math.max(1, end - windowSize + 1);
    }

    const pages: number[] = [];
    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }
    return pages;
  }

  get showLeadingEllipsis(): boolean {
    return this.visiblePages.length > 0 && this.visiblePages[0] > 2;
  }

  get showTrailingEllipsis(): boolean {
    return this.visiblePages.length > 0 && this.visiblePages[this.visiblePages.length - 1] < this.totalPages - 1;
  }

  sortBy(column: SortKey): void {
    if (this.sortKey === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = column;
      this.sortDirection = 'asc';
    }

    this.currentPage = 1;

    if (column === 'fechaHora') {
      void this.loadHistorial();
    }
  }

  isSortedBy(column: SortKey): boolean {
    return this.sortKey === column;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    void this.loadHistorial();
  }

  goToFirstPage(): void {
    this.goToPage(1);
  }

  goToLastPage(): void {
    this.goToPage(this.totalPages);
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  onFiltersChange(filters: HistorialCanjesFilters): void {
    this.filters = filters;
    this.currentPage = 1;
    void this.loadHistorial();
  }

  trackPage = (_: number, page: number): number => page;

  truncateTitle(value: unknown): string {
    const title = String(value ?? '').trim();
    if (title.length <= this.maxTitleLength) {
      return title;
    }

    return `${title.slice(0, this.maxTitleLength)}...`;
  }

  getFullTitle(value: unknown): string {
    return String(value ?? '').trim();
  }

  private getSortValue(row: HistorialCanjeRow, key: Exclude<SortKey, 'fechaHora'>): string {
    if (key === 'cuponOferta') return row.cuponOferta;
    if (key === 'usuario') return row.usuario;
    return row.responsableCanje;
  }

  private async loadHistorial(): Promise<void> {
    const token = this.auth.token;
    if (!token) {
      this.historial = [];
      this.totalItems = 0;
      this.loadError = '';
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    const requestId = ++this.currentRequestId;
    this.loading = true;
    this.loadError = '';

    try {
      const result = await firstValueFrom(
        this.couponService.getCouponsAcquired(token, {
          limit: this.pageSize,
          offset: (this.currentPage - 1) * this.pageSize,
          where: this.buildWhere(),
        }).pipe(timeout(15000))
      );

      if (requestId !== this.currentRequestId) return;

      this.totalItems = result.total ?? 0;
      const rows = result.rows ?? [];
      this.historial = rows.map((row) => this.mapToRow(row, {}));
      this.loading = false;
      this.cdr.detectChanges();

      void this.enrichRowsWithUserNames(rows, token, requestId);
      return;
    } catch (error) {
      if (requestId !== this.currentRequestId) return;
      console.error('[HISTORIAL-CANJES] Error cargando historial', error);
      this.historial = [];
      this.totalItems = 0;
      this.loadError = 'No se pudo cargar el historial de canjes.';
      this.cdr.detectChanges();
    } finally {
      if (requestId === this.currentRequestId && this.loading) {
        this.loading = false;
        this.cdr.detectChanges();
      }
    }
  }

  private async enrichRowsWithUserNames(rows: CouponAcquired[], token: string, requestId: number): Promise<void> {
    const userIds = rows
      .flatMap((row) => [String(row.user_id ?? ''), row.validated_by != null ? String(row.validated_by) : ''])
      .filter((id) => !!id);

    if (!userIds.length) {
      return;
    }

    try {
      const users = await firstValueFrom(this.couponService.getUsersBasicByIds(token, userIds).pipe(timeout(10000)));
      if (requestId !== this.currentRequestId) return;

      const usersById = users.reduce<Record<string, UserBasic>>((acc, user) => {
        acc[String(user.id)] = user;
        return acc;
      }, {});

      this.historial = rows.map((row) => this.mapToRow(row, usersById));
      this.cdr.detectChanges();
    } catch {
      return;
    }
  }

  private mapToRow(row: CouponAcquired, usersById: Record<string, UserBasic>): HistorialCanjeRow {
    const dateSource = row.redeemed_at || row.acquired_at;
    const user = usersById[String(row.user_id)] ?? null;
    const validatedBy = row.validated_by != null ? usersById[String(row.validated_by)] ?? null : null;

    const usuario = this.buildUserLabel(user, String(row.user_id));
    const responsableFromRelation = this.buildFullName(row.userByValidatedBy?.first_name, row.userByValidatedBy?.last_name)
      || (row.userByValidatedBy?.email ?? '');
    const responsable =
      responsableFromRelation ||
      (validatedBy ? this.buildUserLabel(validatedBy, String(row.validated_by ?? '')) : '') ||
      (row.validated_by != null ? `Usuario #${this.shortId(String(row.validated_by))}` : 'Sin responsable');

    return {
      id: row.id,
      fechaHora: this.formatDateTime(dateSource),
      fechaOrden: this.toTimestamp(dateSource),
      cuponOferta: row.coupon?.title?.trim() || row.unique_code,
      categoria: row.coupon?.description?.trim() || 'Sin descripción',
      usuario,
      responsableCanje: responsable,
    };
  }

  private buildWhere(): Record<string, unknown> {
    const search = this.filters.search.trim();
    const responsible = this.filters.responsible.trim();
    const searchPattern = `%${search}%`;
    const responsiblePattern = `%${responsible}%`;

    const andFilters: Record<string, unknown>[] = [
      { redeemed: { _eq: true } },
    ];

    if (search) {
      andFilters.push({
        _or: [
          { unique_code: { _ilike: searchPattern } },
          { coupon: { title: { _ilike: searchPattern } } },
        ],
      });
    }

    if (responsible) {
      andFilters.push({
        userByValidatedBy: {
          _or: [
            { first_name: { _ilike: responsiblePattern } },
            { last_name: { _ilike: responsiblePattern } },
          ],
        },
      });
    }

    const acquiredDateFilter = this.buildDateFilter('acquired_at');
    if (acquiredDateFilter) {
      andFilters.push(acquiredDateFilter);
    }

    const redeemedDateFilter = this.buildDateFilter('redeemed_at');
    if (redeemedDateFilter) {
      andFilters.push(redeemedDateFilter);
    }

    return { _and: andFilters };
  }

  private buildDateFilter(field: 'acquired_at' | 'redeemed_at'): Record<string, unknown> | null {
    const startDate = this.filters.startDate;
    const endDate = this.filters.endDate;

    if (!startDate && !endDate) {
      return null;
    }

    const dateRange: Record<string, string> = {};
    if (startDate) {
      dateRange['_gte'] = `${startDate}T00:00:00`;
    }
    if (endDate) {
      dateRange['_lte'] = `${endDate}T23:59:59`;
    }

    return {
      [field]: dateRange,
    };
  }

  private formatDateTime(dateValue: string | null): string {
    if (!dateValue) return 'Sin fecha';

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    const datePart = date.toLocaleDateString('es-SV', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timePart = date.toLocaleTimeString('es-SV', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return `${datePart} - ${timePart}`;
  }

  private toTimestamp(dateValue: string | null): number {
    if (!dateValue) return 0;
    const value = new Date(dateValue).getTime();
    return Number.isNaN(value) ? 0 : value;
  }

  private buildFullName(firstName: string | null | undefined, lastName: string | null | undefined): string {
    const fullName = `${firstName ?? ''} ${lastName ?? ''}`.trim();
    return fullName;
  }

  private buildUserLabel(user: UserBasic | null, id: string): string {
    if (user) {
      const fullName = this.buildFullName(user.first_name, user.last_name);
      if (fullName) return fullName;
      if (user.email) return user.email;
      if (user.company_commercial_name) return user.company_commercial_name;
    }

    const currentUser = this.auth.getCurrentUser();
    if (currentUser?.sub && String(currentUser.sub) === id) {
      const currentFullName = this.buildFullName(currentUser.firstName, currentUser.lastName);
      if (currentFullName) return currentFullName;
      if (currentUser.email) return currentUser.email;
      if (currentUser.username) return currentUser.username;
    }

    return `Usuario #${this.shortId(id)}`;
  }

  private shortId(value: string): string {
    return value.length > 12 ? value.slice(0, 12) : value;
  }
}
