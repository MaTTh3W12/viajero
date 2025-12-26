import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-categories-slider',
  standalone: true,
  templateUrl: './categories-slider.component.html',
  styleUrls: ['./categories-slider.component.css']
})
export class CategoriesSliderComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('sliderContainer', { static: true }) sliderContainer!: ElementRef<HTMLDivElement>;

  private items: HTMLElement[] = [];
  private currentIndex = 0;
  private autoplayTimer: any = null;
  private readonly AUTOPLAY_INTERVAL = 3000; // ms

  constructor() { }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    // collect direct children as items
    const el = this.sliderContainer.nativeElement;
    this.items = Array.from(el.querySelectorAll(':scope > div')) as HTMLElement[];

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

    // center the item inside the visible container (works for desktop width-limited carousel)
    const containerWidth = el.clientWidth;
    const itemWidth = item.clientWidth;
    const itemLeft = item.offsetLeft;
    const left = Math.max(0, itemLeft - (containerWidth - itemWidth) / 2);
    el.scrollTo({ left, behavior: 'smooth' });
  }

}
