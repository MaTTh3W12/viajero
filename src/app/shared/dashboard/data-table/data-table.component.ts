import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableConfig, TableColumn } from '../../../service/data-table.model';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-table.component.html',
})
export class DataTableComponent<T extends { id: number }> {

  @Input() config!: DataTableConfig<T>;
  @Input() data: T[] = [];

  // ✅ TRACK BY (OBLIGATORIO con @for)
  trackRow = (_: number, row: T) => row.id;
  trackColumn = (_: number, col: TableColumn<T>) => col.key;
  trackAction = (_: number, action: any) => action.icon;

  // ✅ CAST SEGURO PARA TEMPLATES
  asString(value: unknown): string {
    return String(value ?? '');
  }

  // 🎨 BADGES
  getBadgeClass(value: string): string {
    switch (value) {
      case 'Publicado':
        return 'bg-[#59D9A6] text-white';
      case 'No publicado':
        return 'bg-[#FFD6C9] text-[#FF6A3D]';
      case 'Expirado':
        return 'bg-[#FFE1D9] text-[#FF6A3D]';
      case 'Indefinido':
        return 'bg-[#E6EEFF] text-[#4D7CFF]';
      default:
        return 'bg-[#F4F7FD] text-[#0E225C]';
    }
  }

  // 📅 EXPIRACIÓN
  getExpirationBoxClass(value: string): string {
    if (value === 'Expirado') {
      return 'bg-[#FFE2DB] text-[#F45934]';
    }
    if (value === 'Indefinido') {
      return 'bg-[#E5EEFF] text-[#538CFF]';
    }
    return 'bg-[#F4F7FD] text-[#0E225C]';
  }
}
