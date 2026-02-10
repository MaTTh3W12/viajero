import { Component, ViewChild } from '@angular/core';
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
  @ViewChild(FilterBarComponent) filterBar!: FilterBarComponent;

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
        action: row => this.openEdit(row),
      },
      {
        iconId: 'trash',
        bgClass: 'bg-[#F8D7DA] text-[#C82333]',
        show: row => row.estado === 'Borrador',
        action: row => this.openDelete(row),
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

  onCreateCoupon(payload: {
    titulo: string;
    cantidad: number | null;
    descripcion: string;
    fechaInicio: string;
    fechaFin: string;
    categoria: string;
    terminos: string;
    estado: string;
  }): void {
    const nuevo: Coupon = {
      id: Date.now(),
      titulo: payload.titulo,
      descripcion: payload.descripcion,
      categoria: payload.categoria,
      fechaInicio: payload.fechaInicio,
      fechaFin: payload.fechaFin,
      disponibles: payload.cantidad ?? 0,
      estado: payload.estado,
      terminos: payload.terminos ? payload.terminos.split('\n').filter(t => t.trim() !== '') : [],
    };
    this.coupons = [nuevo, ...this.coupons];
    console.log('Cupón creado', nuevo);
  }

  onUpdateCoupon(updated: Coupon): void {
    this.coupons = this.coupons.map(c => (c.id === updated.id ? updated : c));
    console.log('Cupón actualizado', updated);
  }

  openEdit(row: Coupon): void {
    if (this.filterBar) {
      this.filterBar.openEditCoupon(row);
    }
  }

  onDeleteCoupon(id: number): void {
    this.coupons = this.coupons.filter(c => c.id !== id);
    console.log('Cupón eliminado', id);
  }

  openDelete(row: Coupon): void {
    if (this.filterBar) {
      this.filterBar.openDeleteCoupon(row);
    }
  }
}
