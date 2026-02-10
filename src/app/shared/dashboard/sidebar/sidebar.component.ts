import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UiService } from '../../../service/ui.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit {
  isSidebarOpen = false;

  constructor(private uiService: UiService) {}

  ngOnInit() {
    this.uiService.isSidebarOpen$.subscribe((isOpen: boolean) => {
      this.isSidebarOpen = isOpen;
    });

    // Abrir por defecto en escritorio
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop) {
      this.uiService.openSidebar();
    }
  }

  toggleSidebar() {
    this.uiService.toggleSidebar();
  }
}
