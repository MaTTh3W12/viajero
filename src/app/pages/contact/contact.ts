import { Component, OnInit } from '@angular/core';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { RelatedPagesComponent } from '../../shared/components/related-pages/related-pages.component';
import { ContacUsComponent } from '../../shared/components/contac-us/contac-us.component';

@Component({
  selector: 'app-contact',
  imports: [
    NavbarComponent,
    FooterComponent,
    RelatedPagesComponent,
    ContacUsComponent
  ],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {

}
