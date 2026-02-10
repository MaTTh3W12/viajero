import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../service/auth.service';

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
export class NavbarComponent implements OnInit {
  open = false;
  isRegisterDropdownOpen = false;
  showLogoutModal = false;
  isLoggingOut = false;

  constructor(
    private router: Router,
    private auth: AuthService
  ) { }

  ngOnInit(): void {
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

}
