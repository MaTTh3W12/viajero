import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { DataTableConfig } from '../../../service/data-table.model';
import { CouponsMockService } from '../../../service/coupons-mock.service';
import { Coupon } from '../../../service/coupon.interface';
import { AuthService, UserRole } from '../../../service/auth.service';
import { CouponService } from '../../../service/coupon.service';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { FilterBarComponent } from '../../../shared/dashboard/filter-bar/filter-bar.component';

interface CouponRedeemViewModel {
  titulo: string;
  descripcion?: string | null;
  correo?: string | null;
  nombre?: string | null;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
  terminos?: string | null;
  codigo: string;
}

@Component({
  selector: 'app-canje-cupones',
  standalone: true,
  imports: [CommonModule, TopbarComponent, FilterBarComponent],
  templateUrl: './canje-cupones.component.html',
  styleUrls: ['./canje-cupones.component.css']
})

export class CanjeCuponesComponent implements OnInit {
  coupons: Coupon[] = [];
  selectedCoupon: CouponRedeemViewModel | null = null;
  couponLookupError = '';
  redeemError = '';
  showCouponModal = false;
  showRedeemConfirmModal = false;
  showRedeemingModal = false;
  showRedeemSuccessModal = false;
  showAlreadyRedeemedModal = false;
  tableConfig: DataTableConfig<Coupon> = {
    columns: [
      { key: 'titulo', label: 'Título del cupón' },
      { key: 'fechaInicio', label: 'Fecha inicio' },
      { key: 'fechaFin', label: 'Fecha fin' },
      { key: 'disponibles', label: 'Disponibles' },
      { key: 'estado', label: 'Estado', type: 'badge' },
    ],
    actions: [
      {
        iconId: 'coupon-exchange',
        bgClass: 'bg-[#E6EEFF] text-[#538CFF]',
        action: (row) => this.openCouponModal(row),
      },
    ],
  };
  constructor(
    private service: CouponsMockService,
    private auth: AuthService,
    private couponService: CouponService,
    private cdr: ChangeDetectorRef
  ) { }

  clearSelection(): void {
    this.selectedCoupon = null;
    this.couponLookupError = '';
    this.redeemError = '';
    this.cancelRedeemFlow();
  }
  ngOnInit(): void {
    this.service.getCoupons().subscribe((data) => {
      this.coupons = data;
    });
  }

  get role(): UserRole {
    return this.auth.getRole()!;
  }

  openCouponModal(coupon: Coupon): void {
    this.selectedCoupon = {
      titulo: coupon.titulo,
      descripcion: coupon.descripcion,
      fechaInicio: coupon.fechaInicio,
      fechaFin: coupon.fechaFin,
      estado: coupon.estado,
      terminos: coupon.terminos,
      codigo: 'ABC123',
    };
  }

  openQrModal(): void {
    this.showCouponModal = false;
  }

  closeQrModal(): void {
    // El modal de QR ahora lo maneja FilterBar; aquí no hacemos nada
  }

  async handleValidateCode(code: string): Promise<void> {
    const trimmed = code?.trim();
    if (!trimmed) return;

    const token = this.auth.token;
    if (!token) {
      this.couponLookupError = 'Debes iniciar sesión para consultar el cupón.';
      return;
    }

    this.couponLookupError = '';

    try {
      const acquired = await firstValueFrom(
        this.couponService.getCouponWithImageByCode(token, trimmed)
      );

      if (!acquired || !acquired.coupon_with_image_base64) {
        this.selectedCoupon = null;
        this.couponLookupError = this.buildCouponNotFoundMessage();
        this.cdr.detectChanges();
        return;
      }

      const details = acquired.coupon_with_image_base64;

      this.selectedCoupon = {
        titulo: details.title,
        descripcion: details.description,
        fechaInicio: this.toDisplayDate(details.start_date),
        fechaFin: this.toDisplayDate(details.end_date),
        estado: acquired.redeemed ? 'Canjeado' : 'Vigente',
        codigo: acquired.unique_code,
      };

      this.cdr.detectChanges();
    } catch (error) {
      console.error('[CANJE] Error al consultar cupón por código', error);
      this.selectedCoupon = null;
      this.couponLookupError = 'Ocurrió un error al consultar el cupón.';
      this.cdr.detectChanges();
    }
  }

