import { DOCUMENT, isPlatformServer } from '@angular/common';
import { Injectable, PLATFORM_ID, REQUEST, inject, signal } from '@angular/core';
import { THEMES, type Theme } from '../../shared/models';

const COOKIE = 'theme';

/**
 * Motyw noc / pergamin (SPEC §6, pułapka #3). Gdyby motyw siedział w localStorage, serwer by go
 * nie znał: HTML przychodziłby w motywie domyślnym i przełączał się dopiero po starcie JS — mignięcie.
 * Dlatego ciasteczko: przeglądarka wysyła je z każdym żądaniem, a serwer ustawia
 * <html data-theme> już w HTML-u.
 *
 * - SSR: czytamy ciasteczko przez REQUEST (webowy Request bieżącego żądania) i ustawiamy atrybut
 *   przez DOCUMENT — <html> jest poza aplikacją, więc hydracja go nie dotyka.
 * - Prerender i tryb Client: tam poprawia HTML Express (src/server/theme.ts).
 * - Przeglądarka: tylko czytamy atrybut, który przyszedł z serwera.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly current = signal<Theme>('night');

  readonly theme = this.current.asReadonly();

  constructor() {
    if (isPlatformServer(inject(PLATFORM_ID))) {
      // Podczas prerenderu nie ma prawdziwego żądania — wtedy zostaje motyw domyślny.
      const cookies = inject(REQUEST, { optional: true })?.headers.get('cookie') ?? '';
      this.apply(parseTheme(cookies));
    } else {
      this.current.set(parseTheme(`${COOKIE}=${this.doc.documentElement.getAttribute('data-theme')}`));
    }
  }

  /** Zmiana z poziomu aplikacji (z JS): od razu na stronie i w ciasteczku na kolejne wizyty. */
  set(theme: Theme): void {
    this.apply(theme);
    const secure = this.doc.location.protocol === 'https:' ? '; Secure' : '';
    this.doc.cookie = `${COOKIE}=${theme}; Path=/; Max-Age=${365 * 24 * 60 * 60}; SameSite=Lax${secure}`;
  }

  private apply(theme: Theme): void {
    this.current.set(theme);
    this.doc.documentElement.setAttribute('data-theme', theme);
  }
}

export function parseTheme(cookieHeader: string): Theme {
  const match = /(?:^|;\s*)theme=([^;]*)/.exec(cookieHeader);
  return THEMES.includes(match?.[1] as Theme) ? (match![1] as Theme) : 'night';
}
