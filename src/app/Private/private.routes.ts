import { Routes } from '@angular/router';
import { adminGuard } from '../shared/guards/auth.guard';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
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
      }
    ]
  }
];