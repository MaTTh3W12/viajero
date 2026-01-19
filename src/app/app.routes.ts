import { Routes } from '@angular/router';

export const routes: Routes = [

  // 🌐 PÚBLICO
  {
    path: '',
    loadComponent: () =>
      import('./Public/pages/home/home.component')
        .then(m => m.HomeComponent),
  },
  {
    path: 'about-us',
    loadComponent: () =>
      import('./Public/pages/about-us/about-us.component')
        .then(m => m.AboutUsComponent),
  },
  {
    path: 'coupons',
    loadComponent: () =>
      import('./Public/pages/coupons/coupons.component')
        .then(m => m.CouponsComponent),
  },
  {
    path: 'view-coupons/:id',
    loadComponent: () =>
      import('./Public/pages/view-coupons/view-coupons.component')
        .then(m => m.ViewCouponsComponent),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./Public/pages/contact/contact.component')
        .then(m => m.ContactComponent),
  },

  // 🔐 AUTH
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login/login.component')
        .then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./auth/register/register.component')
        .then(m => m.RegisterComponent),
  },

  // 📊 DASHBOARD
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./Private/private.routes')
        .then(m => m.DASHBOARD_ROUTES),
  }
];
