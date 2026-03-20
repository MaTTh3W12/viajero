import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { AuditLog, CouponService } from '../../../service/coupon.service';
import { AuthService } from '../../../service/auth.service';

interface SelectOption {
  label: string;
  value: string;
}

interface AuditTableRow {
  id: number | string;
  dateTime: string;
  eventLabel: string;
  eventBadgeClass: string;
  userLabel: string;
  entityLabel: string;
  raw: AuditLog;
}

@Component({
  selector: 'app-audit-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent],
  templateUrl: './audit-list.component.html',
  styleUrl: './audit-list.component.css',
})
export class AuditListComponent implements OnInit, OnDestroy {
  readonly pageSize = 10;

  readonly actionTypeOptions: SelectOption[] = [
    { label: 'Todos', value: '' },
    { label: 'Registro', value: 'USER_REGISTERED' },
    { label: 'Registro empresa', value: 'COMPANY_REGISTERED' },
    { label: 'Aprobación', value: 'COMPANY_APPROVED' },
    { label: 'Cupón adquirido', value: 'COUPON_ACQUIRED' },
    { label: 'Cupón canjeado', value: 'COUPON_REDEEMED' },
    { label: 'Cupón creado', value: 'COUPON_CREATED' },
    { label: 'Cupón actualizado', value: 'COUPON_UPDATED' },
    { label: 'Desactivación', value: 'COUPON_DELETED' },
  ];

  readonly entityOptions: SelectOption[] = [
    { label: 'Todas', value: '' },
    { label: 'Cupón', value: 'COUPON' },
    { label: 'Empresa', value: 'COMPANY' },
    { label: 'Perfil de usuario', value: 'USER_PROFILE' },
    { label: 'Categoría', value: 'CATEGORY' },
    { label: 'Mensaje', value: 'MESSAGE' },
  ];

  startDate = '';
  endDate = '';
  selectedActionType = '';
  selectedEntity = '';
  userSearch = '';

  loading = false;
  rows: AuditTableRow[] = [];
  totalRows = 0;
  currentPage = 1;
  errorMessage = '';

  selectedRow: AuditTableRow | null = null;
  showDetailsModal = false;

  private auditSub?: Subscription;

