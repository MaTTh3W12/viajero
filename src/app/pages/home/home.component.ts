import { Component, OnInit } from '@angular/core';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { HeroComponent } from '../../shared/components/hero/hero.component';
import { CategoriesSliderComponent } from '../../shared/components/categories-slider/categories-slider.component';
import { SavingsComponent } from '../../shared/components/savings/savings.component';
import { FeaturedDealsComponent } from '../../shared/components/featured-deals/featured-deals.component';
import { AboutUsComponent } from '../../shared/components/about-us/about-us.component';
import { ContacUsComponent } from '../../shared/components/contac-us/contac-us.component';
import { RelatedPagesComponent } from '../../shared/components/related-pages/related-pages.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    NavbarComponent,
    HeroComponent,
    CategoriesSliderComponent,
    SavingsComponent,
    FeaturedDealsComponent,
    AboutUsComponent,
    ContacUsComponent,
    RelatedPagesComponent,
    FooterComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
