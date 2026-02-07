import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../../service/auth.service';
import { CurrentUser } from '../../../service/current-user.interface';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { UiService } from '../../../service/ui.service';

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
export class TopbarComponent {
  @Input() location: string = '';
  user: CurrentUser | null;
  role: 'admin' | 'empresa' | null;
  menuOpen = false;
  showLogoutModal = false;
  isLoggingOut = false;
  isLoggedOutSuccess = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private uiService: UiService
  ) {
    this.user = this.auth.getCurrentUser();
    this.role = this.user?.role ?? null;
  }

  toggleSidebar() {
    this.uiService.toggleSidebar();
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
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
    setTimeout(() => {
      this.auth.logout();
      this.isLoggingOut = false;
      this.isLoggedOutSuccess = true;
      this.cdr.detectChanges();
    }, 3000);
  }

  finishLogout() {
    this.closeLogoutModal();
    this.router.navigate(['/']);
  }

  get bgClass() {
    return this.role === 'admin'
      ? 'bg-[#1A2440]'     // azul oscuro (admin)
      : 'bg-[#538CFF]';    // celeste (empresa)
  }

}
