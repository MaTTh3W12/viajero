import { Component } from '@angular/core';
import { AuthService, UserRole } from '../../../service/auth.service';
import { CouponsMockService } from '../../../service/coupons-mock.service';
import { FilterBarComponent } from '../../../shared/dashboard/filter-bar/filter-bar.component';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { DataTableComponent } from '../../../shared/dashboard/data-table/data-table.component';
import { User } from '../../../service/user.interface';
import { DataTableConfig } from '../../../service/data-table.model';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    TopbarComponent,
    FilterBarComponent,
    DataTableComponent
  ],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css',
})
export class UserListComponent {
  users: User[] = [];

  tableConfig: DataTableConfig<User> = {
    columns: [
      { key: 'nombre', label: 'Nombre/Razón social' },
      { key: 'tipoCuenta', label: 'Tipo de cuenta', type: 'badge'},
      { key: 'email', label: 'Correo electrónico' },
      { key: 'estado', label: 'Estado', type: 'badge' },
    ],
    actions: [
      {
        iconId: 'edit',
        bgClass: 'bg-[#E6EEFF] text-[#538CFF]',
        action: () => undefined,
      }]
  };

  constructor(private service: CouponsMockService, private auth: AuthService) { }

  get role(): UserRole {
    return this.auth.getRole()!;
  }

  ngOnInit() {
    this.service.getUsers().subscribe(data => {
      this.users = data;
    });
  }
}
