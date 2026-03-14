import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { RelatedPagesComponent } from '../../../shared/components/related-pages/related-pages.component';
import { FeaturedDealsComponent } from '../../../shared/components/featured-deals/featured-deals.component';
import { ContacUsComponent } from '../../../shared/components/contac-us/contac-us.component';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [
    NavbarComponent,
    FeaturedDealsComponent,
    RelatedPagesComponent,
    FooterComponent,
    ContacUsComponent
  ],
  templateUrl: './about-us.component.html',
  styleUrls: ['./about-us.component.css']
})
export class AboutUsComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  goToCoupons(): void {
    this.router.navigate(['/coupons']);
  }

}
