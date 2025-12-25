import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'about-us',
    loadComponent: () => import('./pages/about-us/about-us.component').then(m => m.AboutUsComponent)
  },
  {
    path: 'view-cupon',
    loadComponent: () => import('./pages/view-cupon/view-cupon').then(m => m.ViewCupon)
  }
];
