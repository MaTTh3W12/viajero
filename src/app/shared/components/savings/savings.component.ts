import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Coupon, CouponService } from '../../../service/coupon.service';
import { finalize, take, timeout } from 'rxjs';

@Component({
  selector: 'app-savings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './savings.component.html',
  styleUrls: ['./savings.component.css']
})
export class SavingsComponent implements OnInit {
  coupons: Coupon[] = [];
  loading = false;
  error = '';
  readonly fixedCouponTitle = 'EL SALVADOR TOURS';
  readonly fixedAddress = 'San Salvador, El Salvador';

  private readonly cardImages = [
    'assets/img/card1.png',
    'assets/img/card2.png',
    'assets/img/card3.png',
    'assets/img/card4.png',
  ];

  constructor(
    private couponService: CouponService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadCoupons();
  }

  getCardImage(index: number): string {
    return this.cardImages[index % this.cardImages.length];
  }

  getDiscountLabel(coupon: Coupon): string {
    const discount = this.parseNumeric(coupon.price_discount);
    if (discount == null || discount <= 0) {
      return '0% OFF';
    }

    const price = this.parseNumeric(coupon.price);
    if (price != null && price > discount) {
      const percentOff = Math.round(((price - discount) / price) * 100);
      if (percentOff > 0) {
        return `${percentOff}% OFF`;
      }
    }

    return `$${discount.toFixed(0)} OFF`;
  }

  formatExpirationDate(endDate: string): string {
    const parsed = endDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!parsed) return 'Vence: Fecha no disponible';

    const [, year, month, day] = parsed;
    const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const monthIndex = Number(month) - 1;
    const monthName = monthNames[monthIndex] ?? month;
    return `Vence: ${day} ${monthName} ${year}`;
  }

  private loadCoupons(): void {
    this.loading = true;
    this.error = '';

    this.couponService
      .getPublicCoupons({ limit: 40, offset: 0 })
      .pipe(
        take(1),
        timeout(15000),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.coupons = (response.rows ?? []).filter((coupon) => coupon.published);
        },
        error: (error) => {
          console.error('[SAVINGS] Error loading public coupons', error);
          this.error = 'No se pudieron cargar los cupones en este momento.';
          this.coupons = [];
        },
      });
  }

  private parseNumeric(value: string | null): number | null {
    if (value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

}
