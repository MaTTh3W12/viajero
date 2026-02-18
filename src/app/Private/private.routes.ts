import { Routes } from '@angular/router';
import { adminGuard, empresaGuard } from '../shared/guards/auth.guard';

// Rutas para ADMIN: /admin/dashboard
export const ADMIN_ROUTES: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./admin-dashboard/admin-dashboard.component')
        .then(m => m.AdminDashboardComponent),
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/home/home.component')
            .then(m => m.HomeComponent)
      },
      {
        path: 'users-list',
        loadComponent: () =>
          import('./pages/user-list/user-list.component')
            .then(m => m.UserListComponent)
      },
      {
        path: 'audit-list',
        loadComponent: () =>
          import('./pages/audit-list/audit-list.component')
            .then(m => m.AuditListComponent)
      },
      {
        path: 'category-list',
        loadComponent: () =>
          import('./pages/category-list/category-list.component')
            .then(m => m.CategoryListComponent)
      },
      {
        path: 'coupons-list',
        loadComponent: () =>
          import('./pages/coupons-list/coupons-list.component')
            .then(m => m.CouponsListComponent)
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./pages/messages/messages.component')
            .then(m => m.MessagesComponent)
      },
      {
        path: 'companies',
        loadComponent: () =>
          import('./pages/companies/companies.component')
            .then(m => m.CompaniesComponent)
      }
    ]
  }
];

// Rutas para EMPRESA: /company/dashboard
export const COMPANY_ROUTES: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./company-dashboard/company-dashboard.component')
        .then(m => m.CompanyDashboardComponent),
    canActivate: [empresaGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/home/home.component')
            .then(m => m.HomeComponent)
      },
      {
        path: 'estadisticas',
        loadComponent: () =>
          import('./pages/company-statistics/company-statistics.component')
            .then(m => m.CompanyStatisticsComponent)
      },
      {
        path: 'gestion-cupones',
        loadComponent: () =>
          import('./pages/coupons-list/coupons-list.component')
            .then(m => m.CouponsListComponent)
      },
      {
        path: 'canje-cupones',
        loadComponent: () =>
          import('./pages/canje-cupones/canje-cupones.component')
            .then(m => m.CanjeCuponesComponent)
      },
        {
          path: 'historial-canje',
          loadComponent: () =>
            import('./pages/historial-canjes/historial-canjes.component')
              .then(m => m.HistorialCanjesComponent)
        },
      {
        path: 'contacto',
        loadComponent: () =>
          import('./pages/home/home.component')
            .then(m => m.HomeComponent)
      }
    ]
  }
];
