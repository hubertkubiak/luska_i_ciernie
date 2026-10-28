import { DOCUMENT, Location } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/**
 * <link rel="canonical"> w <head>. Działa tak samo na serwerze (DOM z platform-server
 * trafia do HTML-a odpowiedzi) i w przeglądarce (aktualizacja przy nawigacji kliknięciem).
 * Pełny zestaw SEO (title, meta, OG) — etap 8.
 */
@Injectable({ providedIn: 'root' })
export class Canonical {
  private readonly doc = inject(DOCUMENT);
  private readonly location = inject(Location);

  /** @param path ścieżka z query stringiem, np. "/szukaj?trop=slow-burn" */
  set(path: string): void {
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    // Adres kanoniczny powinien być absolutny. Origin pochodzi z żądania (na serwerze — z nagłówka
    // Host, który przepuścił security.allowedHosts z angular.json).
    // prepareExternalUrl dokleja <base href> — w wersji /en/ adres kanoniczny to /en/szukaj?….
    link.setAttribute('href', new URL(this.location.prepareExternalUrl(path), this.doc.location.origin).href);
  }

  clear(): void {
    this.doc.head.querySelector('link[rel="canonical"]')?.remove();
  }
}
