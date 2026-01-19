import { Component } from '@angular/core';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { DataTableComponent } from '../../../shared/dashboard/data-table/data-table.component';
import { DataTableConfig } from '../../../service/data-table.model';
import { CouponsMockService } from '../../../service/coupons-mock.service';
import { Coupon } from '../../../service/coupon.interface';

@Component({
  selector: 'app-coupons-list',
  standalone: true,
  imports: [
    TopbarComponent,
    DataTableComponent
  ],
  templateUrl: './coupons-list.component.html',
  styleUrl: './coupons-list.component.css',
})
export class CouponsListComponent {
  coupons: Coupon[] = [];

  tableConfig: DataTableConfig<Coupon> = {
    columns: [
      { key: 'empresa', label: 'Empresa' },
      { key: 'titulo', label: 'Título' },
      { key: 'descuento', label: 'Porcentaje/Precio', type: 'box', boxStyle: 'blue' },
      { key: 'disponibles', label: 'Disponibles', type: 'box', boxStyle: 'gray' },
      { key: 'adquiridos', label: 'Adquiridos', type: 'box', boxStyle: 'gray' },
      { key: 'expiracion', label: 'Expiración', type: 'box', boxStyle: 'expiration' },
      { key: 'estado', label: 'Estado', type: 'badge' },
    ],
    actions: [
      {
        icon: 'assets/icons/eye.svg',
        bgClass: 'bg-[#E6FFF4]',
        action: row => console.log('Ver', row),
      },
      {
        icon: 'assets/icons/edit-2.svg',
        bgClass: 'bg-[#E6EEFF]',
        action: row => console.log('Editar', row),
      },
      {
        icon: 'assets/icons/trash.png',
        bgClass: 'bg-[#FFE6E0]',
        action: row => console.log('Eliminar', row),
      },
    ],
  };

  constructor(private service: CouponsMockService) { }

  ngOnInit() {
    this.service.getCoupons().subscribe(data => {
      this.coupons = data;
    });
  }
}
