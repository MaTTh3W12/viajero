import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';

interface SliderCategoryItem {
  key: string;
  label: string;
  categoryId: number | null;
  icon: string;
  bgColor: string;
  activeIcon?: boolean;
}

@Component({
  selector: 'app-categories-slider',
  standalone: true,
  templateUrl: './categories-slider.component.html',
  styleUrls: ['./categories-slider.component.css']
})
export class CategoriesSliderComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('sliderContainer', { static: true }) sliderContainer!: ElementRef<HTMLDivElement>;
  readonly categories: SliderCategoryItem[] = [
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

  private items: HTMLElement[] = [];
  private currentIndex = 0;
  private autoplayTimer: any = null;
  private readonly AUTOPLAY_INTERVAL = 3000; // ms

  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    // collect direct children as items
    const el = this.sliderContainer.nativeElement;
    this.items = Array.from(el.querySelectorAll(':scope > button')) as HTMLElement[];

    // start autoplay
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  startAutoplay(): void {
    this.stopAutoplay();
    this.autoplayTimer = setInterval(() => this.nextInternal(), this.AUTOPLAY_INTERVAL);
  }

  stopAutoplay(): void {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  pauseAutoplay(): void {
    this.stopAutoplay();
  }

  openCategory(categoryKey: string): void {
    this.pauseAutoplay();
    this.router.navigate(['/coupons'], {
      queryParams: { category: categoryKey },
    });
  }

  resumeAutoplay(): void {
    // resume autoplay after short delay to avoid immediate jump
    if (!this.autoplayTimer) {
      this.autoplayTimer = setInterval(() => this.nextInternal(), this.AUTOPLAY_INTERVAL);
    }
  }

  // Called from template when user clicks next arrow
  next(): void {
    this.pauseAutoplay();
    this.nextInternal();
  }

  // Called from template when user clicks prev arrow
  prev(): void {
    this.pauseAutoplay();
    if (this.items.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
    this.scrollToItem(this.currentIndex);
  }

  private nextInternal(): void {
    if (this.items.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.items.length;
    this.scrollToItem(this.currentIndex);
  }

  private scrollToItem(index: number): void {
    const el = this.sliderContainer.nativeElement;
    const item = this.items[index];
    if (!item) return;

    if (index === 0) {
      el.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }

    // center the item inside the visible container (works for desktop width-limited carousel)
    const containerWidth = el.clientWidth;
    const itemWidth = item.clientWidth;
    const itemLeft = item.offsetLeft;
    const left = Math.max(0, itemLeft - (containerWidth - itemWidth) / 2);
    el.scrollTo({ left, behavior: 'smooth' });
  }

}
