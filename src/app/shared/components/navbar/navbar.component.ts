import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../service/auth.service';
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
  showLogoutModal = false;
  isLoggingOut = false;
  showSessionExpiredModal = false;
  private sessionExpiredSub?: Subscription;

  constructor(
    private router: Router,
    private auth: AuthService
  ) { }

  ngOnInit(): void {
    this.sessionExpiredSub = this.auth.sessionExpired$.subscribe(expired => {
      this.showSessionExpiredModal = expired;
    });
  }

  ngOnDestroy(): void {
    this.sessionExpiredSub?.unsubscribe();
  }

  isCouponsActive(): boolean {
    return (
      this.router.url.startsWith('/coupons') ||
      this.router.url.startsWith('/view-coupons')
    );
  }

  registerKeycloakUser(): void {
    this.auth.keycloakRegisterUser();
  }

  registerKeycloakCompany(): void {
    this.auth.keycloakRegisterCompany();
  }

  get isKeycloakLoggedIn(): boolean {
    return this.auth.isKeycloakLoggedIn();
  }

  logoutKeycloak(): void {
    this.auth.keycloakLogout();
  }

  openLogoutModal(): void {
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
    this.router.navigate(['/login']);
  }

}
