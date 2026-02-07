import { Component } from '@angular/core';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { DataTableComponent } from '../../../shared/dashboard/data-table/data-table.component';
import { DataTableConfig } from '../../../service/data-table.model';
import { CouponsMockService } from '../../../service/coupons-mock.service';
import { Coupon } from '../../../service/coupon.interface';
import { FilterBarComponent } from '../../../shared/dashboard/filter-bar/filter-bar.component';
import { AuthService, UserRole } from '../../../service/auth.service';

@Component({
  selector: 'app-coupons-list',
  standalone: true,
  imports: [
    TopbarComponent,
    DataTableComponent,
    FilterBarComponent
  ],
  templateUrl: './coupons-list.component.html',
  styleUrl: './coupons-list.component.css',
})
export class CouponsListComponent {
  coupons: Coupon[] = [];

  tableConfig: DataTableConfig<Coupon> = {
    columns: [
      { key: 'titulo', label: 'Título' },
      { key: 'descripcion', label: 'Empresa' },
      { key: 'categoria', label: 'Categoría' },
      { key: 'fechaInicio', label: 'Fecha Inicio' },
      { key: 'fechaFin', label: 'Fecha Fin' },
      { key: 'disponibles', label: 'Disponibles' },
      { key: 'estado', label: 'Estado', type: 'badge' },
    ],
    actions: [
      {
        iconId: 'edit',
        bgClass: 'bg-[#E6EEFF] text-[#538CFF]',
        show: row => row.estado === 'Publicado' || row.estado === 'Borrador',
        action: row => console.log('Editar', row),
      },
      {
        iconId: 'trash',
        bgClass: 'bg-[#F8D7DA] text-[#C82333]',
        show: row => row.estado === 'Borrador',
        action: row => console.log('Eliminar', row),
      },
    ],
  };

  constructor(private service: CouponsMockService, private auth: AuthService) { }

  ngOnInit() {
    this.service.getCoupons().subscribe(data => {
      this.coupons = data;
    });
  }

  get role(): UserRole {
    return this.auth.getRole()!;
  }
}
