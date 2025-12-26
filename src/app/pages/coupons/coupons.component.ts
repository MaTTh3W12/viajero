import { Component, OnInit } from '@angular/core';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { ContacUsComponent } from '../../shared/components/contac-us/contac-us.component';
import { RelatedPagesComponent } from '../../shared/components/related-pages/related-pages.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { SavingsComponent } from '../../shared/components/savings/savings.component';

@Component({
  selector: 'app-coupons',
  standalone: true,
  imports: [
    NavbarComponent,
    SavingsComponent,
    ContacUsComponent,
    RelatedPagesComponent,
    FooterComponent
  ],
  templateUrl: './coupons.component.html',
  styleUrls: ['./coupons.component.css']
})
export class CouponsComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
