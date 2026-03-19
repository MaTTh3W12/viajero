import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { AuthService, AuthUser } from '../../../service/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { UiService } from '../../../service/ui.service';
import { Subscription } from 'rxjs';

type TopbarVariant =
  | 'dashboard'
  | 'coupons'
  | 'messages'
  | 'companies';

@Component({
  selector: 'app-topbar',
  imports: [CommonModule, RouterModule],
  standalone: true,
   schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css'],
})
export class TopbarComponent implements OnInit, OnDestroy {
  @Input() location: string = '';
  user: AuthUser | null;
  role: 'admin' | 'empresa' | 'usuario' | null;
  menuOpen = false;
  showLogoutModal = false;
  isLoggingOut = false;
  isLoggedOutSuccess = false;
  showSessionExpiredModal = false;
  avatarLoadError = false;
  private sessionExpiredSub?: Subscription;
  private userSub?: Subscription;

  constructor(
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private uiService: UiService
  ) {
    this.user = this.auth.getCurrentUser();
    this.role = this.user?.role ?? null;

  }

  ngOnInit(): void {
    this.sessionExpiredSub = this.auth.sessionExpired$.subscribe(expired => {
      this.showSessionExpiredModal = expired;
      this.cdr.detectChanges();
    });

    this.userSub = this.auth.user$.subscribe((user) => {
      this.user = user;
      this.role = user?.role ?? null;
      this.avatarLoadError = false;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.sessionExpiredSub?.unsubscribe();
    this.userSub?.unsubscribe();
  }

  toggleSidebar() {
    this.uiService.toggleSidebar();
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  goToProfile() {
    this.menuOpen = false;

    if (this.isEmpresaPortal) {
      this.router.navigate(['/companies/dashboard/perfil-empresa']);
      return;
    }

    this.router.navigate(['/admin/dashboard']);
  }

  openLogoutModal() {
    this.showLogoutModal = true;
    this.menuOpen = false; // Close the dropdown menu
  }

  closeLogoutModal() {
    this.showLogoutModal = false;
    this.isLoggingOut = false;
    this.isLoggedOutSuccess = false;
  }

  logout() {
    this.isLoggingOut = true;
    this.isLoggedOutSuccess = false;

    setTimeout(() => {
      try {
        // Si la sesión viene de Keycloak, el flujo correcto es redirección a logout de Keycloak.
        if (this.auth.shouldLogoutInKeycloak()) {
          this.auth.keycloakLogout();
          return;
        }

        // Flujo mock/local
        this.auth.logout();
        this.isLoggedOutSuccess = true;
      } catch (error) {
        console.error('[TOPBAR] Error al cerrar sesión', error);
        this.isLoggedOutSuccess = true;
      } finally {
        this.isLoggingOut = false;
        this.cdr.detectChanges();
      }
    }, 500);
  }

  finishLogout() {
    this.closeLogoutModal();
    this.router.navigate(['/']);
  }

  closeSessionExpiredModal() {
    this.showSessionExpiredModal = false;
    this.auth.clearSessionExpiredFlag();
  }

  goToLoginAfterExpiry() {
    this.closeSessionExpiredModal();
    this.router.navigate(['/']);
  }


  get displayFullName(): string {
    const first = this.user?.firstName?.trim() ?? '';
    const last = this.user?.lastName?.trim() ?? '';
    const full = [first, last].filter(Boolean).join(' ').trim();

    return full || this.user?.username || 'Usuario';
  }

  get displayCompanyName(): string {
    return this.user?.companyName?.trim() || this.user?.username || '';
  }

  get avatarSrc(): string | null {
    if (this.avatarLoadError) return null;

    const raw = (this.user?.avatarUrl ?? '').trim();
    if (!raw) return null;

    const normalizedRaw = raw.toLowerCase();
    if (normalizedRaw === 'null' || normalizedRaw === 'undefined' || normalizedRaw === 'n/a') {
      return null;
    }

    if (raw.startsWith('data:') || raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) {
      return raw;
    }

    return `data:image/png;base64,${raw}`;
  }

  onAvatarError(): void {
    this.avatarLoadError = true;
    this.cdr.detectChanges();
  }

  get bgClass() {
    return this.role === 'admin'
      ? 'bg-[#1A2440]'     // azul oscuro (admin)
      : 'bg-[#538CFF]';    // celeste (empresa)
  }

  get isEmpresaPortal(): boolean {
    const normalizedRole = String(this.role ?? '').toLowerCase();
    return normalizedRole === 'empresa' || normalizedRole === 'company';
  }

}
