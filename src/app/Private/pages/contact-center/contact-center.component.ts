import { CommonModule } from '@angular/common';
import { Component, signal, computed } from '@angular/core';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';

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
  imports: [CommonModule, TopbarComponent],
  templateUrl: './contact-center.component.html',
  styleUrl: './contact-center.component.css',
})
export class ContactCenterComponent {
  // TAB ACTIVO
  activeTab = signal<'all' | 'sent' | 'received' | 'answered'>('all');

  // PAGINACIÓN
  currentPage = signal(1);
  itemsPerPage = 3;

  // MOCK DATA (luego lo reemplazas por API)
  messages = signal<Message[]>([
    {
      id: 1,
      title: 'Error en escaneo de QR',
      type: 'Consulta',
      date: '2025-10-02 - 13:05 P. M.',
      description: 'La cámara no reconoce el código en dispositivos Android 8.0 y versiones posteriores.',
      status: 'received'
    },
    {
      id: 2,
      title: 'Error en escaneo de QR',
      type: 'Consulta',
      date: '2025-10-02 - 13:05 P. M.',
      description: 'La cámara no reconoce el código en dispositivos Android 8.0 y versiones posteriores.',
      status: 'sent'
    },
    {
      id: 3,
      title: 'Error en escaneo de QR',
      type: 'Consulta',
      date: '2025-10-02 - 13:05 P. M.',
      description: 'La cámara no reconoce el código en dispositivos Android 8.0 y versiones posteriores.',
      status: 'answered',
      response: {
        author: 'Pedro Pérez',
        date: '2025-10-02 - 13:05 P. M.',
        message: 'Estimado comercio, puede editar la fecha fin siempre que el cupón no haya expirado.'
      }
    }
  ]);

  // FILTRO POR TAB
  filteredMessages = computed(() => {
    const tab = this.activeTab();
    if (tab === 'all') return this.messages();
    if (tab === 'sent') return this.messages().filter(m => m.status === 'sent');
    if (tab === 'received') return this.messages().filter(m => m.status === 'received');
    if (tab === 'answered') return this.messages().filter(m => m.status === 'answered');
    return [];
  });

  // PAGINACIÓN COMPUTADA
  paginatedMessages = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredMessages().slice(start, start + this.itemsPerPage);
  });

  totalPages = computed(() =>
    Math.ceil(this.filteredMessages().length / this.itemsPerPage)
  );

  changeTab(tab: 'all' | 'sent' | 'received' | 'answered') {
    this.activeTab.set(tab);
    this.currentPage.set(1);
  }

  goToPage(page: number) {
    this.currentPage.set(page);
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
}
