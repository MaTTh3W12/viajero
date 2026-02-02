import { Component, Input } from '@angular/core';
import { FilterVariant } from '../../../service/filter-bar.types';
import { UserRole } from '../../../service/auth.service';

const FILTER_BG_MAP: Record<UserRole, Record<FilterVariant, string>> = {
  admin: {
    coupons:   'bg-[#C8E7FF]', // Todos los cupones
    messages:  'bg-[#D4FFF1]', // Mensajes
    companies: 'bg-[#D4D6FF]', // Empresas
  },
  empresa: {
    coupons:   'bg-[#C8E7FF]', // Todos los cupones
    messages:  'bg-[#D4FFF1]', // Mensajes
    companies: 'bg-[#D4D6FF]', // Empresas
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

  get bgClass(): string {
    return FILTER_BG_MAP[this.role]?.[this.variant] ?? 'bg-[#E6EFFF]';
  }
}
