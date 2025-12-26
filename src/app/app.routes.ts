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
    path: 'coupons',
    loadComponent: () => import('./pages/coupons/coupons.component').then(m => m.CouponsComponent)
  },
  {
    path: 'view-coupons',
    loadComponent: () => import('./pages/view-coupons/view-coupons.component').then(m => m.ViewCouponsComponent)
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact/contact.component').then(m => m.ContactComponent)
  }
];
