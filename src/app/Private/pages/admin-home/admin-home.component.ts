import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ChartConfiguration,
  ChartOptions,
  DoughnutController,
  Legend,
  LinearScale,
  Plugin,
  Tooltip,
} from 'chart.js';
import {
  AdminCouponPerformance,
  AdminDashboardStats,
  AuditLog,
  CouponService,
  CompanyRedemptionShare,
  ImmediateManagementCounts,
} from '../../../service/coupon.service';
import { AuthService } from '../../../service/auth.service';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';

const doughnutLabelsPlugin: Plugin<'doughnut'> = {
  id: 'adminDoughnutLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const values = chart.data.datasets[0]?.data ?? [];

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 16px Inter, system-ui, sans-serif';

    meta.data.forEach((element, index) => {
      const rawValue = Number(values[index] ?? 0);
      if (!Number.isFinite(rawValue) || rawValue <= 0) {
        return;
      }

      const arc = element as unknown as {
        startAngle: number;
        endAngle: number;
        innerRadius: number;
        outerRadius: number;
        x: number;
        y: number;
      };

      const angle = (arc.startAngle + arc.endAngle) / 2;
      const radius = arc.innerRadius + (arc.outerRadius - arc.innerRadius) * 0.55;
      const x = arc.x + Math.cos(angle) * radius;
      const y = arc.y + Math.sin(angle) * radius;
      const displayValue = Number.isInteger(rawValue) ? `${rawValue}%` : `${rawValue.toFixed(1)}%`;

      ctx.fillStyle = rawValue >= 24 ? '#FFFFFF' : '#1A2440';
      ctx.fillText(displayValue, x, y);
    });

    ctx.restore();
  },
};

ChartJS.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
  doughnutLabelsPlugin
);

interface AdminStatCard {
  label: string;
  value: string;
  iconId: string;
  colorClass: string;
}

interface CompanyRedeemLegendItem {
  name: string;
  percentage: number;
  totalRedemptions: number;
  color: string;
}

interface AuditPreviewRow {
  id: number | string;
  date: string;
  event: string;
  user: string;
  entity: string;
}

interface QuickActionRow {
  label: string;
  total: number;
}

@Component({
  selector: 'app-admin-home',
  standalone: true,
  imports: [CommonModule, TopbarComponent, BaseChartDirective, RouterLink],
  templateUrl: './admin-home.component.html',
  styleUrl: './admin-home.component.css',
})
export class AdminHomeComponent implements OnInit, OnDestroy {
  private readonly numberFormatter = new Intl.NumberFormat('es-SV');
  private readonly donutPalette = ['#1E2848', '#A5A5A5', '#C8CCFF', '#5D8DFB', '#B8DFFF'];
  private dashboardSub?: Subscription;
  readonly auditListRoute = ['/admin/dashboard/audit-list'];

  stats = this.buildStatsCards();
  auditRows: AuditPreviewRow[] = [];
  quickActions: QuickActionRow[] = this.buildQuickActions();
  companyRedeemLegend: CompanyRedeemLegendItem[] = [];

  performanceChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: '#5B8DFF',
        borderRadius: 999,
        borderSkipped: false,
        barThickness: 16,
      },
    ],
  };

  performanceChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${this.numberFormatter.format(Number(context.raw ?? 0))} canjes`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#6C7A96',
          precision: 0,
        },
      },
      y: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#1A2440',
          font: {
            size: 13,
            weight: 500,
          },
        },
      },
    },
  };

  donutChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: this.donutPalette,
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  donutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    radius: '92%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = Number(context.raw ?? 0);
            return `${context.label}: ${value}%`;
          },
          afterLabel: (context) => {
            const item = this.companyRedeemLegend[context.dataIndex];
            if (!item) {
              return '';
            }

            return `${this.numberFormatter.format(item.totalRedemptions)} canjes`;
          },
        },
      },
    },
    layout: {
      padding: 8,
    },
  };

  constructor(
    private readonly auth: AuthService,
    private readonly couponService: CouponService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.dashboardSub?.unsubscribe();
  }

  trackByStatLabel(_index: number, item: AdminStatCard): string {
    return item.label;
  }

  trackByAuditRow(_index: number, item: AuditPreviewRow): number | string {
    return item.id;
  }

  trackByQuickAction(_index: number, item: QuickActionRow): string {
    return item.label;
  }

  trackByLegend(_index: number, item: CompanyRedeemLegendItem): string {
    return item.name;
  }

  private loadDashboardData(): void {
    const token = this.auth.token;
    if (!token) {
      this.applyStats({
        totalCompanies: 0,
        activeUsers: 0,
        activeCoupons: 0,
        totalRedemptions: 0,
      });
      this.applyCouponPerformance([]);
      this.applyCompanyShare([]);
      this.applyAuditRows([]);
      this.quickActions = this.buildQuickActions();
      return;
    }

    this.dashboardSub = forkJoin({
      stats: this.couponService.getAdminDashboardStats(token).pipe(
        catchError((error) => {
          console.error('[AdminHome] Error loading admin stats', error);
          return of({
            totalCompanies: 0,
            activeUsers: 0,
            activeCoupons: 0,
            totalRedemptions: 0,
          } satisfies AdminDashboardStats);
        })
      ),
      performance: this.couponService.getCouponPerformanceTop5(token).pipe(
        catchError((error) => {
          console.error('[AdminHome] Error loading coupon performance', error);
          return of([] as AdminCouponPerformance[]);
        })
      ),
      share: this.couponService.getCompanyRedemptionShare(token).pipe(
        catchError((error) => {
          console.error('[AdminHome] Error loading company redemption share', error);
          return of([] as CompanyRedemptionShare[]);
        })
      ),
      audit: this.couponService.getAuditLogsDynamic(token, {
        limit: 5,
        offset: 0,
        where: {},
      }).pipe(
        catchError((error) => {
          console.error('[AdminHome] Error loading audit preview', error);
          return of({ rows: [], total: 0 });
        })
      ),
      management: this.couponService.getImmediateManagementCounts(token).pipe(
        catchError((error) => {
          console.error('[AdminHome] Error loading immediate management counts', error);
          return of({
            pendingValidationsCount: 0,
            pendingMessagesCount: 0,
            expiringCouponsCount: 0,
          } satisfies ImmediateManagementCounts);
        })
      ),
    }).subscribe(({ stats, performance, share, audit, management }) => {
      this.applyStats(stats);
      this.applyCouponPerformance(performance);
      this.applyCompanyShare(share);
      this.applyAuditRows(audit.rows ?? []);
      this.quickActions = this.buildQuickActions(management);
      this.cdr.detectChanges();
    });
  }

  private buildStatsCards(
    totalCompanies = 0,
    activeUsers = 0,
    activeCoupons = 0,
    totalRedemptions = 0
  ): AdminStatCard[] {
    return [
      {
        label: 'Empresas registradas',
        value: this.numberFormatter.format(totalCompanies),
        iconId: 'stats-total-custom',
        colorClass: 'bg-[#DDF7EA]',
      },
      {
        label: 'Usuarios activos',
        value: this.numberFormatter.format(activeUsers),
        iconId: 'user',
        colorClass: 'bg-[#DCEEFF]',
      },
      {
        label: 'Cupones en sistema',
        value: this.numberFormatter.format(activeCoupons),
        iconId: 'ticket-money',
        colorClass: 'bg-[#FFE5DE]',
      },
      {
        label: 'Total de canjes realizados',
        value: this.numberFormatter.format(totalRedemptions),
        iconId: 'custom-icon',
        colorClass: 'bg-[#FFF0C8]',
      },
    ];
  }

  private buildQuickActions(
    counts: ImmediateManagementCounts = {
      pendingValidationsCount: 0,
      pendingMessagesCount: 0,
      expiringCouponsCount: 0,
    }
  ): QuickActionRow[] {
    return [
      { label: 'Validaciones de empresa pendientes', total: counts.pendingValidationsCount },
      { label: 'Mensajes recibidos', total: counts.pendingMessagesCount },
      { label: 'Cupones por vencer (24 h)', total: counts.expiringCouponsCount },
    ];
  }

  private applyStats(stats: AdminDashboardStats): void {
    this.stats = this.buildStatsCards(
      stats.totalCompanies,
      stats.activeUsers,
      stats.activeCoupons,
      stats.totalRedemptions
    );
  }

  private applyCouponPerformance(rows: AdminCouponPerformance[]): void {
    this.performanceChartData = {
      labels: rows.map((row) => this.truncateText(row.title, 20)),
      datasets: [
        {
          data: rows.map((row) => row.redemptionCount),
          backgroundColor: '#5B8DFF',
          borderRadius: 999,
          borderSkipped: false,
          barThickness: 16,
        },
      ],
    };
    this.cdr.markForCheck();
  }

  private applyCompanyShare(rows: CompanyRedemptionShare[]): void {
    this.companyRedeemLegend = rows.map((row, index) => ({
      name: this.truncateText(row.companyName, 20),
      percentage: row.percentage,
      totalRedemptions: row.totalRedemptions,
      color: this.donutPalette[index % this.donutPalette.length],
    }));
    this.donutChartData = {
      labels: rows.map((row) => this.truncateText(row.companyName, 20)),
      datasets: [
        {
          data: rows.map((row) => row.percentage),
          backgroundColor: this.donutPalette,
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    };
    this.cdr.markForCheck();
  }

  private applyAuditRows(rows: AuditLog[]): void {
    this.auditRows = rows.slice(0, 5).map((row, index) => ({
      id: row.id ?? `audit-row-${index}`,
      date: this.formatAuditDate(row.createdAt),
      event: this.formatAuditEvent(row.actionType),
      user: this.formatAuditUser(row),
      entity: this.formatAuditEntity(row),
    }));
  }

  private formatAuditDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = new Intl.DateTimeFormat('es-SV', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);

    if (isToday) {
      return `Hoy - ${time}`;
    }

    if (isYesterday) {
      return `Ayer - ${time}`;
    }

    return new Intl.DateTimeFormat('es-SV', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date).replace(',', ' -');
  }

  private formatAuditEvent(actionType: string): string {
    const normalized = String(actionType ?? '').trim().toUpperCase();

    const labels: Record<string, string> = {
      USER_REGISTERED: 'Registro',
      COMPANY_REGISTERED: 'Registro empresa',
      COUPON_ACQUIRED: 'Adquisición',
      COUPON_REDEEMED: 'Canje',
      COUPON_UPDATED: 'Actualización',
      COUPON_CREATED: 'Creación',
      COUPON_DELETED: 'Desactivación',
      COMPANY_APPROVED: 'Aprobación',
      COMPANY_STATUS_CHANGED: 'Cambio de estado',
      MESSAGE_CREATED: 'Mensaje',
      MESSAGE_SENT: 'Mensaje',
      CATEGORY_CREATED: 'Creación de categoría',
      CATEGORY_UPDATED: 'Actualización de categoría',
      CATEGORY_DELETED: 'Baja de categoría',
    };

    if (labels[normalized]) {
      return labels[normalized];
    }

    if (!normalized) {
      return 'Evento';
    }

    return this.humanizeActionType(normalized);
  }

  private formatAuditUser(row: AuditLog): string {
    const first = row.userPublic?.firstName?.trim() ?? '';
    const last = row.userPublic?.lastName?.trim() ?? '';
    const fullName = [first, last].filter(Boolean).join(' ').trim();

    return fullName || row.userPublic?.email?.trim() || row.userId || 'Sistema';
  }

  private formatAuditEntity(row: AuditLog): string {
    const entity = this.formatEntity(row.entity);
    const details = String(row.details ?? '').trim();

    if (!details) {
      return entity;
    }

    if (details.startsWith('{') || details.startsWith('[')) {
      return entity;
    }

    return details.length > 52 ? `${details.slice(0, 52)}...` : details;
  }

  private formatEntity(value: string): string {
    const normalized = String(value ?? '').trim().toUpperCase();

    const labels: Record<string, string> = {
      COUPON: 'Cupón',
      COUPON_ACQUIRED: 'Cupón adquirido',
      COMPANY: 'Empresa',
      USER: 'Usuario',
      USER_PROFILE: 'Perfil de usuario',
      CATEGORY: 'Categoría',
      MESSAGE: 'Mensaje',
    };

    return labels[normalized] ?? (normalized ? this.humanizeActionType(normalized) : 'Entidad no disponible');
  }

  private humanizeActionType(value: string): string {
    return value
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(' ');
  }

  private truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }
}
