import { Component, signal, ElementRef, ViewChild, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-featured-deals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './featured-deals.component.html',
  styleUrls: ['./featured-deals.component.css']
})
export class FeaturedDealsComponent implements OnDestroy {
 // --- SIGNALS Y ESTADO ---
  activeFilter = signal<'recent' | 'expiring'>('expiring');

  // --- REFERENCIAS AL DOM ---
  @ViewChild('recentContainer') recentContainer?: ElementRef<HTMLElement>;
  @ViewChild('expiringContainer') expiringContainer?: ElementRef<HTMLElement>;

  // Variables para controlar los temporizadores
  private autoScrollInterval: any;
  private initTimeout: any; // <-- IMPORTANTE: Para controlar el setTimeout del efecto

  constructor() {
    effect(() => {
      // Registrar dependencia
      const filter = this.activeFilter();

      // 1. Limpiar TODO (Intervalo y Timeout pendiente)
      this.stopAutoScroll();

      // 2. Iniciar scroll con retraso seguro
      this.initTimeout = setTimeout(() => {
        this.startAutoScroll();
      }, 100);
    });
  }

  setFilter(filter: 'recent' | 'expiring') {
    this.activeFilter.set(filter);
  }

  scrollContainer(container: HTMLElement, direction: 'left' | 'right') {
    this.stopAutoScroll();

    // Validar que el contenedor exista antes de operar
    if (!container) return;

    const scrollAmount = 420;
    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }

    // Reiniciar el auto-scroll después de la interacción manual
    // Usamos el mismo timeout para asegurar que no choque
    clearTimeout(this.initTimeout);
    this.initTimeout = setTimeout(() => {
      this.startAutoScroll();
    }, 5000);
  }

  startAutoScroll() {
    this.stopAutoScroll(); // Limpieza preventiva

    // Intervalo de 3 segundos (según tu comentario decía 3s pero el código tenía 5000)
    this.autoScrollInterval = setInterval(() => {
      this.moveNext();
    }, 3000);
  }

  stopAutoScroll() {
    // Limpiar intervalo del carrusel
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }
    // Limpiar el timeout de inicialización si estuviera pendiente
    if (this.initTimeout) {
      clearTimeout(this.initTimeout);
      this.initTimeout = null;
    }
  }

  private moveNext() {
    // 1. Determinar cuál contenedor DEBERÍA estar activo
    const isRecent = this.activeFilter() === 'recent';

    // 2. Obtener la referencia segura usando Optional Chaining
    const containerRef = isRecent ? this.recentContainer : this.expiringContainer;
    const container = containerRef?.nativeElement;

    // 3. GUARDIA DE SEGURIDAD (Esto evita el error Timeout.eval)
    // Si el contenedor es undefined o null (porque Angular está renderizando), abortamos.
    if (!container) {
      return;
    }

    const maxScroll = container.scrollWidth - container.clientWidth;
    const scrollAmount = 420;

    if (container.scrollLeft >= maxScroll - 10) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  ngOnDestroy() {
    // Al destruir el componente, matamos todos los timers
    this.stopAutoScroll();
  }
}