  private buildCouponNotFoundMessage(): string {
    return 'No se encontró un cupón con ese código para esta empresa. Este cupón podría pertenecer a otra empresa.';
  }

  private toDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d}/${m}/${y}`;
    }
    return dateStr;
  }


  closeCouponModal(): void {
    this.showCouponModal = false;
  }

  onConfirmIrreversible(): void {
    if (!this.selectedCoupon) {
      this.couponLookupError = 'Primero escanea o ingresa un cupón.';
      return;
    }
    this.redeemError = '';
    this.showCouponModal = true;
    this.showRedeemConfirmModal = false;
    this.showRedeemingModal = false;
    this.showRedeemSuccessModal = false;
    this.showAlreadyRedeemedModal = false;
  }

  startRedeemReview(): void {
    if (!this.selectedCoupon) return;
    if (this.selectedCoupon.estado === 'Canjeado') {
      this.showCouponModal = false;
      this.showAlreadyRedeemedModal = true;
      return;
    }
    this.showRedeemConfirmModal = true;
  }

  cancelRedeemFlow(): void {
    this.showCouponModal = false;
    this.showRedeemConfirmModal = false;
    this.showRedeemingModal = false;
    this.showRedeemSuccessModal = false;
    this.showAlreadyRedeemedModal = false;
  }

  async confirmRedeem(): Promise<void> {
    if (!this.selectedCoupon) return;
    const token = this.auth.token;
    if (!token) {
      this.redeemError = 'Debes iniciar sesión para canjear el cupón.';
      return;
    }

    const couponCode = this.selectedCoupon.codigo;

    this.showRedeemConfirmModal = false;
    this.showRedeemingModal = true;
    this.redeemError = '';
    this.cdr.detectChanges();

    try {
      const result = await firstValueFrom(
        this.couponService.redeemCouponByCode(token, couponCode).pipe(timeout(15000))
      );

      if (!result) {
        throw new Error('No se recibió confirmación del canje.');
      }

      let redeemedConfirmed = !!result.redeemed && result.validated_by != null;

      if (!redeemedConfirmed) {
        const verifiedCoupon = await firstValueFrom(
          this.couponService.getCouponWithImageByCode(token, couponCode).pipe(timeout(15000))
        );

        if (verifiedCoupon?.redeemed && verifiedCoupon.validated_by != null) {
          redeemedConfirmed = true;
        }
      }

      if (!redeemedConfirmed) {
        throw new Error('No se pudo confirmar la asignación del canje.');
      }

      this.selectedCoupon = {
        ...this.selectedCoupon,
        estado: 'Canjeado',
      };

      this.showRedeemingModal = false;
      this.showRedeemSuccessModal = true;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('[CANJE] Error al canjear cupón', error);
      this.showRedeemingModal = false;
      const message = error instanceof Error ? error.message : 'Ocurrió un error al canjear el cupón.';

      if (message.toLowerCase().includes('canjeado')) {
        this.selectedCoupon = {
          ...this.selectedCoupon,
          estado: 'Canjeado',
        };
        this.showAlreadyRedeemedModal = true;
        this.showCouponModal = false;
        this.cdr.detectChanges();
        return;
      }

      try {
        const verifiedCoupon = await firstValueFrom(
          this.couponService.getCouponWithImageByCode(token, couponCode).pipe(timeout(8000))
        );

        if (verifiedCoupon?.redeemed) {
          this.selectedCoupon = {
            ...this.selectedCoupon,
            estado: 'Canjeado',
          };
          this.showRedeemSuccessModal = true;
          this.cdr.detectChanges();
          return;
        }
      } catch (verificationError) {
        console.error('[CANJE] No fue posible verificar el estado final del cupón', verificationError);
      }

      this.redeemError = 'Ocurrió un error al canjear el cupón.';
      this.showCouponModal = false;
      this.cdr.detectChanges();
    }
  }

  closeSuccessModal(): void {
    this.showRedeemSuccessModal = false;
    this.showCouponModal = false;
  }

  closeAlreadyRedeemed(): void {
    this.showAlreadyRedeemedModal = false;
  }

  validarCupon(coupon: Coupon): void {
    // Aquí iría la lógica real de validación
    alert(`Cupón validado: ${coupon.titulo}`);
    this.closeCouponModal();
  }
}
