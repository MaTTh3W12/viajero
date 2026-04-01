import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { HeroComponent } from '../../../shared/components/hero/hero.component';
import { CategoriesSliderComponent } from '../../../shared/components/categories-slider/categories-slider.component';
import { SavingsComponent } from '../../../shared/components/savings/savings.component';
import { FeaturedDealsComponent } from '../../../shared/components/featured-deals/featured-deals.component';
import { AboutUsComponent } from '../../../shared/components/about-us/about-us.component';
import { ContacUsComponent } from '../../../shared/components/contac-us/contac-us.component';
import { RelatedPagesComponent } from '../../../shared/components/related-pages/related-pages.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { SeoService } from '../../../service/seo.service';

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
    FooterComponent,
    RouterLink
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  constructor(private seo: SeoService) { }

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Inicio',
      description: 'Descubre y adquiere cupones exclusivos para la diáspora salvadoreña. Ahorra en tours, restaurantes y experiencias únicas en El Salvador.',
      canonical: '/'
    });
  }

}
