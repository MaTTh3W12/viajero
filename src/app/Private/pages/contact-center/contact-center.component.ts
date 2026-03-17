import { CommonModule } from '@angular/common';
import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { ContactCenterService, ContactCenterMessageRow } from '../../../service/contact-center.service';
import { AuthService } from '../../../service/auth.service';

interface Message {
  id: number;
  title: string;
  type: string;
  date: string;
  description: string;
  status: 'sent' | 'received' | 'answered';
  response?: {
    author: string;
    date: string;
    message: string;
  };
}

@Component({
  selector: 'app-contact-center',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent],
  templateUrl: './contact-center.component.html',
  styleUrl: './contact-center.component.css',
})
export class ContactCenterComponent {
  // TAB ACTIVO
  activeTab = signal<'all' | 'sent' | 'received' | 'answered'>('all');

  // PAGINACIÓN
  currentPage = signal(1);
  readonly itemsPerPage = 10;
  totalItems = signal(0);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  unreadCount = signal(0);
  isComposeModalOpen = signal(false);

  composeSubject = signal('');
  composeType = signal('Consulta');
  composeMessage = signal('');

  messages = signal<Message[]>([]);

  constructor(
    private readonly contactCenterService: ContactCenterService,
    private readonly authService: AuthService
  ) {
    this.loadMessages();
    this.loadUnreadMessagesCount();
  }

  // PAGINACIÓN COMPUTADA
  paginatedMessages = computed(() => this.messages());

  totalPages = computed(() =>
    Math.ceil(this.totalItems() / this.itemsPerPage)
  );

  changeTab(tab: 'all' | 'sent' | 'received' | 'answered') {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.loadMessages();
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.loadMessages();
  }

  openComposeModal(): void {
    this.isComposeModalOpen.set(true);
  }

  closeComposeModal(): void {
    this.isComposeModalOpen.set(false);
  }

  submitComposeMock(): void {
    this.closeComposeModal();
    this.composeSubject.set('');
    this.composeType.set('Consulta');
    this.composeMessage.set('');
  }

  statusClasses(status: string) {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-700';
      case 'received':
        return 'bg-blue-100 text-blue-700';
      case 'answered':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return '';
    }
  }

  private loadMessages(): void {
    const token = this.authService.token;
    if (!token) {
      this.errorMessage.set('No hay sesión activa para consultar los mensajes.');
      this.messages.set([]);
      this.totalItems.set(0);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.contactCenterService
      .getMessages(token, {
        limit: this.itemsPerPage,
        offset: (this.currentPage() - 1) * this.itemsPerPage,
        where: this.buildWhereFromTab(this.activeTab()),
      })
      .subscribe({
        next: ({ rows, total }) => {
          this.messages.set(rows.map((row) => this.mapRowToUiMessage(row)));
          this.totalItems.set(total);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.errorMessage.set(error?.message ?? 'No se pudo cargar el historial de mensajes.');
          this.messages.set([]);
          this.totalItems.set(0);
          this.isLoading.set(false);
        },
      });
  }

  private loadUnreadMessagesCount(): void {
    const token = this.authService.token;
    if (!token) {
      this.unreadCount.set(0);
      return;
    }

    this.contactCenterService.getUnreadMessagesCount(token).subscribe({
      next: (count) => this.unreadCount.set(count),
      error: () => this.unreadCount.set(0),
    });
  }

  private buildWhereFromTab(tab: 'all' | 'sent' | 'received' | 'answered'): Record<string, unknown> {
    return {};
  }

  private mapRowToUiMessage(row: ContactCenterMessageRow): Message {
    return {
      id: row.id,
      title: row.subject ?? 'Sin asunto',
      type: 'Consulta',
      date: this.formatDate(row.created_at),
      description: row.message ?? 'Sin contenido',
      status: this.mapBackendStatusToUi(row.status),
    };
  }

  private mapBackendStatusToUi(status?: string | null): 'sent' | 'received' | 'answered' {
    if (status === 'SENT') return 'sent';
    if (status === 'RECEIVED_BY_ADMIN') return 'received';
    return 'answered';
  }

  private formatDate(date: string): string {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return new Intl.DateTimeFormat('es-SV', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsedDate);
  }
}
