import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { DataTableComponent } from '../../../shared/dashboard/data-table/data-table.component';
import { FilterBarComponent } from '../../../shared/dashboard/filter-bar/filter-bar.component';
import { DataTableConfig } from '../../../service/data-table.model';
import { CouponsMockService } from '../../../service/coupons-mock.service';
import { Coupon } from '../../../service/coupon.interface';
import { AuthService, UserRole } from '../../../service/auth.service';
import { BaseChartDirective } from 'ng2-charts';
import {
  Chart,
  ChartConfiguration,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// Interfaz para los resultados estadísticos (preparada para API)
export interface CouponStatistics {
  fechaInicio: string;
  fechaFin: string;
  totalAdquiridos: number;
  publicados: number;
  adquiridos: number;
  canjeados: number;
}

@Component({
  selector: 'app-company-statistics',
  standalone: true,
  imports: [
    CommonModule,
    TopbarComponent,
    DataTableComponent,
    FilterBarComponent,
    BaseChartDirective,
  ],
  templateUrl: './company-statistics.component.html',
  styleUrl: './company-statistics.component.css',
})
export class CompanyStatisticsComponent implements OnInit {
  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  coupons: Coupon[] = [];

  tableConfig: DataTableConfig<Coupon> = {
    columns: [
      { key: 'titulo', label: 'Título del cupón' },
      { key: 'fechaInicio', label: 'Fecha inicio' },
      { key: 'fechaFin', label: 'Fecha fin' },
      { key: 'disponibles', label: 'Disponibles' },
      { key: 'estado', label: 'Estado', type: 'badge' },
    ],
    actions: [
      {
        iconId: 'eye',
        bgClass: 'bg-[#E6EEFF] text-[#538CFF]',
        action: (row) => this.viewStatistics(row),
      },
    ],
  };

  // Modal de resultados estadísticos
  showStatsModal = false;
  selectedCoupon: Coupon | null = null;
  couponStats: CouponStatistics | null = null;

  // Ordenamiento de la tabla de métricas
  metricRows: { metrica: string; valor: number }[] = [];
  metricSortColumn: 'metrica' | 'valor' = 'metrica';
  metricSortDirection: 'asc' | 'desc' = 'asc';

  // Chart.js para el modal
  statsChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  statsChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 2, bottom: 0, left: 4, right: 4 },
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: '#0E225C',
          font: { size: 10, weight: 'bold' },
          padding: 4,
        },
      },
      y: {
        display: false,
        beginAtZero: true,
      },
    },
    animation: {
      duration: 800,
      easing: 'easeOutQuart',
    },
  };
  statsChartPlugins = [
    {
      id: 'barValueLabels',
      afterDatasetsDraw(chart: any) {
        const ctx = chart.ctx;
        chart.data.datasets.forEach((dataset: any, i: number) => {
          const meta = chart.getDatasetMeta(i);
          meta.data.forEach((bar: any, index: number) => {
            const value = dataset.data[index];
            const bottomY = bar.y + bar.height - 14;
            ctx.save();
            ctx.fillStyle = '#0E225C';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(value, bar.x, bottomY);
            ctx.restore();
          });
        });
      },
    },
  ];

  constructor(private service: CouponsMockService, private auth: AuthService) {}

  ngOnInit(): void {
    this.service.getCoupons().subscribe((data) => {
      this.coupons = data;
    });
  }

  get role(): UserRole {
    return this.auth.getRole()!;
  }

  /**
   * Abre el modal de resultados estadísticos.
   * TODO: Reemplazar datos mock por llamada a API real.
   * Ejemplo futuro:
   *   this.statsService.getStatsByCouponId(coupon.id).subscribe(stats => {
   *     this.couponStats = stats;
   *     this.buildChart();
   *     this.showStatsModal = true;
   *   });
   */
  viewStatistics(coupon: Coupon): void {
    this.selectedCoupon = coupon;

    // Datos mock — reemplazar con respuesta de API
    this.couponStats = {
      fechaInicio: coupon.fechaInicio,
      fechaFin: coupon.fechaFin,
      totalAdquiridos: 275,
      publicados: 100,
      adquiridos: 75,
      canjeados: 100,
    };

    this.buildMetricRows();
    this.buildChart();
    this.showStatsModal = true;
  }

  closeStatsModal(): void {
    this.showStatsModal = false;
    this.selectedCoupon = null;
    this.couponStats = null;
  }

  private buildMetricRows(): void {
    if (!this.couponStats) return;
    this.metricRows = [
      { metrica: 'Cupones publicados', valor: this.couponStats.publicados },
      { metrica: 'Cupones adquiridos', valor: this.couponStats.adquiridos },
      { metrica: 'Cupones canjeados', valor: this.couponStats.canjeados },
    ];
    this.metricSortColumn = 'metrica';
    this.metricSortDirection = 'asc';
  }

  sortMetrics(column: 'metrica' | 'valor'): void {
    if (this.metricSortColumn === column) {
      this.metricSortDirection = this.metricSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.metricSortColumn = column;
      this.metricSortDirection = 'asc';
    }

    this.metricRows.sort((a, b) => {
      const valA = a[column];
      const valB = b[column];
      let comparison = 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB);
      } else {
        comparison = (valA as number) - (valB as number);
      }
      return this.metricSortDirection === 'asc' ? comparison : -comparison;
    });
  }

  private buildChart(): void {
    if (!this.couponStats) return;
    const s = this.couponStats;
    const maxVal = Math.max(s.publicados, s.adquiridos, s.canjeados, 1);

    this.statsChartData = {
      labels: ['Publicados', 'Adquiridos', 'Canjeados'],
      datasets: [
        {
          data: [s.publicados, s.adquiridos, s.canjeados],
          backgroundColor: ['#E6EFFF', '#C6DBFF', '#A2C3FF'],
          borderRadius: 8,
          barPercentage: 0.7,
          categoryPercentage: 0.8,
        },
      ],
    };

    this.statsChartOptions = {
      ...this.statsChartOptions,
      scales: {
        ...this.statsChartOptions!.scales,
        y: {
          display: false,
          beginAtZero: true,
          max: Math.ceil(maxVal * 1.15),
        },
      },
    };
  }
}
