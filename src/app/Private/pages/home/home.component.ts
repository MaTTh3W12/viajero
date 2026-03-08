import { Component, OnDestroy, OnInit } from '@angular/core';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { AuthService, AuthUser } from '../../../service/auth.service';
import { Subscription } from 'rxjs';

import type { ChartConfiguration, ChartOptions } from 'chart.js';

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

    // 🔹 DATA QUEMADA - MÉTRICAS
  stats = [
    { label: 'Cupones adquiridos', value: '20,753', color: 'bg-green-100 text-green-700' },
    { label: 'Total canjeados', value: '1,506', color: 'bg-blue-100 text-blue-700' },
    { label: 'Cupones vencidos', value: '168', color: 'bg-red-100 text-red-700' },
    { label: 'Próximos a vencer', value: '8,539', color: 'bg-yellow-100 text-yellow-700' }
  ];

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
  private readonly chartValues = [
    75, 150, 35, 150, 75, 35, 150, 35, 75, 150, 35, 150, 75, 35, 150, 35, 75, 150, 35, 150, 75, 35, 150, 35, 75,
    150, 35, 150, 75, 35, 150
  ];

  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: Array.from({ length: 31 }, (_, i) => `${i + 1}`),
    datasets: [
      {
        data: this.chartValues,
        backgroundColor: this.chartValues.map((_, index) => (index % 2 === 0 ? '#538CFF' : '#1A2440')),
        borderRadius: 6
      }
    ]
  };

  public barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#E5E7EB'
        }
      }
    }
  };

  constructor(
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentMonthLabel = this.getCurrentMonthLabel();

    const currentUser = this.auth.getCurrentUser();
    this.companyName = currentUser?.companyName?.trim() || currentUser?.username || this.companyName;

    this.userSub = this.auth.user$.subscribe((user: AuthUser | null) => {
      this.companyName = user?.companyName?.trim() || user?.username || this.companyName;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  private getCurrentMonthLabel(): string {
    const monthName = new Intl.DateTimeFormat('es-SV', { month: 'long' }).format(new Date());
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  }
}
