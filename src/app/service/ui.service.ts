import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UiService {
  private sidebarOpen$ = new BehaviorSubject<boolean>(false);
  isSidebarOpen$ = this.sidebarOpen$.asObservable();
  private lockedScrollY = 0;

  toggleSidebar(): void {
    const next = !this.sidebarOpen$.getValue();
    this.sidebarOpen$.next(next);
    this.updateBodyScrollLock(next);
  }

  openSidebar(): void {
    this.sidebarOpen$.next(true);
    this.updateBodyScrollLock(true);
  }

  closeSidebar(): void {
    this.sidebarOpen$.next(false);
    this.updateBodyScrollLock(false);
  }

  private updateBodyScrollLock(isOpen: boolean): void {
    if (typeof document === 'undefined') return;
    const body = document.body;
    const html = document.documentElement;
    if (!body || !html) return;

    // Evitar bloqueo de scroll en escritorio (>= lg: 1024px)
    const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 1024 : false;
    if (isDesktop) {
      // Asegurar que no haya estilos residuales
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      body.style.overflow = '';
      html.style.overflow = '';
      return;
    }

    if (isOpen) {
      // Store current scroll position and lock
      this.lockedScrollY = typeof window !== 'undefined' ? window.scrollY || 0 : 0;
      body.style.position = 'fixed';
      body.style.top = `-${this.lockedScrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      html.style.overflow = 'hidden';
    } else {
      // Unlock and restore scroll
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      body.style.overflow = '';
      html.style.overflow = '';
      if (typeof window !== 'undefined') {
        window.scrollTo(0, this.lockedScrollY || 0);
      }
    }
  }
}
