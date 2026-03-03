import { Component, OnInit } from '@angular/core';
import { DataTableConfig } from '../../../service/data-table.model';
import { CouponsMockService } from '../../../service/coupons-mock.service';
import { Coupon } from '../../../service/coupon.interface';
import { AuthService, UserRole } from '../../../service/auth.service';

import { CommonModule } from '@angular/common';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { FilterBarComponent } from '../../../shared/dashboard/filter-bar/filter-bar.component';


type CouponWithCodigo = Coupon & { codigo?: string };

@Component({
  selector: 'app-canje-cupones',
  standalone: true,
  imports: [CommonModule, TopbarComponent, FilterBarComponent],
  templateUrl: './canje-cupones.component.html',
  styleUrls: ['./canje-cupones.component.css']
})

export class CanjeCuponesComponent implements OnInit {
  coupons: Coupon[] = [];
  selectedCoupon: CouponWithCodigo | null = null;
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

  showCouponModal = false;
  // no modal for coupon details now
  showQrModal = false;

  constructor(private service: CouponsMockService, private auth: AuthService) { }

  clearSelection(): void {
    this.selectedCoupon = null;
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
      ...coupon,
      codigo: 'ABC123', // Código ficticio para demo
      estado: 'Válido', // Estado ficticio para demo
    };
  }

  openQrModal(): void {
    this.showQrModal = true;
  }

  closeQrModal(): void {
    this.showQrModal = false;
  }

  handleValidateCode(code: string): void {
    // mock lookup: load coupon data into panel
    console.log('[CANJE] validate code', code);
    this.selectedCoupon = {
      ...{ titulo: 'Descuento en almuerzos' },
      codigo: code,
      estado: 'Válido',
    } as any;
  }


  closeCouponModal(): void {
    this.showCouponModal = false;
    this.selectedCoupon = null;
  }

  validarCupon(coupon: Coupon): void {
    // Aquí iría la lógica real de validación
    alert(`Cupón validado: ${coupon.titulo}`);
    this.closeCouponModal();
  }
}
