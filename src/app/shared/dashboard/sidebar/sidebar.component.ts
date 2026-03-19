import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UiService } from '../../../service/ui.service';
import { AuthService } from '../../../service/auth.service';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit {
  isSidebarOpen = false;
  isAdmin = false;
  isEmpresa = false;
  private sidebarSub?: Subscription;
  private routerSub?: Subscription;

  constructor(
    private uiService: UiService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.sidebarSub = this.uiService.isSidebarOpen$.subscribe((isOpen: boolean) => {
      this.isSidebarOpen = isOpen;
    });

    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.closeSidebarOnMobile();
      });

    // Obtener rol actual
    this.isAdmin = this.auth.isAdmin();
    this.isEmpresa = this.auth.isEmpresa();

    // Abrir por defecto en escritorio
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop) {
      this.uiService.openSidebar();
    }
  }

  ngOnDestroy(): void {
    this.sidebarSub?.unsubscribe();
    this.routerSub?.unsubscribe();
  }

  toggleSidebar() {
    this.uiService.toggleSidebar();
  }

  closeSidebarOnMobile(): void {
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop || !this.isSidebarOpen) {
      return;
    }

    this.uiService.closeSidebar();
  }
}
