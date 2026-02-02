import { Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';
import { AuthService } from '../../../service/auth.service';
import { CurrentUser } from '../../../service/current-user.interface';
import { CommonModule } from '@angular/common';

type TopbarVariant =
  | 'dashboard'
  | 'coupons'
  | 'messages'
  | 'companies';

@Component({
  selector: 'app-topbar',
  imports: [CommonModule],
  standalone: true,
   schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css',
})
export class TopbarComponent {
  @Input() location: string = '';
  user: CurrentUser | null;
  role: 'admin' | 'empresa' | null;
  menuOpen = false;

  constructor(private auth: AuthService) {
    this.user = this.auth.getCurrentUser();
    this.role = this.user?.role ?? null;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  logout() {
    this.auth.logout();
  }

  get bgClass() {
    return this.role === 'admin'
      ? 'bg-[#1A2440]'     // azul oscuro (admin)
      : 'bg-[#538CFF]';    // celeste (empresa)
  }

}
