import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { ContacUsComponent } from '../../../shared/components/contac-us/contac-us.component';
import { RelatedPagesComponent } from '../../../shared/components/related-pages/related-pages.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { SavingsComponent } from '../../../shared/components/savings/savings.component';

interface CouponCategoryFilter {
  key: string;
  label: string;
  categoryId: number | null;
  icon: string;
  bgColor: string;
  activeIcon?: boolean;
}

@Component({
  selector: 'app-coupons',
  standalone: true,
  imports: [
    NavbarComponent,
    SavingsComponent,
    ContacUsComponent,
    RelatedPagesComponent,
    FooterComponent,
    CommonModule
  ],
  templateUrl: './coupons.component.html',
  styleUrls: ['./coupons.component.css']
})
export class CouponsComponent implements OnInit {

  selectedCategory = 'all';
  selectedCategoryId: number | null = null;
  sortBy: 'recent' = 'recent';
  foundCoupons = 0;
  readonly categoryFilters: CouponCategoryFilter[] = [
    {
      key: 'all',
      label: 'Todos los cupones',
      categoryId: null,
      icon: 'assets/icons/coupon1.svg',
      bgColor: '#1438A0',
      activeIcon: true,
    },
    {
      key: 'alojamiento',
      label: 'Alojamiento',
      categoryId: 1,
      icon: 'assets/icons/double-bed.svg',
      bgColor: '#FFF8D2',
    },
    {
      key: 'alimentos',
      label: 'Alimentos y bebidas',
      categoryId: 2,
      icon: 'assets/icons/dinner.svg',
      bgColor: '#ABE9FF',
    },
    {
      key: 'entretenimiento',
      label: 'Entretenimiento',
      categoryId: 4,
      icon: 'assets/icons/gift-bag1.svg',
      bgColor: '#FFD5D6',
    },
    {
      key: 'turismo',
      label: 'Turismo',
      categoryId: 3,
      icon: 'assets/icons/sunbed.svg',
      bgColor: '#D8D7FF',
    },
  ];

  constructor() { }

  isActive(cat: string) {
    return this.selectedCategory === cat;
  }

  selectCategory(cat: string) {
    this.selectedCategory = cat;
    const selected = this.categoryFilters.find((item) => item.key === cat);
    this.selectedCategoryId = selected?.categoryId ?? null;
  }

  onCouponsFound(total: number): void {
    this.foundCoupons = total;
  }

  ngOnInit(): void {
  }

}
