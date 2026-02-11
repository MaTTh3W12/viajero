import { Component, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
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

// Registrar los componentes necesarios de Chart.js
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

@Component({
  selector: 'app-home',
  imports: [TopbarComponent, BaseChartDirective],
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  // --- Gráfica: Empresas registradas (barras azules) ---
  empresasChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['SEP', 'OCT', 'NOV'],
    datasets: [
      {
        data: [25, 35, 45],
        backgroundColor: ['#E6EFFF', '#C6DBFF', '#A2C3FF'],
        borderRadius: 6,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      },
    ],
  };

  empresasChartOptions: ChartConfiguration<'bar'>['options'] = {
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
          color: '#9CA3AF',
          font: { size: 9, weight: 'bold' },
          padding: 2,
        },
      },
      y: {
        display: false,
        beginAtZero: true,
        max: 55,
      },
    },
    animation: {
      duration: 800,
      easing: 'easeOutQuart',
    },
  };

  empresasChartPlugins = [
    {
      id: 'barValueLabels',
      afterDatasetsDraw(chart: any) {
        const ctx = chart.ctx;
        chart.data.datasets.forEach((dataset: any, i: number) => {
          const meta = chart.getDatasetMeta(i);
          meta.data.forEach((bar: any, index: number) => {
            const value = dataset.data[index];
            ctx.save();
            ctx.fillStyle = '#0E225C';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(value, bar.x, bar.y + bar.height - 4);
            ctx.restore();
          });
        });
      },
    },
  ];

  // --- Gráfica: Ciudadanos registrados (barras amarillas) ---
  ciudadanosChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['SEP', 'OCT', 'NOV'],
    datasets: [
      {
        data: [75, 101, 65],
        backgroundColor: ['#FFFCD4', '#FFF9A9', '#F8F18D'],
        borderRadius: 6,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      },
    ],
  };

  ciudadanosChartOptions: ChartConfiguration<'bar'>['options'] = {
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
          color: '#9CA3AF',
          font: { size: 9, weight: 'bold' },
          padding: 2,
        },
      },
      y: {
        display: false,
        beginAtZero: true,
        max: 120,
      },
    },
    animation: {
      duration: 800,
      easing: 'easeOutQuart',
    },
  };

  ciudadanosChartPlugins = [
    {
      id: 'barValueLabels',
      afterDatasetsDraw(chart: any) {
        const ctx = chart.ctx;
        chart.data.datasets.forEach((dataset: any, i: number) => {
          const meta = chart.getDatasetMeta(i);
          meta.data.forEach((bar: any, index: number) => {
            const value = dataset.data[index];
            ctx.save();
            ctx.fillStyle = '#0E225C';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(value, bar.x, bar.y + bar.height - 4);
            ctx.restore();
          });
        });
      },
    },
  ];
}