  constructor(
    private readonly auth: AuthService,
    private readonly couponService: CouponService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  ngOnDestroy(): void {
    this.auditSub?.unsubscribe();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalRows / this.pageSize));
  }

  get visiblePages(): Array<number | string> {
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }

    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, '...', current - 1, current, current + 1, '...', total];
  }

  get hasRows(): boolean {
    return this.rows.length > 0;
  }

  get selectedDetailsJson(): string {
    const details = this.selectedRow?.raw?.details;

    if (!details) {
      return '{}';
    }

    const trimmed = String(details).trim();

    if (!trimmed) {
      return '{}';
    }

    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return trimmed;
    }
  }

  trackRow(_index: number, row: AuditTableRow): number | string {
    return row.id;
  }

  trackPage(_index: number, page: number | string): string {
    return String(page);
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadAuditLogs();
  }

  goToFirstPage(): void {
    if (this.currentPage === 1) return;
    this.currentPage = 1;
    this.loadAuditLogs();
  }

  goToPreviousPage(): void {
    if (this.currentPage === 1) return;
    this.currentPage -= 1;
    this.loadAuditLogs();
  }

  goToNextPage(): void {
    if (this.currentPage >= this.totalPages) return;
    this.currentPage += 1;
    this.loadAuditLogs();
  }

  goToLastPage(): void {
    if (this.currentPage >= this.totalPages) return;
    this.currentPage = this.totalPages;
    this.loadAuditLogs();
  }

  goToPage(page: number | string): void {
    if (typeof page !== 'number' || page === this.currentPage) return;
    this.currentPage = page;
    this.loadAuditLogs();
  }

  openDetails(row: AuditTableRow): void {
    this.selectedRow = row;
    this.showDetailsModal = true;
  }

  closeDetails(): void {
    this.showDetailsModal = false;
    this.selectedRow = null;
  }

  private loadAuditLogs(): void {
    const token = this.auth.token;
    if (!token) {
      this.rows = [];
      this.totalRows = 0;
      this.errorMessage = 'No se encontró una sesión activa.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.auditSub?.unsubscribe();

    this.auditSub = this.couponService.getAuditLogsDynamic(token, {
      limit: this.pageSize,
      offset: (this.currentPage - 1) * this.pageSize,
      where: this.buildWhere(),
    }).subscribe({
      next: (result) => {
        this.rows = (result.rows ?? []).map((row) => this.mapRow(row));
        this.totalRows = result.total ?? 0;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[AuditList] Error loading audit logs', error);
        this.rows = [];
        this.totalRows = 0;
        this.loading = false;
        this.errorMessage = 'No se pudo cargar la auditoría en este momento.';
        this.cdr.detectChanges();
      },
    });
  }

  private buildWhere(): Record<string, unknown> {
    const andConditions: Record<string, unknown>[] = [];

    const createdAt: Record<string, string> = {};
    if (this.startDate) {
      createdAt['_gte'] = `${this.startDate}T00:00:00Z`;
    }
    if (this.endDate) {
      createdAt['_lte'] = `${this.endDate}T23:59:59Z`;
    }
    if (Object.keys(createdAt).length > 0) {
      andConditions.push({ created_at: createdAt });
    }

    if (this.selectedActionType) {
      andConditions.push({ action_type: { _eq: this.selectedActionType } });
    }

    if (this.selectedEntity) {
      andConditions.push({ entity: { _eq: this.selectedEntity } });
    }

    const search = this.userSearch.trim();
    if (search) {
      andConditions.push({
        user_public: {
          _or: [
            { first_name: { _ilike: `%${search}%` } },
            { last_name: { _ilike: `%${search}%` } },
            { email: { _ilike: `%${search}%` } },
          ],
        },
      });
    }

    return andConditions.length > 0 ? { _and: andConditions } : {};
  }

  private mapRow(row: AuditLog): AuditTableRow {
    return {
      id: row.id,
      dateTime: this.formatDateTime(row.createdAt),
      eventLabel: this.formatActionType(row.actionType),
      eventBadgeClass: this.getEventBadgeClass(row.actionType),
      userLabel: this.buildUserLabel(row),
      entityLabel: this.buildEntityLabel(row),
      raw: row,
    };
  }

  private buildUserLabel(row: AuditLog): string {
    const first = row.userPublic?.firstName?.trim() ?? '';
    const last = row.userPublic?.lastName?.trim() ?? '';
    const fullName = [first, last].filter(Boolean).join(' ').trim();

    return fullName || row.userPublic?.email?.trim() || row.userId || 'Sistema';
  }

  private buildEntityLabel(row: AuditLog): string {
    const details = String(row.details ?? '').trim();
    const entity = String(row.entity ?? '').trim();

    if (!details) {
      return this.formatEntity(entity);
    }

    if (details.startsWith('{') || details.startsWith('[')) {
      return this.formatEntity(entity);
    }

    return details.length > 42 ? `${details.slice(0, 42)}...` : details;
  }

  private formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const datePart = new Intl.DateTimeFormat('es-SV', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);

    const timePart = new Intl.DateTimeFormat('es-SV', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);

    return `${datePart} - ${timePart}`;
  }

  private formatActionType(value: string): string {
    const normalized = String(value ?? '').trim().toUpperCase();
    const labels: Record<string, string> = {
      USER_REGISTERED: 'Registro',
      COMPANY_REGISTERED: 'Registro empresa',
      COMPANY_APPROVED: 'Aprobación',
      COUPON_ACQUIRED: 'Adquisición',
      COUPON_REDEEMED: 'Canje',
      COUPON_CREATED: 'Creación',
      COUPON_UPDATED: 'Actualización',
      COUPON_DELETED: 'Desactivación',
    };

    return labels[normalized] ?? (normalized || 'Evento');
  }

  private getEventBadgeClass(value: string): string {
    const normalized = String(value ?? '').trim().toUpperCase();

    if (normalized === 'COMPANY_APPROVED') {
      return 'bg-[#DDF4DE] text-[#226C34]';
    }

    if (normalized === 'COUPON_DELETED') {
      return 'bg-[#FFDDE2] text-[#D94B67]';
    }

    if (normalized === 'USER_REGISTERED' || normalized === 'COMPANY_REGISTERED') {
      return 'bg-[#D9EBFF] text-[#3E84E7]';
    }

    return 'bg-[#EEF2FF] text-[#4F5F88]';
  }

  private formatEntity(value: string): string {
    const normalized = value.toUpperCase();
    const labels: Record<string, string> = {
      COUPON: 'Cupón',
      COMPANY: 'Empresa',
      USER_PROFILE: 'Perfil de usuario',
      CATEGORY: 'Categoría',
      MESSAGE: 'Mensaje',
    };

    return labels[normalized] ?? (value || 'No disponible');
  }

}
