import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-hero',
  standalone: true,
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.css']
})
export class HeroComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  goToCoupons(): void {
    this.router.navigate(['/coupons']);
  }

}
