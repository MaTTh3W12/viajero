import { Component } from '@angular/core';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { DataTableComponent } from '../../../shared/dashboard/data-table/data-table.component';
import { Company } from '../../../service/companies.interface';
import { DataTableConfig } from '../../../service/data-table.model';
import { CouponsMockService } from '../../../service/coupons-mock.service';
import { FilterBarComponent } from '../../../shared/dashboard/filter-bar/filter-bar.component';
import { AuthService, UserRole } from '../../../service/auth.service';

@Component({
  selector: 'app-companies',
  imports: [
    TopbarComponent,
    FilterBarComponent,
    DataTableComponent
  ],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.css',
})
export class CompaniesComponent {
  companies: Company[] = [];

  tableConfig: DataTableConfig<Company> = {
    columns: [
      { key: 'empresa', label: 'Empresa' },
      { key: 'documentoLegal', label: 'Documento Legal'},
      { key: 'coreo', label: 'Correo' },
      { key: 'estado', label: 'Estado', type: 'badge' },
    ],
    actions: [
      {
        iconId: 'tick-square',
        bgClass: 'bg-[#E6EEFF] text-[#538CFF]',
        show: row => row.estado === 'Pendiente',
        action: row => console.log('Aprobar', row),
      },
      {
        iconId: 'close-circle',
        bgClass: 'bg-[#E6EEFF] text-[#1A2440]',
        show: row => row.estado === 'Pendiente',
        action: row => console.log('Rechazar', row),
      },
      {
        iconId: 'edit',
        bgClass: 'bg-[#E6EEFF] text-[#538CFF]',
        show: row => row.estado === 'Activa',
        action: row => console.log('Editar', row),
      },
    ],
  };

  constructor(private service: CouponsMockService, private auth: AuthService) { }

  ngOnInit() {
    this.service.getCompanies().subscribe(data => {
      this.companies = data;
    });
  }

  get role(): UserRole {
    return this.auth.getRole()!;
  }
}
