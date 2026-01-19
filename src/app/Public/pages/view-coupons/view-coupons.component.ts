import { Component, OnInit } from '@angular/core';
import { FeaturedDealsComponent } from '../../../shared/components/featured-deals/featured-deals.component';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { ContacUsComponent } from '../../../shared/components/contac-us/contac-us.component';
import { RelatedPagesComponent } from '../../../shared/components/related-pages/related-pages.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';

@Component({
  selector: 'app-view-coupons',
  standalone: true,
  imports: [
    FeaturedDealsComponent,
    NavbarComponent,
    ContacUsComponent,
    RelatedPagesComponent,
    FooterComponent
  ],
  templateUrl: './view-coupons.component.html',
  styleUrls: ['./view-coupons.component.css']
})
export class ViewCouponsComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
