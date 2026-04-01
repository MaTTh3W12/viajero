import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

export interface SeoConfig {
  title: string;
  description: string;
  /** URL canónica relativa, ej: '/coupons'. Si se omite no se establece canonical. */
  canonical?: string;
  /** Ruta de imagen OG relativa, ej: '/assets/img/og-coupons.png'. */
  ogImage?: string;
}

const BASE_TITLE = 'ViajeroSV';
const DEFAULT_OG_IMAGE = '/assets/img/og-image.png';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  setPage(config: SeoConfig): void {
    const fullTitle = `${config.title} | ${BASE_TITLE}`;
    const ogImage = config.ogImage ?? DEFAULT_OG_IMAGE;
    const origin = this.document.location.origin;
    const canonicalUrl = config.canonical
      ? `${origin}${config.canonical}`
      : undefined;

    this.title.setTitle(fullTitle);

    this.meta.updateTag({ name: 'description', content: config.description });

    // Open Graph
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    this.meta.updateTag({ property: 'og:image', content: `${origin}${ogImage}` });
    if (canonicalUrl) {
      this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    }

    // Twitter Card
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: config.description });
    this.meta.updateTag({ name: 'twitter:image', content: `${origin}${ogImage}` });

    // Canonical link tag
    this.setCanonical(canonicalUrl);
  }

  private setCanonical(url: string | undefined): void {
    const head = this.document.head;
    let link: HTMLLinkElement | null = head.querySelector('link[rel="canonical"]');

    if (!url) {
      link?.remove();
      return;
    }

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
