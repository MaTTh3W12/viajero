import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [

  // 🌐 PRERENDER: SOLO RUTAS ESTÁTICAS PÚBLICAS
  {
    path: '',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'about-us',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'coupons',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'my-coupons',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'contact',
    renderMode: RenderMode.Prerender
  },

  // ⚠️ RUTA DINÁMICA (DETALLE CUPÓN) → SSR EN TIEMPO REAL
  {
    path: 'view-coupons/:id',
    renderMode: RenderMode.Server
  },

  // 🔐 CLIENT ONLY
  {
    path: 'login',
    renderMode: RenderMode.Client
  },
  {
    path: 'register',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'companies/**',
    renderMode: RenderMode.Client
  }
];
