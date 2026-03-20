import { Component, OnDestroy, OnInit } from '@angular/core';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { AuthService, AuthUser } from '../../../service/auth.service';
import { forkJoin, of, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import {
  AuditLog,
  CompanyCouponStats,
  CompanyTopRedeemedCoupon,
  CouponService,
  GetAuditLogsVariables,
  MonthlyRedemptionPerformance,
} from '../../../service/coupon.service';

import type { ChartConfiguration, ChartOptions, TooltipItem } from 'chart.js';

import {
  Chart as ChartJS,
  BarController,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  BarController,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

@Component({
  selector: 'app-home',
  imports: [
    TopbarComponent,
    CommonModule,
    BaseChartDirective,
  ],
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  companyName = 'Nombre de empresa';
  currentMonthLabel = '';
  private userSub?: Subscription;
  private statsSub?: Subscription;
  private performanceSub?: Subscription;
  private topCouponsSub?: Subscription;
  private transactionsSub?: Subscription;
  private monthlyPerformanceRows: MonthlyRedemptionPerformance[] = [];

  private readonly numberFormatter = new Intl.NumberFormat('es-SV');

  stats = this.buildStatsCards();

  // 🔹 DATA QUEMADA - TOP CUPONES
  topCoupons = [
    { name: 'Cena 2x1', total: 405 },
    { name: 'Descuento 15%', total: 358 },
    { name: 'Ayer - 09:30', total: 125 },
    { name: 'Café gratis', total: 54 },
    { name: 'Hotel playa', total: 4 }
  ];

  // 🔹 DATA QUEMADA - TRANSACCIONES
  transactions = [
    { date: 'Hoy - 14:20', coupon: 'Cena 2x1', user: 'Pedro Gómez', status: 'Canjeado' },
    { date: 'Hoy - 14:10', coupon: 'Descuento 15%', user: 'María Rodríguez', status: 'Canjeado' },
    { date: 'Hoy - 13:55', coupon: 'Café gratis', user: 'Luis Martínez', status: 'Canjeado' }
  ];

  // 🔹 DATA QUEMADA - GRÁFICA
  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: '#E5E7EB',
        borderSkipped: false,
        grouped: false,
        order: 1,
        barPercentage: 0.78,
        categoryPercentage: 0.82,
        borderRadius: 6
      },
      {
        data: [],
        backgroundColor: [],
        borderSkipped: false,
        grouped: false,
        order: 2,
        barPercentage: 0.78,
        categoryPercentage: 0.82,
        borderRadius: 6
      }
    ]
  };

  public barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        filter: (item) => item.datasetIndex === 1,
        callbacks: {
          title: (items: TooltipItem<'bar'>[]) => {
            const index = items[0]?.dataIndex ?? -1;
            const row = this.monthlyPerformanceRows[index];
            if (!row) {
              return 'Canjes por día';
            }

            return `Fecha: ${this.formatDateForTooltip(row.redemptionDate)}`;
          },
          label: (context: TooltipItem<'bar'>) => {
            const value = Number(context.raw ?? 0);
            return `Canjes: ${this.numberFormatter.format(Number.isFinite(value) ? value : 0)}`;
          },
          afterLabel: (context: TooltipItem<'bar'>) => {
            const row = this.monthlyPerformanceRows[context.dataIndex];
            if (!row?.couponTitle) {
              return '';
            }

            return `Cupón: ${row.couponTitle}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        title: {
          display: true,
          text: 'Día del mes'
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          display: false
        },
        title: {
          display: true,
          text: 'Cupones canjeados'
        }
      }
    }
  };

  constructor(
    private auth: AuthService,
    private couponService: CouponService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  goToRedemptionHistory(): void {
    this.router.navigate(['/companies/dashboard/historial-canje']);
  }

  ngOnInit(): void {
    this.currentMonthLabel = this.getCurrentMonthLabel();

    const currentUser = this.auth.getCurrentUser();
    this.companyName = currentUser?.companyName?.trim() || currentUser?.username || this.companyName;

    this.userSub = this.auth.user$.subscribe((user: AuthUser | null) => {
      this.companyName = user?.companyName?.trim() || user?.username || this.companyName;
      this.cdr.detectChanges();
    });

    this.loadCompanyCouponStats();
    this.loadMonthlyRedemptionPerformance();
    this.loadTopRedeemedCoupons();
    this.loadRecentTransactions();
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.statsSub?.unsubscribe();
    this.performanceSub?.unsubscribe();
    this.topCouponsSub?.unsubscribe();
    this.transactionsSub?.unsubscribe();
  }

  private getCurrentMonthLabel(): string {
    const monthName = new Intl.DateTimeFormat('es-SV', { month: 'long' }).format(new Date());
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  }

  private loadCompanyCouponStats(): void {
    const token = this.auth.token;
    if (!token) {
      this.stats = this.buildStatsCards();
      return;
    }

    this.statsSub = this.couponService.getCompanyCouponStats(token).subscribe({
      next: (stats) => {
        this.applyCompanyStats(stats);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[HomeComponent] Error cargando estadísticas de cupones:', error);
        this.stats = this.buildStatsCards();
        this.cdr.detectChanges();
      }
    });
  }

  private applyCompanyStats(stats: CompanyCouponStats | null): void {
    const normalizedStats = stats ?? {
      companyId: 0,
      totalAcquired: 0,
      totalRedeemed: 0,
      totalExpired: 0,
      totalUpcomingExpiration: 0,
    };

    this.stats = this.buildStatsCards(
      normalizedStats.totalAcquired,
      normalizedStats.totalRedeemed,
      normalizedStats.totalExpired,
      normalizedStats.totalUpcomingExpiration
    );
  }

  private buildStatsCards(
    totalAcquired = 0,
    totalRedeemed = 0,
    totalExpired = 0,
    totalUpcomingExpiration = 0
  ): Array<{ label: string; value: string; color: string }> {
    return [
      {
        label: 'Cupones adquiridos',
        value: this.formatStatValue(totalAcquired),
        color: 'bg-green-100 text-green-700'
      },
      {
        label: 'Total canjeados',
        value: this.formatStatValue(totalRedeemed),
        color: 'bg-blue-100 text-blue-700'
      },
      {
        label: 'Cupones vencidos',
        value: this.formatStatValue(totalExpired),
        color: 'bg-red-100 text-red-700'
      },
      {
        label: 'Próximos a vencer',
        value: this.formatStatValue(totalUpcomingExpiration),
        color: 'bg-yellow-100 text-yellow-700'
      }
    ];
  }

  private formatStatValue(value: number): string {
    return this.numberFormatter.format(Number.isFinite(value) ? value : 0);
  }

  private loadMonthlyRedemptionPerformance(): void {
    const token = this.auth.token;
    if (!token) {
      return;
    }

    this.performanceSub = this.couponService.getMonthlyRedemptionPerformance(token).subscribe({
      next: (rows) => {
        this.applyMonthlyPerformance(rows);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[HomeComponent] Error cargando desempeño de canjes:', error);
      }
    });
  }

  private loadTopRedeemedCoupons(): void {
    const token = this.auth.token;
    if (!token) {
      return;
    }

    this.topCouponsSub = this.couponService.getCompanyTopRedeemedCoupons(token).subscribe({
      next: (rows) => {
        this.applyTopRedeemedCoupons(rows);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[HomeComponent] Error cargando top cupones canjeados:', error);
      }
    });
  }

  private applyTopRedeemedCoupons(rows: CompanyTopRedeemedCoupon[]): void {
    if (!rows.length) {
      this.topCoupons = [];
      return;
    }

    this.topCoupons = rows.map((row) => ({
      name: row.couponName,
      total: row.redemptionCount,
    }));
  }

  private loadRecentTransactions(): void {
    const token = this.auth.token;
    if (!token) {
      return;
    }

    const variables: GetAuditLogsVariables = {
      limit: 10,
      offset: 0,
      where: {
        _and: [
          { entity: { _eq: 'COUPON' } }
        ]
      }
    };

    this.transactionsSub = this.couponService.getAuditLogsDynamic(token, variables).subscribe({
      next: (result) => {
        const rows = result.rows ?? [];
        const acquiredIds = this.getCouponReferenceIds(rows);
        const couponIdsFromDetails = this.getCouponIdsFromAuditDetails(rows);

        if (!acquiredIds.length && !couponIdsFromDetails.length) {
          this.setTransactionsFromAuditRows(rows);
          this.cdr.detectChanges();
          return;
        }

        forkJoin({
          coupons: couponIdsFromDetails.length
            ? this.couponService.getCouponsByIds(token, couponIdsFromDetails)
            : of([]),
          acquired: acquiredIds.length
            ? this.couponService.getCouponsAcquired(token, {
                limit: 200,
                offset: 0,
                where: { id: { _in: acquiredIds } }
              })
            : of({ rows: [], total: 0 })
        }).subscribe({
          next: ({ coupons, acquired }) => {
            const couponNamesById = this.buildCouponNamesById(coupons);
            const couponNamesByAcquiredId = this.buildCouponNamesByAcquiredId(acquired.rows ?? []);

            this.setTransactionsFromAuditRows(rows, couponNamesById, couponNamesByAcquiredId);
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('[HomeComponent] Error resolviendo nombres de cupones en auditoría:', error);
            this.setTransactionsFromAuditRows(rows);
            this.cdr.detectChanges();
          }
        });
      },
      error: (error) => {
        console.error('[HomeComponent] Error cargando transacciones recientes:', error);
      }
    });
  }

  private setTransactionsFromAuditRows(
    rows: AuditLog[],
    couponNamesById: Map<string, string> = new Map(),
    couponNamesByAcquiredId: Map<string, string> = new Map()
  ): void {
    this.transactions = rows.map((row) => ({
      date: this.formatTransactionDate(row.createdAt),
      coupon: this.getCouponNameFromAudit(row, couponNamesById, couponNamesByAcquiredId),
      user: this.getUserNameFromAudit(row),
      status: this.getStatusFromAudit(row),
    }));
  }

  private getCouponReferenceIds(rows: AuditLog[]): number[] {
    const ids = rows
      .map((row) => Number(row.referenceId))
      .filter((id) => Number.isFinite(id) && id > 0);

    return Array.from(new Set(ids));
  }

  private getCouponIdsFromAuditDetails(rows: AuditLog[]): number[] {
    const ids = rows
      .map((row) => this.getCouponIdFromAuditDetails(this.parseAuditDetails(row.details)))
      .filter((id): id is number => id !== null);

    return Array.from(new Set(ids));
  }

  private getCouponIdFromAuditDetails(details: Record<string, unknown> | null): number | null {
    const couponIdRaw = details?.['coupon_id'];
    const couponId = Number(couponIdRaw);
    if (!Number.isFinite(couponId) || couponId <= 0) {
      return null;
    }

    return couponId;
  }

  private buildCouponNamesById(coupons: Array<{ id: number; title: string }>): Map<string, string> {
    const map = new Map<string, string>();

    for (const coupon of coupons) {
      const name = coupon.title?.trim();
      if (!name) {
        continue;
      }

      map.set(String(coupon.id), name);
    }

    return map;
  }

  private buildCouponNamesByAcquiredId(
    acquiredRows: Array<{ id: number | string; coupon?: { title: string | null } | null }>
  ): Map<string, string> {
    const map = new Map<string, string>();

    for (const row of acquiredRows) {
      const name = row.coupon?.title?.trim();
      if (!name) {
        continue;
      }

      map.set(String(row.id), name);
    }

    return map;
  }

  private applyMonthlyPerformance(rows: MonthlyRedemptionPerformance[]): void {
    const completeRows = this.buildCompleteMonthSeries(rows);
    this.monthlyPerformanceRows = completeRows;

    const labels = completeRows.map((row) => this.toDayLabel(row.redemptionDate));
    const values = completeRows.map((row) => (Number.isFinite(row.redemptionCount) ? row.redemptionCount : 0));
    const maxValue = Math.max(...values, 1);
    const roundedMax = Math.ceil(maxValue / 25) * 25;
    const emptyBars = values.map(() => roundedMax);

    this.barChartData = {
      labels,
      datasets: [
        {
          data: emptyBars,
          backgroundColor: '#E5E7EB',
          borderSkipped: false,
          grouped: false,
          order: 1,
          barPercentage: 0.78,
          categoryPercentage: 0.82,
          borderRadius: 6
        },
        {
          data: values,
          backgroundColor: '#538CFF',
          borderSkipped: false,
          grouped: false,
          order: 2,
          barPercentage: 0.78,
          categoryPercentage: 0.82,
          borderRadius: 6
        }
      ]
    };

    const yScale = this.barChartOptions.scales?.['y'];
    if (yScale) {
      yScale.suggestedMax = roundedMax;
    }
  }

  private buildCompleteMonthSeries(rows: MonthlyRedemptionPerformance[]): MonthlyRedemptionPerformance[] {
    const validDates = rows
      .map((row) => new Date(row.redemptionDate))
      .filter((date) => !Number.isNaN(date.getTime()));

    const baseDate = validDates.length ? validDates[validDates.length - 1] : new Date();
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const countsByDay = new Map<number, number>();

    for (const row of rows) {
      const date = new Date(row.redemptionDate);
      if (Number.isNaN(date.getTime())) {
        continue;
      }

      if (date.getFullYear() !== year || date.getMonth() !== month) {
        continue;
      }

      const day = date.getDate();
      const count = Number.isFinite(row.redemptionCount) ? row.redemptionCount : 0;
      countsByDay.set(day, (countsByDay.get(day) ?? 0) + count);
    }

    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = new Date(year, month, day);
      const dateText = date.toISOString().slice(0, 10);

      return {
        redemptionDate: dateText,
        redemptionCount: countsByDay.get(day) ?? 0,
        couponId: null,
        couponTitle: null,
      };
    });
  }

  private toDayLabel(dateText: string): string {
    const date = new Date(dateText);
    if (Number.isNaN(date.getTime())) {
      return dateText;
    }

    return String(date.getDate());
  }

  private formatDateForTooltip(dateText: string): string {
    const date = new Date(dateText);
    if (Number.isNaN(date.getTime())) {
      return dateText;
    }

    return new Intl.DateTimeFormat('es-SV', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  private formatTransactionDate(dateText: string): string {
    const date = new Date(dateText);
    if (Number.isNaN(date.getTime())) {
      return dateText;
    }

    return new Intl.DateTimeFormat('es-SV', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  private getCouponNameFromAudit(
    row: AuditLog,
    couponNamesById: Map<string, string> = new Map(),
    couponNamesByAcquiredId: Map<string, string> = new Map()
  ): string {
    const details = this.parseAuditDetails(row.details);
    const detailCouponId = this.getCouponIdFromAuditDetails(details);
    if (detailCouponId != null) {
      const nameFromCouponId = couponNamesById.get(String(detailCouponId));
      if (nameFromCouponId) {
        return nameFromCouponId;
      }
    }

    const referenceKey = row.referenceId != null ? String(row.referenceId) : '';
    const exactName = referenceKey
      ? couponNamesByAcquiredId.get(referenceKey) ?? couponNamesById.get(referenceKey)
      : null;
    if (exactName) {
      return exactName;
    }

    const detailName =
      details?.['coupon_title'] ??
      details?.['coupon_name'] ??
      details?.['title'] ??
      details?.['name'];
    if (typeof detailName === 'string' && detailName.trim().length) {
      return detailName.trim();
    }

    if (row.referenceId != null) {
      return `Cupón #${row.referenceId}`;
    }

    return 'Cupón';
  }

  private getUserNameFromAudit(row: AuditLog): string {
    const firstName = row.userPublic?.firstName?.trim() ?? '';
    const lastName = row.userPublic?.lastName?.trim() ?? '';
    const fullName = `${firstName} ${lastName}`.trim();

    if (fullName.length) {
      return fullName;
    }

    if (row.userPublic?.email?.trim()) {
      return row.userPublic.email.trim();
    }

    return 'Usuario';
  }

  private getStatusFromAudit(row: AuditLog): string {
    const details = this.parseAuditDetails(row.details);

    const detailStatus = details?.['status'] ?? details?.['coupon_status'];
    if (typeof detailStatus === 'string' && detailStatus.trim().length) {
      return this.formatStatusText(detailStatus);
    }

    const redeemed = details?.['redeemed'];
    if (typeof redeemed === 'boolean') {
      return redeemed ? 'Canjeado' : 'Vigente';
    }

    const action = row.actionType.trim().toUpperCase();
    if (action.includes('REDEEM') || action.includes('CANJE')) return 'Canjeado';
    if (action.includes('ACQUIRE') || action.includes('ADQUIRE')) return 'Adquirido';
    if (action.includes('TRANSFER')) return 'Transferido';
    if (action.includes('EXPIRE')) return 'Vencido';
    if (action.includes('CREATE')) return 'Creado';
    if (action.includes('UPDATE')) return 'Actualizado';
    if (action.includes('DELETE')) return 'Eliminado';

    return this.formatStatusText(row.actionType);
  }

  private formatStatusText(text: string): string {
    const normalized = text.trim();
    if (!normalized) {
      return 'N/A';
    }

    return normalized
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private parseAuditDetails(details: string | null): Record<string, unknown> | null {
    if (!details) {
      return null;
    }

    try {
      const parsed = JSON.parse(details);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }

    return null;
  }
}
