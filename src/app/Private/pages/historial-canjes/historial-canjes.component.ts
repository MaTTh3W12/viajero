import { AuthService, UserRole } from '../../../service/auth.service';
import { Component } from '@angular/core';
import { DataTableConfig } from '../../../service/data-table.model';
import { CommonModule } from '@angular/common';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { FilterBarComponent } from '../../../shared/dashboard/filter-bar/filter-bar.component';
import { DataTableComponent } from '../../../shared/dashboard/data-table/data-table.component';

@Component({
  selector: 'app-historial-canjes',
  standalone: true,
  imports: [CommonModule, TopbarComponent, FilterBarComponent, DataTableComponent],
  templateUrl: './historial-canjes.component.html',
  styleUrls: ['./historial-canjes.component.css'],
})
export class HistorialCanjesComponent {
  role: UserRole;
  constructor(private auth: AuthService) {
    this.role = this.auth.getRole()!;
  }
  historial = [
    { titulo: 'Descuento en tipo sedán', inicio: '12/12/2025', fin: '22/01/2026', categoria: 'Turismo', usuario: 'Pedro Escamoso', estado: 'Canjeado' },
    { titulo: 'Descuento en tipo sedán', inicio: '12/12/2025', fin: '22/01/2026', categoria: 'Turismo', usuario: 'Paquita del Barrio', estado: 'Canjeado' },
    { titulo: 'Descuento en tipo sedán', inicio: '12/12/2025', fin: '22/01/2026', categoria: 'Productos y servicios', usuario: 'Snoop Dog', estado: 'Canjeado' },
    { titulo: 'Descuento en tipo sedán', inicio: '12/12/2025', fin: '22/01/2026', categoria: 'Productos nostálgicos', usuario: 'Camila Cabello', estado: 'Canjeado' },
    { titulo: 'Descuento en tipo sedán', inicio: '12/12/2025', fin: '22/01/2026', categoria: 'Turismo', usuario: 'Bruno Mars', estado: 'Canjeado' },
    { titulo: 'Descuento en tipo sedán', inicio: '12/12/2025', fin: '22/01/2026', categoria: 'Transporte', usuario: 'Luis Miguel', estado: 'Canjeado' },
    { titulo: 'Descuento en tipo sedán', inicio: '12/12/2025', fin: '22/01/2026', categoria: 'Turismo', usuario: 'Shakira Shakira', estado: 'Canjeado' },
  ];

  tableConfig: DataTableConfig<any> = {
    columns: [
      { key: 'titulo', label: 'Título del cupón' },
      { key: 'inicio', label: 'Fecha inicio' },
      { key: 'fin', label: 'Fecha fin' },
      { key: 'categoria', label: 'Categoría del cupón' },
      { key: 'usuario', label: 'Usuario' },
      { key: 'estado', label: 'Estado', type: 'badge' },
    ],
    actions: []
  };
}
