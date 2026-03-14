import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
      key: 'turismo',
      label: 'Turismo',
      categoryId: 3,
      icon: 'assets/icons/sunbed.svg',
      bgColor: '#D8D7FF',
    },
    {
      key: 'entretenimiento',
      label: 'Entretenimiento',
      categoryId: 4,
      icon: 'assets/icons/gift-bag1.svg',
      bgColor: '#FFD5D6',
    },
    {
      key: 'cuidado-personal',
      label: 'Cuidado personal',
      categoryId: 5,
      icon: 'assets/icons/lotus1.svg',
      bgColor: '#D3F6D2',
    },
    {
      key: 'productos-nostalgicos',
      label: 'Productos nostálgicos',
      categoryId: 6,
      icon: 'assets/icons/product-quality1.svg',
      bgColor: '#FFD5D6',
    },
    {
      key: 'productos-servicios',
      label: 'Productos y servicios',
      categoryId: 7,
      icon: 'assets/icons/gift-bag1.svg',
      bgColor: '#FFC6B3',
    },
    {
      key: 'tour-operadores',
      label: 'Tour operadores',
      categoryId: 8,
      icon: 'assets/icons/traveler1.svg',
      bgColor: '#CAFFFB',
    },
    {
      key: 'transporte',
      label: 'Transporte',
      categoryId: 9,
      icon: 'assets/icons/bus1.svg',
      bgColor: '#CAFFDC',
    },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) { }

  isActive(cat: string) {
    return this.selectedCategory === cat;
  }

  selectCategory(cat: string, syncQueryParam = true) {
    this.selectedCategory = cat;
    const selected = this.categoryFilters.find((item) => item.key === cat);
    this.selectedCategoryId = selected?.categoryId ?? null;

    if (syncQueryParam) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { category: cat === 'all' ? null : cat },
        queryParamsHandling: 'merge',
      });
    }
  }

  onCouponsFound(total: number): void {
    this.foundCoupons = total;
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const requestedCategory = params.get('category') ?? 'all';
      const hasCategory = this.categoryFilters.some((item) => item.key === requestedCategory);
      this.selectCategory(hasCategory ? requestedCategory : 'all', false);
    });
  }

}
