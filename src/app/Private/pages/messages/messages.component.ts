import { Component } from '@angular/core';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { Message, MessageStatus } from '../../../service/message.interface';
import { DataTableConfig } from '../../../service/data-table.model';
import { CouponsMockService } from '../../../service/coupons-mock.service';
import { DataTableComponent } from "../../../shared/dashboard/data-table/data-table.component";
import { AuthService, UserRole } from '../../../service/auth.service';
import { FilterBarComponent } from '../../../shared/dashboard/filter-bar/filter-bar.component';

@Component({
  selector: 'app-messages',
  imports: [
    TopbarComponent,
    DataTableComponent,
    FilterBarComponent
  ],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.css',
})
export class MessagesComponent {
  message: Message[] = [];

  tableConfig: DataTableConfig<Message> = {
    columns: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'correo', label: 'Correo' },
      { key: 'mensaje', label: 'Mensaje' },
      {
        key: 'fecha',
        label: 'Fecha',
        type: 'box',
        boxStyle: 'gray'
      },
      {
        key: 'estado',
        label: 'Estado',
        type: 'badge',

        render: (estado) =>
          estado.type === 'Revisado' && estado.reviewedBy
            ? `Revisado ${estado.reviewedBy}`
            : estado.type,
      },
    ],
    actions: [
      {
        icon: 'assets/icons/eye.svg',
        bgClass: 'bg-[#E6FFF4]',
        action: row => console.log('Ver mensaje', row),
      },
      {
        icon: 'assets/icons/check.svg',
        bgClass: 'bg-[#E6EEFF]',
        action: row => console.log('Marcar como leído', row),
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
    this.service.getMessages().subscribe(data => {
      this.message = data;
    });
  }

  get role(): UserRole {
    return this.auth.getRole()!;
  }
}
