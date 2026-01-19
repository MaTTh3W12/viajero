import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';

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

  constructor(private router: Router) { }

  ngOnInit(): void {
  }

    isCouponsActive(): boolean {
    return (
      this.router.url.startsWith('/coupons') ||
      this.router.url.startsWith('/view-coupons')
    );
  }

}
