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
  trackRow = (_: number, row: any) => row.id ?? row;
  trackColumn = (_: number, col: any) => col.key;
  trackAction = (_: number, action: any) => action.iconId ?? action.icon;

  // ✅ CAST SEGURO PARA TEMPLATES
  asString(value: unknown): string {
    return String(value ?? '');
  }

  // 🎨 BADGES
  getBadgeClass(value: string): string {
    switch (value) {
      case 'Publicado':
        return 'bg-[#D4EDDA] text-[#155724]';
      case 'Borrador':
        return 'bg-[#FFF3CD] text-[#856404]';
      case 'Pendiente':
        return 'bg-[#FFF3CD] text-[#856404]';
      case 'Activa':
        return 'bg-[#D4EDDA] text-[#155724]';
      case 'No activa':
        return 'bg-[#F8D7DA] text-[#C82333]';
      default:
        return 'bg-[#CCE5FF] text-[#004085]';
    }
  }

  getActionIconId(action: any, row: any): string | null {
    return action.iconIdForRow?.(row) ?? action.iconId ?? null;
  }

  getActionIcon(action: any, row: any): string | null {
    return action.iconForRow?.(row) ?? action.icon ?? null;
  }

  getActionClass(action: any, row: any): string {
    return action.bgClassForRow?.(row) ?? action.bgClass;
  }

  isActionVisible(action: any, row: any): boolean {
    return action.show ? action.show(row) : true;
  }

  getCellValue(col: TableColumn<T, any>, row: T): string {
    const raw = col.render ? col.render(row[col.key], row) : this.asString(row[col.key]);
    return raw?.trim() ? raw : '-';
  }

  getCellSubLabel(col: TableColumn<T, any>, row: T): string | null {
    if (!col.subLabel) return null;
    const raw = col.subLabel(row[col.key], row);
    if (raw == null) return null;
    const value = String(raw).trim();
    return value.length ? value : null;
  }

  getCellImage(col: TableColumn<T, any>, row: T): string | null {
    return col.imageForRow?.(row) ?? null;
  }

  getCellTooltip(col: TableColumn<T, any>, row: T): string | null {
    if (!col.tooltip) return null;
    const raw = col.tooltip(row[col.key], row);
    if (raw == null) return null;
    const value = String(raw).trim();
    return value.length ? value : null;
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
