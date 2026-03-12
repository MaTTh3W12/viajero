import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AuthService, AuthUser } from '../../../service/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  open = false;
  isRegisterDropdownOpen = false;
  isUserDropdownOpen = false;
  showLogoutModal = false;
  isLoggingOut = false;
  showSessionExpiredModal = false;
  private sessionExpiredSub?: Subscription;
  private userSub?: Subscription;
  private user: AuthUser | null = null;

  constructor(
    private router: Router,
    private auth: AuthService
  ) { }

  ngOnInit(): void {
    this.user = this.auth.getCurrentUser();

    this.sessionExpiredSub = this.auth.sessionExpired$.subscribe(expired => {
      this.showSessionExpiredModal = expired;
    });

    this.userSub = this.auth.user$.subscribe((user) => {
      this.user = user;
    });
  }

  ngOnDestroy(): void {
    this.sessionExpiredSub?.unsubscribe();
    this.userSub?.unsubscribe();
  }

  isCouponsActive(): boolean {
    return (
      this.router.url.startsWith('/coupons') ||
      this.router.url.startsWith('/view-coupons')
    );
  }

  isMyCouponsActive(): boolean {
    return this.router.url.startsWith('/my-coupons');
  }

  registerKeycloakUser(): void {
    this.auth.keycloakRegisterUser();
  }

  registerKeycloakCompany(): void {
    this.auth.keycloakRegisterCompany();
  }

  loginKeycloak(): void {
    this.isRegisterDropdownOpen = false;
    this.open = false;
    this.auth.keycloakLogin();
  }

  get isKeycloakLoggedIn(): boolean {
    return this.auth.isKeycloakLoggedIn();
  }

  get isPublicUserLoggedIn(): boolean {
    if (!this.isKeycloakLoggedIn) return false;
    const currentRole = this.user?.role ?? null;
    const keycloakRole = (this.auth.getKeycloakRole() ?? '').toUpperCase();
    return currentRole === 'usuario' || keycloakRole === 'USER';
  }

  get displayUserName(): string {
    const first = this.user?.firstName?.trim() ?? '';
    const last = this.user?.lastName?.trim() ?? '';
    const fullName = [first, last].filter(Boolean).join(' ').trim();
    return fullName || this.user?.username || 'Usuario';
  }

  toggleUserDropdown(): void {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
  }

  goToMyCoupons(): void {
    this.router.navigate(['/my-coupons']);
  }

  logoutKeycloak(): void {
    this.auth.keycloakLogout();
  }

  openLogoutModal(): void {
    this.isUserDropdownOpen = false;
    this.showLogoutModal = true;
  }

  closeLogoutModal(): void {
    this.showLogoutModal = false;
    this.isLoggingOut = false;
  }

  confirmLogout(): void {
    this.isLoggingOut = true;
    setTimeout(() => this.logoutKeycloak(), 500);
  }

  closeSessionExpiredModal(): void {
    this.showSessionExpiredModal = false;
    this.auth.clearSessionExpiredFlag();
  }

  goToLoginAfterExpiry(): void {
    this.closeSessionExpiredModal();
    this.router.navigate(['/']);
  }

}
