import { CommonModule } from '@angular/common';
import { Component, signal, computed, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import {
  ContactCenterService,
  ContactCenterMessageRow,
  ContactCenterMessageTypeRow,
} from '../../../service/contact-center.service';
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

interface MessageTypeOption {
  value: string;
  description: string;
}

type PageItem = number | 'ellipsis';
type ComposeModalView = 'form' | 'sending' | 'success';

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
  isLoadingMessageTypes = signal(false);
  isSubmittingCompose = signal(false);
  isMessageTypeDropdownOpen = signal(false);
  composeErrorMessage = signal<string | null>(null);
  composeModalView = signal<ComposeModalView>('form');

  composeSubject = signal('');
  composeType = signal('SUPPORT');
  composeMessage = signal('');
  messageTypes = signal<MessageTypeOption[]>([]);

  messages = signal<Message[]>([]);

  constructor(
    private readonly contactCenterService: ContactCenterService,
    private readonly authService: AuthService
  ) {
    this.loadMessages();
    this.loadUnreadMessagesCount();
    this.loadMessageTypes();
  }

  // PAGINACIÓN COMPUTADA
  paginatedMessages = computed(() => this.messages());

  totalPages = computed(() =>
    Math.ceil(this.totalItems() / this.itemsPerPage)
  );

  visiblePageItems = computed<PageItem[]>(() =>
    this.buildVisiblePageItems(this.currentPage(), this.totalPages())
  );

  canGoPrev = computed(() => this.currentPage() > 1);
  canGoNext = computed(() => this.currentPage() < this.totalPages());

  changeTab(tab: 'all' | 'sent' | 'received' | 'answered') {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.loadMessages();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) {
      return;
    }

    if (page === this.currentPage()) {
      return;
    }

    this.currentPage.set(page);
    this.loadMessages();
  }

  goToFirstPage(): void {
    this.goToPage(1);
  }

  goToPreviousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  goToNextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  goToLastPage(): void {
    this.goToPage(this.totalPages());
  }

  openComposeModal(): void {
    this.composeErrorMessage.set(null);
    this.isMessageTypeDropdownOpen.set(false);
    this.composeModalView.set('form');
    this.isComposeModalOpen.set(true);

    if (this.messageTypes().length === 0) {
      this.loadMessageTypes();
    }
  }

  closeComposeModal(): void {
    if (this.isSubmittingCompose()) {
      return;
    }

    this.composeErrorMessage.set(null);
    this.isMessageTypeDropdownOpen.set(false);
    this.composeModalView.set('form');
    this.isComposeModalOpen.set(false);
  }

  closeComposeSuccessModal(): void {
    this.composeErrorMessage.set(null);
    this.isMessageTypeDropdownOpen.set(false);
    this.composeModalView.set('form');
    this.isComposeModalOpen.set(false);
  }

  toggleMessageTypeDropdown(): void {
    if (this.composeModalView() !== 'form' || this.isSubmittingCompose() || this.isLoadingMessageTypes()) {
      return;
    }
    this.isMessageTypeDropdownOpen.update((isOpen) => !isOpen);
  }

  selectComposeType(option: MessageTypeOption): void {
    this.composeType.set(option.value);
    this.isMessageTypeDropdownOpen.set(false);
  }

  selectedComposeTypeLabel(): string {
    const selected = this.messageTypes().find((type) => type.value === this.composeType());
    return selected?.description ?? 'Soporte';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (
      !this.isComposeModalOpen()
      || this.composeModalView() !== 'form'
      || !this.isMessageTypeDropdownOpen()
    ) {
      return;
    }

    const target = event.target as HTMLElement | null;
    const clickedInsideDropdown = !!target?.closest('[data-message-type-dropdown]');

    if (!clickedInsideDropdown) {
      this.isMessageTypeDropdownOpen.set(false);
    }
  }

  submitCompose(): void {
    const token = this.authService.token;
    if (!token) {
      this.composeErrorMessage.set('No hay sesión activa para enviar el mensaje.');
      return;
    }

    const message = this.composeMessage().trim();
    if (!message) {
      this.composeErrorMessage.set('El mensaje es requerido.');
      return;
    }

    this.isSubmittingCompose.set(true);
    this.composeErrorMessage.set(null);
    this.composeModalView.set('sending');

    this.contactCenterService
      .insertMessage(token, {
        message,
        subject: this.composeSubject().trim(),
        message_type: this.composeType() || 'SUPPORT',
      })
      .subscribe({
        next: () => {
          this.isSubmittingCompose.set(false);
          this.isMessageTypeDropdownOpen.set(false);
          this.composeModalView.set('success');
          this.resetComposeForm();
          this.loadMessages();
          this.loadUnreadMessagesCount();
        },
        error: (error) => {
          this.composeModalView.set('form');
          this.composeErrorMessage.set(error?.message ?? 'No se pudo enviar el mensaje.');
          this.isSubmittingCompose.set(false);
        },
      });
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

  private loadMessageTypes(): void {
    const token = this.authService.token;
    if (!token) {
      this.messageTypes.set([]);
      return;
    }

    this.isLoadingMessageTypes.set(true);

    this.contactCenterService.getMessageTypes(token).subscribe({
      next: (rows) => {
        const options = rows.map((row) => this.mapMessageTypeRow(row));
        this.messageTypes.set(options);

        if (options.length > 0) {
          const hasSelectedType = options.some((option) => option.value === this.composeType());
          if (!hasSelectedType) {
            this.composeType.set(options[0].value);
          }
        } else {
          this.composeType.set('SUPPORT');
        }

        this.isLoadingMessageTypes.set(false);
      },
      error: () => {
        this.messageTypes.set([]);
        this.isMessageTypeDropdownOpen.set(false);
        this.composeType.set('SUPPORT');
        this.isLoadingMessageTypes.set(false);
      },
    });
  }

  private buildWhereFromTab(tab: 'all' | 'sent' | 'received' | 'answered'): Record<string, unknown> {
    if (tab === 'all') {
      return {};
    }

    const statusByTab: Record<'sent' | 'received' | 'answered', string> = {
      sent: 'SENT',
      received: 'RECEIVED_BY_ADMIN',
      answered: 'ANSWERED',
    };

    return {
      status: {
        _eq: statusByTab[tab],
      },
    };
  }

  private mapRowToUiMessage(row: ContactCenterMessageRow): Message {
    return {
      id: row.id,
      title: row.subject ?? 'Sin asunto',
      type: this.mapRowMessageTypeToLabel(row),
      date: this.formatDate(row.created_at),
      description: row.message ?? 'Sin contenido',
      status: this.mapBackendStatusToUi(row.status ?? row.message_status?.value),
    };
  }

  private mapBackendStatusToUi(status?: string | null): 'sent' | 'received' | 'answered' {
    if (status === 'SENT') return 'sent';
    if (status === 'RECEIVED_BY_ADMIN') return 'received';
    if (status === 'ANSWERED') return 'answered';
    return 'sent';
  }

  private mapRowMessageTypeToLabel(row: ContactCenterMessageRow): string {
    return row.messageTypeByMessageType?.description?.trim()
      || row.messageTypeByMessageType?.value?.trim()
      || row.message_type?.trim()
      || 'Sin tipo';
  }

  private mapMessageTypeRow(row: ContactCenterMessageTypeRow): MessageTypeOption {
    return {
      value: row.value,
      description: row.description || row.value,
    };
  }

  private resetComposeForm(): void {
    this.composeSubject.set('');
    this.composeMessage.set('');
    this.isMessageTypeDropdownOpen.set(false);
    this.composeErrorMessage.set(null);

    const defaultType = this.messageTypes()[0]?.value ?? 'SUPPORT';
    this.composeType.set(defaultType);
  }

  private buildVisiblePageItems(current: number, total: number): PageItem[] {
    if (total <= 1) {
      return [];
    }

    if (total <= 5) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    if (current <= 3) {
      return [1, 2, 3, 'ellipsis', total];
    }

    if (current >= total - 2) {
      return [1, 'ellipsis', total - 2, total - 1, total];
    }

    return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total];
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
