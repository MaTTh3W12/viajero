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
    DataTableComponent,
    FilterBarComponent
  ],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.css',
})
export class CompaniesComponent {
  companies: Company[] = [];

  tableConfig: DataTableConfig<Company> = {
    columns: [
      { key: 'empresa', label: 'Empresa' },
      {
        key: 'categoria',
        label: 'Categoría',
        type: 'box',
        boxStyle: 'blue'
      },
      { key: 'telefono', label: 'Teléfono' },
      { key: 'coreo', label: 'Correo' },
      { key: 'direccion', label: 'Dirección' },
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
