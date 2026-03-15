import { AuthService, UserRole } from '../../../service/auth.service';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { FilterBarComponent } from '../../../shared/dashboard/filter-bar/filter-bar.component';

type SortKey = 'fechaHora' | 'cuponOferta' | 'usuario' | 'responsableCanje';
type SortDirection = 'asc' | 'desc';

interface HistorialCanjeRow {
  fechaHora: string;
  fechaOrden: number;
  cuponOferta: string;
  categoria: string;
  usuario: string;
  responsableCanje: string;
}

@Component({
  selector: 'app-historial-canjes',
  standalone: true,
  imports: [CommonModule, TopbarComponent, FilterBarComponent],
  templateUrl: './historial-canjes.component.html',
  styleUrls: ['./historial-canjes.component.css'],
})
export class HistorialCanjesComponent {
  private readonly maxTitleLength = 20;
  readonly pageSize = 6;

  role: UserRole;
  currentPage = 1;
  sortKey: SortKey = 'fechaHora';
  sortDirection: SortDirection = 'desc';

  constructor(private auth: AuthService) {
    this.role = this.auth.getRole()!;
  }

  historial: HistorialCanjeRow[] = [
    { fechaHora: 'Hoy - 14:20', fechaOrden: 202603151420, cuponOferta: 'Cena 2x1 casual', categoria: 'Gastronomía', usuario: 'Pedro Escamoso', responsableCanje: 'María Gómez' },
    { fechaHora: 'Hoy - 14:20', fechaOrden: 202603151420, cuponOferta: 'Noche de Cine', categoria: 'Entretenimiento', usuario: 'Paquita del Barrio', responsableCanje: 'Pedro Sánchez' },
    { fechaHora: 'Ayer - 09:30', fechaOrden: 202603140930, cuponOferta: 'Café y Postre', categoria: 'Gastronomía', usuario: 'Snoop Dog', responsableCanje: 'José Ramírez' },
    { fechaHora: '02/25/2026 - 04:52', fechaOrden: 202602250452, cuponOferta: 'Spa Relax Total', categoria: 'Bienestar', usuario: 'Camila Cabello', responsableCanje: 'Pedro Escamoso' },
    { fechaHora: '02/25/2026 - 04:52', fechaOrden: 202602250452, cuponOferta: 'Spa Relax Total', categoria: 'Bienestar', usuario: 'Camila Cabello', responsableCanje: 'Pedro Escamoso' },
    { fechaHora: '15/01/2026 - 13:52', fechaOrden: 202601151352, cuponOferta: 'Tour de Montaña', categoria: 'Turismo', usuario: 'Bruno Mars', responsableCanje: 'Betty la Fea' },
    { fechaHora: '14/01/2026 - 08:25', fechaOrden: 202601140825, cuponOferta: 'Descuento en hospedaje familiar premium', categoria: 'Turismo', usuario: 'Luis Miguel', responsableCanje: 'Marta Pérez' },
    { fechaHora: '13/01/2026 - 17:40', fechaOrden: 202601131740, cuponOferta: 'Paquete de cena ejecutiva', categoria: 'Gastronomía', usuario: 'Shakira Shakira', responsableCanje: 'Rosa Díaz' },
    { fechaHora: '12/01/2026 - 11:12', fechaOrden: 202601121112, cuponOferta: 'Entrada general al museo', categoria: 'Cultura', usuario: 'Ana Gabriel', responsableCanje: 'Carlos Mena' },
    { fechaHora: '11/01/2026 - 10:05', fechaOrden: 202601111005, cuponOferta: 'Descuento en tipo sedán', categoria: 'Transporte', usuario: 'David Bisbal', responsableCanje: 'Raúl Herrera' },
  ];

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.historial.length / this.pageSize));
  }

  get sortedHistorial(): HistorialCanjeRow[] {
    const direction = this.sortDirection === 'asc' ? 1 : -1;
    return [...this.historial].sort((a, b) => {
      if (this.sortKey === 'fechaHora') {
        return (a.fechaOrden - b.fechaOrden) * direction;
      }

      const valueA = this.getSortValue(a, this.sortKey);
      const valueB = this.getSortValue(b, this.sortKey);
      return valueA.localeCompare(valueB, 'es', { sensitivity: 'base' }) * direction;
    });
  }

  get pagedHistorial(): HistorialCanjeRow[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.sortedHistorial.slice(startIndex, endIndex);
  }

  get visiblePages(): number[] {
    const windowSize = 3;
    const halfWindow = Math.floor(windowSize / 2);
    let start = Math.max(1, this.currentPage - halfWindow);
    let end = Math.min(this.totalPages, start + windowSize - 1);

    if (end - start + 1 < windowSize) {
      start = Math.max(1, end - windowSize + 1);
    }

    const pages: number[] = [];
    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }
    return pages;
  }

  get showLeadingEllipsis(): boolean {
    return this.visiblePages.length > 0 && this.visiblePages[0] > 2;
  }

  get showTrailingEllipsis(): boolean {
    return this.visiblePages.length > 0 && this.visiblePages[this.visiblePages.length - 1] < this.totalPages - 1;
  }

  sortBy(column: SortKey): void {
    if (this.sortKey === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = column;
      this.sortDirection = 'asc';
    }

    this.currentPage = 1;
  }

  isSortedBy(column: SortKey): boolean {
    return this.sortKey === column;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  goToFirstPage(): void {
    this.currentPage = 1;
  }

  goToLastPage(): void {
    this.currentPage = this.totalPages;
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
    }
  }

  trackPage = (_: number, page: number): number => page;

  truncateTitle(value: unknown): string {
    const title = String(value ?? '').trim();
    if (title.length <= this.maxTitleLength) {
      return title;
    }

    return `${title.slice(0, this.maxTitleLength)}...`;
  }

  getFullTitle(value: unknown): string {
    return String(value ?? '').trim();
  }

  private getSortValue(row: HistorialCanjeRow, key: Exclude<SortKey, 'fechaHora'>): string {
    if (key === 'cuponOferta') return row.cuponOferta;
    if (key === 'usuario') return row.usuario;
    return row.responsableCanje;
  }
}
