import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  NgZone,
  OnDestroy,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, distinctUntilChanged, firstValueFrom } from 'rxjs';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { DataTableComponent } from '../../../shared/dashboard/data-table/data-table.component';
import { Company } from '../../../service/companies.interface';
import { DataTableConfig } from '../../../service/data-table.model';
import { CouponsMockService } from '../../../service/coupons-mock.service';
import {
  CompaniesFilters,
  FilterBarComponent,
} from '../../../shared/dashboard/filter-bar/filter-bar.component';
import { AuthService, UserRole } from '../../../service/auth.service';
import {
  CompanyListItem,
  GetCompaniesPagedVariables,
  UserProfileService,
} from '../../../service/user-profile.service';
import { CategoryService } from '../../../service/category.service';
import { NotificationService } from '../../../service/notification.service';

type CompanyModalMode = 'approve' | 'reject' | 'deactivate' | 'reactivate';
type CompanyModalPhase = 'form' | 'processing' | 'result';
type CompanyModalResult = 'success' | 'error';

@Component({
  selector: 'app-companies',
  imports: [
    CommonModule,
    TopbarComponent,
    FilterBarComponent,
    DataTableComponent,
  ],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.css',
})
export class CompaniesComponent implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly companyNameMaxLength = 25;
  allCompanies: Company[] = [];
  companies: Company[] = [];
  loadingCompanies = false;
  companiesLoadError = '';
  usingMockData = false;
  currentPage = 1;
  readonly pageSize = 10;
  totalCompanies = 0;
  companyCategories: string[] = [];
  private readonly defaultOrderBy: Array<Record<string, 'asc' | 'desc'>> = [{ created_at: 'desc' }];
  private readonly companyRoleCandidates = ['COMPANY', 'company', 'Company', 'EMPRESA', 'empresa'];
  private companiesRequestSub: Subscription | null = null;
  private initialRetryTimeout: ReturnType<typeof setTimeout> | null = null;
  private initialApiLoadSettled = false;
  private initialAutoRetryDone = false;
  private loadedCategoryCatalogToken: string | null = null;
  private categoryIdByNormalizedName = new Map<string, number>();
  private categoryNameById = new Map<number, string>();
  private activeFilters: CompaniesFilters = {
    search: '',
    status: 'all',
    category: 'all',
  };
  approvalModalOpen = false;
  approvingCompany = false;
  approvalModalError = '';
  approvalTarget: Company | null = null;
  approvalModalMode: CompanyModalMode = 'approve';
  approvalModalPhase: CompanyModalPhase = 'form';
  approvalModalResult: CompanyModalResult = 'success';
  approvalResultTitle = '';
  approvalResultMessage = '';
  approvalReason = '';

  tableConfig: DataTableConfig<Company> = {
    columns: [
      {
        key: 'empresa',
        label: 'Empresa',
        render: (value) => this.truncateCompanyName(value),
        tooltip: (value) => this.getCompanyNameTooltip(value),
      },
      { key: 'categoria', label: 'Categoría' },
      { key: 'coreo', label: 'Contacto' },
      { key: 'estado', label: 'Estado', type: 'badge' },
    ],
    actions: [
      {
        iconId: 'tick-square',
        bgClass: 'bg-[#E6EEFF] text-[#538CFF]',
        show: (row) => row.estado === 'Pendiente',
        action: (row) => this.openApprovalModal(row),
      },
      {
        iconId: 'close-circle',
        bgClass: 'bg-[#E6EEFF] text-[#1A2440]',
        show: (row) => row.estado === 'Activa',
        action: (row) => this.openDeactivateModal(row),
      },
      {
        iconId: 'tick-square',
        bgClass: 'bg-[#E4F6EA] text-[#0D7D3E]',
        show: (row) => row.estado === 'No activa',
        action: (row) => this.openReactivateModal(row),
      },
    ],
  };

  constructor(
    private service: CouponsMockService,
    private auth: AuthService,
    private profileService: UserProfileService,
    private categoryService: CategoryService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.auth.token$
      .pipe(
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((token) => {
        this.handleAuthTokenChange(token);
      });
  }

  ngOnDestroy(): void {
    this.cancelCompaniesRequest();
    this.clearInitialRetryTimeout();
  }

  onCompaniesFilterChange(filters: CompaniesFilters): void {
    this.activeFilters = filters;
    this.currentPage = 1;
    this.loadCompaniesForCurrentMode();
  }

  get approvalLocationLabel(): string {
    if (!this.approvalTarget) return '-';
    const parts = [this.approvalTarget.city, this.approvalTarget.country]
      .map((value) => String(value ?? '').trim())
      .filter(Boolean);
    return parts.length ? parts.join(', ') : 'No especificada';
  }

  get approvalWebLabel(): string {
    if (!this.approvalTarget) return '-';
    const email = String(this.approvalTarget.coreo ?? '').trim();
    const domain = email.split('@')[1]?.trim();
    return domain || '-';
  }

  get approvalReasonRequired(): boolean {
    return this.approvalModalMode === 'reject' || this.approvalModalMode === 'deactivate';
  }

  get approvalReasonLabel(): string {
    if (this.approvalModalMode === 'deactivate') {
      return 'Motivo u observaciones (Requerido para desactivar)';
    }
    return 'Motivo u observaciones (Requerido para rechazar)';
  }

  get approvalConfirmLabel(): string {
    if (this.approvalModalMode === 'approve') return 'Aprobar';
    if (this.approvalModalMode === 'reject') return 'Confirmar rechazo';
    if (this.approvalModalMode === 'deactivate') return 'Desactivar';
    return 'Reactivar';
  }

  get approvalConfirmButtonClass(): string {
    if (this.approvalModalMode === 'reactivate') {
      return 'h-11 min-w-[130px] px-6 rounded-full bg-[#0D7D3E] text-white transition hover:bg-[#0A6934] disabled:opacity-60';
    }

    if (this.approvalModalMode === 'approve') {
      return 'h-11 min-w-[130px] px-6 rounded-full bg-[#538CFF] text-white transition hover:bg-[#3F7BFF] disabled:opacity-60';
    }

    return 'h-11 min-w-[130px] px-6 rounded-full bg-[#EF1845] text-white transition hover:bg-[#D8123D] disabled:opacity-60';
  }

  get canConfirmCompanyAction(): boolean {
    if (this.approvalModalPhase !== 'form') return false;
    if (this.approvingCompany) return false;
    if (!this.approvalReasonRequired) return true;
    return this.approvalReason.trim().length > 0;
  }

  get approvalResultIconId(): string {
    if (this.approvalModalResult === 'error') return 'close-circle';
    return this.approvalModalMode === 'reject' || this.approvalModalMode === 'deactivate'
      ? 'close-circle'
      : 'check-circle';
  }

  get approvalResultIconClass(): string {
    if (this.approvalModalResult === 'error') return 'text-[#EF1845]';
    return this.approvalModalMode === 'reject' || this.approvalModalMode === 'deactivate'
      ? 'text-[#EF1845]'
      : 'text-[#0D7D3E]';
  }

  get role(): UserRole {
    return this.auth.getRole() ?? 'usuario';
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCompanies / this.pageSize));
  }

  get visiblePages(): number[] {
    const totalPages = this.totalPages;
    const windowSize = 5;

    if (totalPages <= windowSize) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const halfWindow = Math.floor(windowSize / 2);
    let start = Math.max(1, this.currentPage - halfWindow);
    let end = Math.min(totalPages, start + windowSize - 1);

    if (end - start + 1 < windowSize) {
      start = Math.max(1, end - windowSize + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.loadCompaniesForCurrentMode();
  }

  goToFirstPage(): void {
    this.goToPage(1);
  }

  goToPreviousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  goToNextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  goToLastPage(): void {
    this.goToPage(this.totalPages);
  }

  truncateCompanyName(value: unknown): string {
    const normalized = String(value ?? '').trim();
    if (!normalized) return '-';
    if (normalized.length <= this.companyNameMaxLength) return normalized;
    return `${normalized.slice(0, this.companyNameMaxLength).trimEnd()}...`;
  }

  getCompanyNameTooltip(value: unknown): string | null {
    const normalized = String(value ?? '').trim();
    if (!normalized || normalized.length <= this.companyNameMaxLength) return null;
    return normalized;
  }

  private loadCompaniesForCurrentMode(): void {
    const token = this.auth.token;
    if (token) {
      this.ensureCategoryCatalogLoaded(token);
      this.loadCompaniesFromApi(token);
      return;
    }

    if (!this.allCompanies.length) {
      this.loadCompaniesFromMock();
      return;
    }

    this.refreshVisibleCompanies();
  }

  private loadCompaniesFromApi(token: string): void {
    this.cancelCompaniesRequest();
    this.clearInitialRetryTimeout();
    this.loadingCompanies = true;
    this.companiesLoadError = '';

    const variables = this.buildCompaniesVariables();
    this.scheduleInitialAutoRetry(token);

    this.companiesRequestSub = this.profileService.getCompaniesPaged(token, variables).subscribe({
      next: (result) => {
        this.ngZone.run(() => {
          this.usingMockData = false;
          this.totalCompanies = result.total;
          this.initialApiLoadSettled = true;
          this.clearInitialRetryTimeout();

          if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
            this.loadCompaniesFromApi(token);
            return;
          }

          this.companies = (result.rows ?? []).map((row, index) =>
            this.mapApiCompanyRow(row, variables.offset + index)
          );

          if (!this.companyCategories.length) {
            this.companyCategories = this.resolveCompanyCategories(this.companies);
          }

          this.loadingCompanies = false;
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('[COMPANIES] Error cargando empresas desde API', error);
          this.companiesLoadError =
            'No se pudo obtener el listado desde API. Mostrando datos locales como respaldo.';
          this.initialApiLoadSettled = true;
          this.clearInitialRetryTimeout();
          this.loadingCompanies = false;
          this.loadCompaniesFromMock();
          this.cdr.detectChanges();
        });
      },
    });
  }

  private handleAuthTokenChange(token: string | null): void {
    this.cancelCompaniesRequest();
    this.clearInitialRetryTimeout();

    if (!token) {
      this.initialApiLoadSettled = true;
      this.initialAutoRetryDone = true;
      this.loadCompaniesFromMock();
      return;
    }

    this.initialApiLoadSettled = false;
    this.initialAutoRetryDone = false;
    this.ensureCategoryCatalogLoaded(token);
    this.loadCompaniesFromApi(token);
  }

  private scheduleInitialAutoRetry(token: string): void {
    if (this.initialApiLoadSettled) return;
    if (this.initialAutoRetryDone) return;

    this.initialRetryTimeout = setTimeout(() => {
      if (!this.loadingCompanies) return;
      if (this.initialApiLoadSettled) return;
      if (this.initialAutoRetryDone) return;

      this.initialAutoRetryDone = true;
      this.loadCompaniesFromApi(token);
    }, 1200);
  }

  private cancelCompaniesRequest(): void {
    if (!this.companiesRequestSub) return;
    this.companiesRequestSub.unsubscribe();
    this.companiesRequestSub = null;
  }

  private clearInitialRetryTimeout(): void {
    if (!this.initialRetryTimeout) return;
    clearTimeout(this.initialRetryTimeout);
    this.initialRetryTimeout = null;
  }

  private ensureCategoryCatalogLoaded(token: string): void {
    if (this.loadedCategoryCatalogToken === token) return;
    this.loadedCategoryCatalogToken = token;
    void this.loadCategoryCatalog(token);
  }

  private loadCompaniesFromMock(): void {
    this.usingMockData = true;

    this.service.getCompanies().subscribe((data) => {
      this.ngZone.run(() => {
        this.allCompanies = data;

        if (!this.companyCategories.length) {
          this.companyCategories = this.resolveCompanyCategories(data);
        }

        this.refreshVisibleCompanies();
        this.cdr.detectChanges();
      });
    });
  }

  private async loadCategoryCatalog(token: string): Promise<void> {
    try {
      const categories = await firstValueFrom(this.categoryService.getCategories(token));
      const mapped = (categories ?? [])
        .map((category) => ({
          id: Number(category.id),
          name: String(category.name ?? '').trim(),
        }))
        .filter((category) => Number.isFinite(category.id) && category.name.length > 0);

      this.categoryNameById = new Map(mapped.map((category) => [category.id, category.name]));
      this.categoryIdByNormalizedName = new Map(
        mapped.map((category) => [this.normalizeSearchTerm(category.name), category.id])
      );

      const names = mapped.map((category) => category.name);
      this.companyCategories = Array.from(new Set(names)).sort((a, b) =>
        a.localeCompare(b, 'es', { sensitivity: 'base' })
      );
    } catch (error) {
      console.error('[COMPANIES] No se pudieron cargar categorías para filtros', error);
    }
  }

  private refreshVisibleCompanies(): void {
    const filteredCompanies = this.applyFilters(this.allCompanies);
    this.totalCompanies = filteredCompanies.length;

    const safeCurrentPage = Math.min(this.currentPage, this.totalPages);
    this.currentPage = Math.max(1, safeCurrentPage);

    const start = (this.currentPage - 1) * this.pageSize;
    this.companies = filteredCompanies.slice(start, start + this.pageSize);
  }

  private applyFilters(rows: Company[]): Company[] {
    const search = this.normalizeSearchTerm(this.activeFilters.search);
    const selectedCategory = this.normalizeSearchTerm(this.activeFilters.category);

    return rows.filter((company) => {
      const matchesStatus =
        this.activeFilters.status === 'all' || company.estado === this.activeFilters.status;

      const matchesCategory =
        selectedCategory === 'all' ||
        this.normalizeSearchTerm(company.categoria) === selectedCategory;

      const matchesSearch =
        !search ||
        this.normalizeSearchTerm(company.empresa).includes(search) ||
        this.normalizeSearchTerm(company.documentoLegal).includes(search) ||
        this.normalizeSearchTerm(company.coreo).includes(search);

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }

  private buildCompaniesVariables(): GetCompaniesPagedVariables {
    return {
      limit: this.pageSize,
      offset: (this.currentPage - 1) * this.pageSize,
      where: this.buildCompaniesWhere(),
      order_by: this.defaultOrderBy,
    };
  }

  private buildCompaniesWhere(): Record<string, unknown> {
    const conditions: Record<string, unknown>[] = [this.buildCompanyScopeWhere()];
    const search = this.activeFilters.search.trim();

    if (search.length > 0) {
      const searchPattern = `%${search}%`;
      conditions.push({
        _or: [
          { company_commercial_name: { _ilike: searchPattern } },
          { company_nit: { _ilike: searchPattern } },
        ],
      });
    }

    const statusCondition = this.buildStatusWhereCondition();
    if (statusCondition) {
      conditions.push(statusCondition);
    }

    const categoryCondition = this.buildCategoryWhereCondition();
    if (categoryCondition) {
      conditions.push(categoryCondition);
    }

    return { _and: conditions };
  }

  private buildCompanyScopeWhere(): Record<string, unknown> {
    return {
      _or: [
        { role: { _in: this.companyRoleCandidates } },
        { company_profile_completed: { _eq: true } },
        { company_commercial_name: { _is_null: false } },
        { company_nit: { _is_null: false } },
        { company_email: { _is_null: false } },
      ],
    };
  }

  private buildStatusWhereCondition(): Record<string, unknown> | null {
    if (this.activeFilters.status === 'all') return null;

    if (this.activeFilters.status === 'Activa') {
      return { active: { _eq: true } };
    }

    if (this.activeFilters.status === 'No activa') {
      return {
        _and: [
          { active: { _eq: false } },
          this.buildProfileNotCompletedWhere(),
        ],
      };
    }

    // Pendiente: empresa no activa con perfil completo.
    return {
      _and: [
        { active: { _eq: false } },
        { company_profile_completed: { _eq: true } },
      ],
    };
  }

  private buildProfileNotCompletedWhere(): Record<string, unknown> {
    return {
      _or: [
        { company_profile_completed: { _eq: false } },
        { company_profile_completed: { _is_null: true } },
      ],
    };
  }

  private buildCategoryWhereCondition(): Record<string, unknown> | null {
    if (this.activeFilters.category === 'all') return null;

    const normalizedCategory = this.normalizeSearchTerm(this.activeFilters.category);
    const categoryId = this.categoryIdByNormalizedName.get(normalizedCategory);
    if (!Number.isFinite(categoryId)) return null;

    return { company_category: { _eq: categoryId } };
  }

  private mapApiCompanyRow(row: CompanyListItem, fallbackId: number): Company {
    return {
      id: this.resolveNumericId(row.id, fallbackId),
      userId: row.id,
      empresa: this.buildCompanyName(row),
      documentoLegal: row.companyNit?.trim() || '-',
      coreo: row.companyEmail?.trim() || row.email?.trim() || '-',
      categoria: this.resolveCategoryLabel(row),
      estado: this.resolveCompanyStatus(row),
      telefono: row.companyPhone ?? null,
      city: row.city ?? null,
      country: row.countryRef?.name ?? row.country ?? null,
      active: row.active,
      companyProfileCompleted: row.companyProfileCompleted,
      companyCategoryId: row.companyCategoryId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      statusRaw: row.statusValue,
    };
  }

  private resolveNumericId(value: number | string, fallbackId: number): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallbackId + 1;
  }

  private buildCompanyName(row: CompanyListItem): string {
    const commercialName = row.companyCommercialName?.trim();
    if (commercialName) return commercialName;

    const representativeName = `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim();
    if (representativeName) return representativeName;

    return row.email?.trim() || 'Empresa sin nombre';
  }

  private resolveCategoryLabel(row: CompanyListItem): string {
    if (row.companyCategoryId != null) {
      const categoryName = this.categoryNameById.get(row.companyCategoryId);
      if (categoryName) return categoryName;
      return `Categoría #${row.companyCategoryId}`;
    }

    return 'Sin categoría';
  }

  private resolveCompanyStatus(row: CompanyListItem): string {
    // Mantener consistencia con filtros: primero reglas explícitas por campos base.
    if (row.active === true) return 'Activa';
    if (row.active === false && row.companyProfileCompleted === true) return 'Pendiente';
    if (row.active === false) return 'No activa';

    const normalizedStatus = this.normalizeSearchTerm(row.statusValue);

    if (
      normalizedStatus.includes('activ') ||
      normalizedStatus.includes('aprobad') ||
      normalizedStatus === 'approved' ||
      normalizedStatus === 'active'
    ) {
      return 'Activa';
    }

    if (
      normalizedStatus.includes('pend') ||
      normalizedStatus.includes('review') ||
      normalizedStatus.includes('waiting')
    ) {
      return 'Pendiente';
    }

    if (
      normalizedStatus.includes('inactiv') ||
      normalizedStatus.includes('rechaz') ||
      normalizedStatus.includes('suspend') ||
      normalizedStatus.includes('bloque')
    ) {
      return 'No activa';
    }

    return 'Pendiente';
  }

  private resolveCompanyCategories(rows: Company[]): string[] {
    const categories = rows
      .map((company) => company.categoria?.trim())
      .filter((category): category is string => !!category);

    return Array.from(new Set(categories)).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );
  }

  private normalizeSearchTerm(value: string | null | undefined): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  openApprovalModal(company: Company): void {
    this.openCompanyActionModal('approve', company);
  }

  openPendingRejectionModal(company: Company): void {
    this.openCompanyActionModal('reject', company);
  }

  openDeactivateModal(company: Company): void {
    this.openCompanyActionModal('deactivate', company);
  }

  openReactivateModal(company: Company): void {
    this.openCompanyActionModal('reactivate', company);
  }

  closeApprovalModal(): void {
    if (this.approvalModalPhase === 'processing') return;
    this.approvalModalOpen = false;
    this.resetApprovalModalState();
  }

  approveSelectedCompany(): void {
    this.approvalModalMode = 'approve';
    this.confirmCurrentCompanyAction();
  }

  confirmCurrentCompanyAction(): void {
    const target = this.approvalTarget;
    if (!target) return;

    if (this.approvalReasonRequired && !this.approvalReason.trim()) {
      this.approvalModalError = 'Debes ingresar un motivo para continuar.';
      return;
    }

    const targetId = target.userId ?? target.id;
    if (targetId == null || String(targetId).trim().length === 0) {
      this.approvalModalError = 'No se encontró el identificador de la empresa.';
      return;
    }

    const actionMode = this.approvalModalMode;
    this.approvingCompany = true;
    this.approvalModalError = '';
    this.approvalModalPhase = 'processing';

    const token = this.auth.token;
    if (!token) {
      this.applyCompanyActionLocally(target, actionMode);
      this.approvingCompany = false;
      this.showCompanyActionResult('success', actionMode);
      this.refreshVisibleCompanies();
      this.cdr.detectChanges();
      return;
    }

    this.runCompanyActionRequest(token, targetId, actionMode, this.approvalReason.trim()).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.applyCompanyActionLocally(target, actionMode);
          this.approvingCompany = false;
          this.showCompanyActionResult('success', actionMode);
          this.sendCompanyActionNotification(token, target, actionMode);
          this.loadCompaniesForCurrentMode();
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('[COMPANIES] Error ejecutando acción de empresa', error);
          this.approvingCompany = false;
          this.showCompanyActionResult('error', actionMode);
          this.cdr.detectChanges();
        });
      },
    });
  }

  rejectFromApprovalModal(): void {
    if (this.approvalModalMode === 'approve') {
      this.approvalModalMode = 'reject';
      this.approvalModalError = '';
      if (!this.approvalReason.trim()) {
        this.approvalReason = 'No cumple requisitos';
      }
      return;
    }

    this.confirmCurrentCompanyAction();
  }

  acceptCompanyActionResult(): void {
    if (this.approvalModalPhase === 'processing') return;
    this.closeApprovalModal();
  }

  private openCompanyActionModal(mode: CompanyModalMode, company: Company): void {
    this.approvalTarget = company;
    this.approvalModalMode = mode;
    this.approvalModalPhase = 'form';
    this.approvalModalResult = 'success';
    this.approvalResultTitle = '';
    this.approvalResultMessage = '';
    this.approvalModalError = '';
    this.approvingCompany = false;
    this.approvalReason =
      mode === 'reject' || mode === 'deactivate' ? 'No cumple requisitos' : '';
    this.approvalModalOpen = true;
  }

  private runCompanyActionRequest(
    token: string,
    targetId: string | number,
    mode: CompanyModalMode,
    reason: string
  ) {
    if (mode === 'approve') {
      return this.profileService.approveCompany(token, targetId);
    }

    if (mode === 'reject') {
      return this.profileService.rejectCompany(token, targetId, reason);
    }

    if (mode === 'deactivate') {
      return this.profileService.deactivateCompany(token, targetId, reason);
    }

    return this.profileService.reactivateCompany(token, targetId);
  }

  private showCompanyActionResult(result: CompanyModalResult, mode: CompanyModalMode): void {
    this.approvalModalResult = result;
    this.approvalModalPhase = 'result';

    if (result === 'error') {
      this.approvalResultTitle = 'No se pudo completar la solicitud.';
      this.approvalResultMessage = 'Intenta nuevamente en unos segundos.';
      return;
    }

    if (mode === 'approve') {
      this.approvalResultTitle = 'Solicitud aprobada.';
      this.approvalResultMessage = 'Notificación enviada a la empresa.';
      return;
    }

    if (mode === 'reject') {
      this.approvalResultTitle = 'Solicitud rechazada.';
      this.approvalResultMessage = 'Notificación enviada a la empresa.';
      return;
    }

    if (mode === 'deactivate') {
      this.approvalResultTitle = 'Empresa desactivada.';
      this.approvalResultMessage = 'La empresa no podrá acceder ni publicar cupones.';
      return;
    }

    this.approvalResultTitle = 'Empresa reactivada.';
    this.approvalResultMessage = 'La empresa vuelve a tener acceso a la plataforma.';
  }

  private applyCompanyActionLocally(target: Company, mode: CompanyModalMode): void {
    const patch = (item: Company): Company => {
      if (!this.isSameCompany(item, target)) return item;

      if (mode === 'approve' || mode === 'reactivate') {
        return {
          ...item,
          active: true,
          companyProfileCompleted: true,
          estado: 'Activa',
          statusRaw: mode === 'approve' ? 'approved' : 'reactivated',
        };
      }

      return {
        ...item,
        active: false,
        companyProfileCompleted: false,
        estado: 'No activa',
        statusRaw: mode === 'reject' ? 'rejected' : 'deactivated',
      };
    };

    this.allCompanies = this.allCompanies.map(patch);
    this.companies = this.companies.map(patch);
  }

  private resetApprovalModalState(): void {
    this.approvalModalError = '';
    this.approvalTarget = null;
    this.approvalModalMode = 'approve';
    this.approvalModalPhase = 'form';
    this.approvalModalResult = 'success';
    this.approvalResultTitle = '';
    this.approvalResultMessage = '';
    this.approvalReason = '';
    this.approvingCompany = false;
  }

  private isSameCompany(a: Company, b: Company): boolean {
    const aUserId = String(a.userId ?? '').trim();
    const bUserId = String(b.userId ?? '').trim();
    if (aUserId && bUserId) return aUserId === bUserId;
    return a.id === b.id;
  }

  private sendCompanyActionNotification(token: string, target: Company, mode: CompanyModalMode): void {
    const email = String(target.coreo ?? '').trim();
    const company = String(target.empresa ?? '').trim();
    if (!email) return;

    if (mode === 'approve') {
      this.notificationService
        .sendNotification(token, email, 'Cuenta aprobada', 'company-approved', { company })
        .subscribe({ error: () => {} });
    } else if (mode === 'deactivate') {
      const reason = this.approvalReason.trim();
      this.notificationService
        .sendNotification(token, email, 'Cuenta desactivada', 'account-disabled', { company, reason })
        .subscribe({ error: () => {} });
    } else if (mode === 'reactivate') {
      this.notificationService
        .sendNotification(token, email, 'Cuenta activada', 'company-active', { company })
        .subscribe({ error: () => {} });
    }
  }
}
