import { CommonModule } from '@angular/common';
import { Component, computed, HostListener, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import {
  ContactCenterMessageRow,
  ContactCenterMessageTypeRow,
  ContactCenterService,
  ContactCenterUserPublicRow,
} from '../../../service/contact-center.service';
import { AuthService } from '../../../service/auth.service';
import { NotificationService } from '../../../service/notification.service';

interface Message {
  id: number;
  title: string;
  type: string;
  date: string;
  description: string;
  status: 'sent' | 'received' | 'answered';
  senderName: string;
  senderEmail: string;
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
type CompanyTab = 'all' | 'sent' | 'received' | 'answered';
type AdminTab = 'all' | 'pending' | 'answered';
type AdminModalView = 'none' | 'reply' | 'detail' | 'success';

@Component({
  selector: 'app-contact-center',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent],
  templateUrl: './contact-center.component.html',
  styleUrl: './contact-center.component.css',
})
export class ContactCenterComponent {
  role = signal<string | null>(null);
  isAdminPortal = computed(() => this.role() === 'admin');

  // TABS
  activeCompanyTab = signal<CompanyTab>('all');
  activeAdminTab = signal<AdminTab>('all');

  // PAGINACION Y LISTADO
  currentPage = signal(1);
  readonly itemsPerPage = 10;
  totalItems = signal(0);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  unreadCount = signal(0);
  messages = signal<Message[]>([]);

  // BUSQUEDA ADMIN
  adminSearchInput = signal('');
  appliedAdminSearch = signal('');

  // MODAL DE NUEVO MENSAJE (EMPRESA)
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

  // MODALES ADMIN
  adminModalView = signal<AdminModalView>('none');
  selectedAdminMessage = signal<Message | null>(null);
  adminReplyText = signal('');
  adminReplyError = signal<string | null>(null);
  isSubmittingAdminReply = signal(false);

  constructor(
    private readonly contactCenterService: ContactCenterService,
    private readonly authService: AuthService,
    private readonly notificationService: NotificationService,
  ) {
    this.initializeRole();
    this.loadMessages();

    if (this.isAdminPortal()) {
      this.loadUnreadMessagesCount();
      return;
    }

    this.loadUnreadMessagesCount();
    this.loadMessageTypes();
  }

  paginatedMessages = computed(() => this.messages());

  totalPages = computed(() => Math.ceil(this.totalItems() / this.itemsPerPage));

  visiblePageItems = computed<PageItem[]>(() =>
    this.buildVisiblePageItems(this.currentPage(), this.totalPages()),
  );

  canGoPrev = computed(() => this.currentPage() > 1);
  canGoNext = computed(() => this.currentPage() < this.totalPages());

  changeCompanyTab(tab: CompanyTab): void {
    this.activeCompanyTab.set(tab);
    this.currentPage.set(1);
    this.loadMessages();
  }

  changeAdminTab(tab: AdminTab): void {
    this.activeAdminTab.set(tab);
    this.currentPage.set(1);
    this.loadMessages();
  }

  applyAdminSearch(): void {
    if (!this.isAdminPortal()) {
      return;
    }

    this.appliedAdminSearch.set(this.adminSearchInput().trim());
    this.currentPage.set(1);
    this.loadMessages();
  }

  goToPage(page: number): void {
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
    if (this.isAdminPortal()) {
      return;
    }

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
    if (
      this.composeModalView() !== 'form' ||
      this.isSubmittingCompose() ||
      this.isLoadingMessageTypes()
    ) {
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

  openReplyModal(message: Message): void {
    if (!this.isAdminPortal()) {
      return;
    }

    this.selectedAdminMessage.set(message);
    this.adminReplyText.set('');
    this.adminReplyError.set(null);
    this.adminModalView.set('reply');

    if (message.status === 'sent') {
      this.markAsReceivedByAdmin(message.id);
    }
  }

  openDetailModal(message: Message): void {
    if (!this.isAdminPortal()) {
      return;
    }

    this.selectedAdminMessage.set(message);
    this.adminReplyError.set(null);
    this.adminModalView.set('detail');
  }

  closeAdminModal(): void {
    if (this.isSubmittingAdminReply()) {
      return;
    }

    this.selectedAdminMessage.set(null);
    this.adminReplyText.set('');
    this.adminReplyError.set(null);
    this.adminModalView.set('none');
  }

  submitAdminReply(): void {
    const token = this.authService.token;
    const selectedMessage = this.selectedAdminMessage();

    if (!token) {
      this.adminReplyError.set('No hay sesión activa para responder el mensaje.');
      return;
    }

    if (!selectedMessage) {
      this.adminReplyError.set('Selecciona un mensaje para responder.');
      return;
    }

    const responseText = this.adminReplyText().trim();
    if (!responseText) {
      this.adminReplyError.set('La respuesta es requerida.');
      return;
    }

    this.isSubmittingAdminReply.set(true);
    this.adminReplyError.set(null);

    this.contactCenterService
      .insertMessageResponse(token, {
        messageId: selectedMessage.id,
        responseText,
      })
      .subscribe({
        next: () => {
          this.isSubmittingAdminReply.set(false);
          this.adminModalView.set('success');
          this.adminReplyText.set('');
          this.loadMessages();
          this.loadUnreadMessagesCount();
          this.contactCenterService.notifyUnreadCountChanged();

          const senderEmail = selectedMessage.senderEmail?.trim();
          if (senderEmail && token) {
            this.notificationService
              .sendNotification(token, senderEmail, 'Respuesta a tu consulta', 'response-message', {
                name: selectedMessage.senderName ?? senderEmail,
                response: responseText,
              })
              .subscribe({ error: () => {} });
          }
        },
        error: (error) => {
          this.isSubmittingAdminReply.set(false);
          this.adminReplyError.set(error?.message ?? 'No se pudo enviar la respuesta.');
        },
      });
  }

  openAdminMessageAction(message: Message): void {
    if (this.isMessageAnswered(message)) {
      this.openDetailModal(message);
      return;
    }

    this.openReplyModal(message);
  }

  isMessageAnswered(message: Message): boolean {
    return message.status === 'answered' || !!message.response;
  }

  statusClasses(status: string): string {
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (
      !this.isComposeModalOpen() ||
      this.composeModalView() !== 'form' ||
      !this.isMessageTypeDropdownOpen()
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

  private initializeRole(): void {
    const authRole = this.authService.getRole();
    if (authRole) {
      this.role.set(authRole);
      return;
    }

    if (this.authService.isAdmin()) {
      this.role.set('admin');
      return;
    }

    if (this.authService.isEmpresa()) {
      this.role.set('empresa');
      return;
    }

    this.role.set(null);
  }

  private markAsReceivedByAdmin(messageId: number): void {
    const token = this.authService.token;
    if (!token) {
      return;
    }

    this.contactCenterService.markMessageAsReceivedByAdmin(token, messageId).subscribe({
      next: () => {
        const selected = this.selectedAdminMessage();
        if (selected && selected.id === messageId) {
          this.selectedAdminMessage.set({ ...selected, status: 'received' });
        }

        this.messages.update((rows) =>
          rows.map((message) =>
            message.id === messageId ? { ...message, status: 'received' as const } : message,
          ),
        );

        this.loadUnreadMessagesCount();
        this.contactCenterService.notifyUnreadCountChanged();
      },
      error: () => {
        // Si falla el marcado, permitimos responder de todas formas.
      },
    });
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
        where: this.buildWhereFromContext(),
      })
      .subscribe({
        next: ({ rows, total }) => {
          this.messages.set(rows.map((row) => this.mapRowToUiMessage(row)));
          this.totalItems.set(total);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.errorMessage.set(error?.message ?? 'No se pudo cargar el historial de mensajes.');
          this.contactCenterService.notifyUnreadCountChanged();
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

    const where = this.isAdminPortal() ? { status: { _eq: 'SENT' } } : { status: { _eq: 'SENT' } };

    this.contactCenterService.getUnreadMessagesCount(token, where).subscribe({
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

  private buildWhereFromContext(): Record<string, unknown> {
    const filters: Record<string, unknown>[] = [];

    const statusFilter = this.isAdminPortal()
      ? this.buildAdminStatusWhere(this.activeAdminTab())
      : this.buildCompanyStatusWhere(this.activeCompanyTab());

    if (statusFilter) {
      filters.push(statusFilter);
    }

    if (this.isAdminPortal()) {
      const search = this.appliedAdminSearch().trim();
      if (search) {
        filters.push(this.buildAdminSearchWhere(search));
      }
    }

    if (filters.length === 0) {
      return {};
    }

    if (filters.length === 1) {
      return filters[0];
    }

    return {
      _and: filters,
    };
  }

  private buildCompanyStatusWhere(tab: CompanyTab): Record<string, unknown> | null {
    if (tab === 'all') {
      return null;
    }

    const statusByTab: Record<Exclude<CompanyTab, 'all'>, string> = {
      sent: 'SENT',
      received: 'RECEIVED_BY_ADMIN',
      answered: 'ANSWERED',
    };

    const value = statusByTab[tab];

    if (tab === 'answered') {
      return {
        _or: [
          {
            status: {
              _eq: value,
            },
          },
          {
            message_status: {
              value: {
                _eq: value,
              },
            },
          },
          {
            message_responses: {},
          },
        ],
      };
    }

    return {
      _or: [
        {
          status: {
            _eq: value,
          },
        },
        {
          message_status: {
            value: {
              _eq: value,
            },
          },
        },
      ],
    };
  }

  private buildAdminStatusWhere(tab: AdminTab): Record<string, unknown> | null {
    if (tab === 'all') {
      return null;
    }

    if (tab === 'pending') {
      return {
        _and: [
          {
            _or: [
              {
                status: {
                  _in: ['SENT', 'RECEIVED_BY_ADMIN'],
                },
              },
              {
                message_status: {
                  value: {
                    _in: ['SENT', 'RECEIVED_BY_ADMIN'],
                  },
                },
              },
            ],
          },
          {
            _not: {
              message_responses: {},
            },
          },
        ],
      };
    }

    return {
      _or: [
        {
          status: {
            _eq: 'ANSWERED',
          },
        },
        {
          message_status: {
            value: {
              _eq: 'ANSWERED',
            },
          },
        },
        {
          message_responses: {},
        },
      ],
    };
  }

  private buildAdminSearchWhere(search: string): Record<string, unknown> {
    const like = `%${search}%`;

    return {
      user: {
        _or: [
          { first_name: { _ilike: like } },
          { last_name: { _ilike: like } },
          { email: { _ilike: like } },
        ],
      },
    };
  }

  private mapRowToUiMessage(row: ContactCenterMessageRow): Message {
    const latestResponse = row.message_responses?.[row.message_responses.length - 1] ?? null;

    return {
      id: row.id,
      title: row.subject ?? 'Sin asunto',
      type: this.mapRowMessageTypeToLabel(row),
      date: this.formatDate(row.created_at),
      description: row.message ?? 'Sin contenido',
      status: this.mapBackendStatusToUi(row.status ?? row.message_status?.value, !!latestResponse),
      senderName: this.getSenderName(row.user_public),
      senderEmail: row.user_public?.email?.trim() ?? 'Sin correo',
      response: latestResponse
        ? {
            author: this.getResponseAuthor(latestResponse.user_public),
            date: this.formatDate(latestResponse.created_at),
            message: latestResponse.response?.trim() || 'Sin respuesta',
          }
        : undefined,
    };
  }

  private mapBackendStatusToUi(
    status?: string | null,
    hasResponse = false,
  ): 'sent' | 'received' | 'answered' {
    if (status === 'SENT') return 'sent';
    if (status === 'RECEIVED_BY_ADMIN') return 'received';
    if (status === 'ANSWERED') return 'answered';

    if (hasResponse) return 'answered';

    return 'sent';
  }

  private mapRowMessageTypeToLabel(row: ContactCenterMessageRow): string {
    return (
      row.messageTypeByMessageType?.description?.trim() ||
      row.messageTypeByMessageType?.value?.trim() ||
      row.message_type?.trim() ||
      'Sin tipo'
    );
  }

  private mapMessageTypeRow(row: ContactCenterMessageTypeRow): MessageTypeOption {
    return {
      value: row.value,
      description: row.description || row.value,
    };
  }

  private getSenderName(user?: ContactCenterUserPublicRow | null): string {
    const fullName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
    if (fullName) {
      return fullName;
    }

    if (user?.company_commercial_name?.trim()) {
      return user.company_commercial_name.trim();
    }

    return user?.email?.trim() || 'Remitente';
  }

  private getResponseAuthor(user?: ContactCenterUserPublicRow | null): string {
    const fullName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
    if (fullName) {
      return fullName;
    }

    return user?.company_commercial_name?.trim() || user?.email?.trim() || 'Administrador';
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
