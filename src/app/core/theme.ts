import { DOCUMENT, isPlatformServer } from '@angular/common';
import { Injectable, PLATFORM_ID, REQUEST, inject, signal } from '@angular/core';
import { THEMES, type Theme } from '../../shared/models';

const COOKIE = 'theme';

/**
 * Night / parchment theme (SPEC §6, pitfall #3). If the theme lived in localStorage the server would
 * not know it: the HTML would arrive in the default theme and switch only after JS starts — a flash.
 * Hence a cookie: the browser sends it with every request, and the server sets
 * <html data-theme> right in the HTML.
 *
 * - SSR: we read the cookie via REQUEST (the current request's web Request) and set the attribute
 *   through DOCUMENT — <html> is outside the app, so hydration does not touch it.
 * - Prerender and Client mode: Express fixes the HTML there (src/server/theme.ts).
 * - Browser: we only read the attribute that came from the server.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly current = signal<Theme>('night');

  readonly theme = this.current.asReadonly();

  constructor() {
    if (isPlatformServer(inject(PLATFORM_ID))) {
      // There is no real request while prerendering — the default theme stays.
      const cookies = inject(REQUEST, { optional: true })?.headers.get('cookie') ?? '';
      this.apply(parseTheme(cookies));
    } else {
      this.current.set(parseTheme(`${COOKIE}=${this.doc.documentElement.getAttribute('data-theme')}`));
    }
  }

  /** A change from inside the app (JS): applied to the page at once and stored in the cookie for later visits. */
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
