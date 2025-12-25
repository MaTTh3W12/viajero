import { Component, OnInit } from '@angular/core';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { RelatedPagesComponent } from '../../shared/components/related-pages/related-pages.component';
import { FeaturedDealsComponent } from '../../shared/components/featured-deals/featured-deals.component';
import { ContacUsComponent } from '../../shared/components/contac-us/contac-us.component';


@Component({
  selector: 'app-view-cupon',
  imports: [
    FeaturedDealsComponent,
    NavbarComponent,
    ContacUsComponent,
    RelatedPagesComponent,
    FooterComponent
  ],
  templateUrl: './view-cupon.html',
  styleUrl: './view-cupon.css',
})
export class ViewCupon {

  constructor() { }

  ngOnInit(): void {
  }
}
