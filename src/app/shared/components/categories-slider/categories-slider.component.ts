import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { Category, CategoryService } from '../../../service/category.service';
import { ALL_CATEGORY_VISUAL, resolveCategoryVisual, toCategorySlug } from '../../../service/category-visuals';

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
  private readonly allCategory: SliderCategoryItem = {
    key: 'all',
    label: 'Todos los cupones',
    categoryId: null,
    icon: ALL_CATEGORY_VISUAL.icon,
    bgColor: ALL_CATEGORY_VISUAL.bgColor,
    activeIcon: ALL_CATEGORY_VISUAL.activeIcon,
  };
  categories: SliderCategoryItem[] = [this.allCategory];

  private items: HTMLElement[] = [];
  private currentIndex = 0;
  private autoplayTimer: any = null;
  private viewReady = false;
  private categoriesLoaded = false;
  private readonly AUTOPLAY_INTERVAL = 3000; // ms
  private readonly CATEGORY_PAGE_SIZE = 200;

  constructor(
    private router: Router,
    private categoryService: CategoryService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    void this.loadCategories();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.collectItems();
    this.syncAutoplayState();
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

    const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = Math.min(maxLeft, Math.max(0, item.offsetLeft - 16));
    el.scrollTo({ left, behavior: 'smooth' });
  }

  private async loadCategories(): Promise<void> {
    const rows = await this.fetchAllCategories();
    const usedKeys = new Set<string>();

    const dynamicCategories = rows
      .map((category) => {
        const categoryId = Number(category.id);
        if (!Number.isFinite(categoryId)) return null;

        const categoryName = this.normalizeCategoryName(category.name ?? '');
        if (!categoryName) return null;

        const slug = this.toCategorySlug(categoryName);
        const keyBase = slug || `category-${categoryId}`;
        const key = usedKeys.has(keyBase) ? `${keyBase}-${categoryId}` : keyBase;
        usedKeys.add(key);

        const visual = this.resolveCategoryVisual(categoryName, category.icon);

        return {
          key,
          label: categoryName,
          categoryId,
          icon: visual.icon,
          bgColor: visual.bgColor,
          activeIcon: visual.activeIcon,
        } as SliderCategoryItem;
      })
      .filter((category): category is SliderCategoryItem => category !== null);

    this.categories = [this.allCategory, ...dynamicCategories];
    this.categoriesLoaded = true;
    this.currentIndex = 0;
    this.cdr.detectChanges();
    this.sliderContainer?.nativeElement?.scrollTo({ left: 0, behavior: 'auto' });
    this.collectItems();
    this.syncAutoplayState();
  }

  private async fetchAllCategories(): Promise<Category[]> {
    const categories: Category[] = [];
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;

    while (offset < total) {
      const result = await firstValueFrom(
        this.categoryService.getCategoriesPaged(undefined, {
          limit: this.CATEGORY_PAGE_SIZE,
          offset,
          where: {
            _and: [
              { active: { _eq: true } },
              { name: { _ilike: '%%' } },
            ],
          },
        }).pipe(timeout(15000))
      ).catch(() => ({ rows: [], total: 0 }));

      if (!result.rows.length) break;

      categories.push(...result.rows);
      total = result.total ?? categories.length;
      offset += result.rows.length;
    }

    return categories;
  }

  private collectItems(): void {
    if (!this.viewReady) return;

    requestAnimationFrame(() => {
      const el = this.sliderContainer.nativeElement;
      this.items = Array.from(el.querySelectorAll(':scope > button')) as HTMLElement[];
      if (this.currentIndex >= this.items.length) {
        this.currentIndex = 0;
      }
      this.syncAutoplayState();
    });
  }

  private syncAutoplayState(): void {
    const shouldAutoplay = this.viewReady && this.categoriesLoaded && this.items.length > 1;
    if (shouldAutoplay && !this.autoplayTimer) {
      this.startAutoplay();
      return;
    }

    if (!shouldAutoplay) {
      this.stopAutoplay();
    }
  }

  onIconError(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (!image) return;
    image.src = 'assets/icons/coupon1.svg';
  }

  private resolveCategoryVisual(
    categoryName: string,
    endpointIcon?: string | null
  ): { icon: string; bgColor: string; activeIcon?: boolean } {
    return resolveCategoryVisual(categoryName, endpointIcon);
  }

  private normalizeCategoryName(value: string): string {
    return value
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private toCategorySlug(value: string): string {
    return toCategorySlug(value);
  }

}
