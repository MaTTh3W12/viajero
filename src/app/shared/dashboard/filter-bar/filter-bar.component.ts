import { Component, Input } from '@angular/core';
import { FilterVariant } from '../../../service/filter-bar.types';
import { UserRole } from '../../../service/auth.service';

const FILTER_BG_MAP: Record<UserRole, Record<FilterVariant, string>> = {
  admin: {
    users:     'bg-[#D4FFF1]', // Todos los usuarios
    audit:     'bg-[#FFE3C1]', // Auditoría
    category:  'bg-[#FFE2DB]', // Categorías
    coupons:   'bg-[#C8E7FF]', // Todos los cupones
    messages:  'bg-[#D4FFF1]', // Mensajes
    companies: 'bg-[#D4D6FF]', // Empresas
  },
  empresa: {
    users:     'bg-[#D4FFF1]', // Todos los usuarios
    audit:     'bg-[#FFE3C1]', // Auditoría
    category:  'bg-[#FFE2DB]', // Categorías
    coupons:   'bg-[#C8E7FF]', // Todos los cupones
    messages:  'bg-[#D4FFF1]', // Mensajes
    companies: 'bg-[#D4D6FF]', // Empresas
  },
  usuario: {
    users:     'bg-[#D4FFF1]',
    audit:     'bg-[#FFE3C1]',
    category:  'bg-[#FFE2DB]',
    coupons:   'bg-[#C8E7FF]',
    messages:  'bg-[#D4FFF1]',
    companies: 'bg-[#D4D6FF]',
  },
};

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [],
  templateUrl: './filter-bar.component.html',
  styleUrl: './filter-bar.component.css',
})
export class FilterBarComponent {
  @Input({ required: true }) variant!: FilterVariant;
  @Input({ required: true }) role!: UserRole;

  auditTypeOpen = false;
  auditTypeSelected = 'Seleccionar tipo';
  auditTypeOptions = ['Desactivación', 'Aprobación'];

  selectAuditType(option: string): void {
    this.auditTypeSelected = option;
    this.auditTypeOpen = false;
  }

  openDatePicker(input: HTMLInputElement): void {
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    }
    input.focus();
  }

  get bgClass(): string {
    return FILTER_BG_MAP[this.role]?.[this.variant] ?? 'bg-[#E6EFFF]';
  }
}
