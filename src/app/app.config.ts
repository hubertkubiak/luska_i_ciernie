import { PRECONNECT_CHECK_BLOCKLIST } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withHttpTransferCacheOptions, withI18nSupport } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
import { apiLanguageInterceptor } from './core/api-language';
import { forwardSessionInterceptor } from './core/forward-session';

// LOCALE_ID nie jest tu ustawiany ręcznie: przy i18n CLI wkompilowuje locale w każdy build
// (pl dla wersji źródłowej, en dla tłumaczenia — patrz "i18n" w angular.json) i sam dołącza
// dane locale. Ręczne { provide: LOCALE_ID, useValue: 'pl' } zablokowałoby polski we wszystkich
// wersjach językowych. Serwer i przeglądarka mają ten sam build, więc formatują identycznie.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: parametr :slug trafia prosto do input() komponentu strony.
    // withViewTransitions: każda nawigacja idzie przez document.startViewTransition() — stara
    // i nowa strona przenikają się, a elementy o tej samej view-transition-name (okładka na
    // karcie i na stronie książki, patrz Cover) płynnie „przelatują” na nowe miejsce.
    // skipInitialTransition: pierwsza nawigacja to hydracja HTML-a z serwera — nie ma czego animować.
    // Przeglądarki bez View Transitions API po prostu nawigują jak dotąd.
    provideRouter(routes, withComponentInputBinding(), withViewTransitions({ skipInitialTransition: true })),
    // withFetch: na serwerze HttpClient używa natywnego fetch z Node zamiast emulacji XHR.
    // apiLanguageInterceptor: API odpowiada w języku tej wersji aplikacji (tytuły pl/en).
    // forwardSessionInterceptor: przy SSR przekazuje sesję do /api/shelf (w przeglądarce nic nie robi).
    provideHttpClient(withFetch(), withInterceptors([apiLanguageInterceptor, forwardSessionInterceptor])),
    // provideClientHydration domyślnie włącza też HTTP transfer cache: odpowiedzi GET
    // pobrane podczas SSR lądują w <script id="ng-state"> i klient nie pyta API drugi raz.
    // withI18nSupport: BEZ tego Angular pomija hydrację każdego komponentu z blokami i18n
    // i renderuje go od nowa (nowe węzły DOM, zgubione kliknięcia sprzed hydracji) — po cichu.
    //
    // Domyślnie Angular NIE wkleja do HTML-a prywatnych odpowiedzi — nie wie, czy sama strona nie
    // wyląduje we wspólnym cache. Dotyczy to półki z /api/shelf na dwa sposoby:
    // - includeRequestsWithAuthHeaders: żądanie ma nagłówek Cookie (dodaje go forwardSessionInterceptor,
    //   a interceptor transfer cache działa PO naszych, tuż przed wysłaniem),
    // - includeNonCacheableRequests: odpowiedź ma Cache-Control: private, no-store.
    // U nas to bezpieczne: dane prywatne pobiera tylko SSR z sesją (wyłącznie /api/shelf), a HTML
    // zalogowanej osoby ma Cache-Control: private, no-store (server.ts). Bez tego przycisk półki
    // po hydracji na chwilę „odskakiwał”, dopóki przeglądarka nie pobrała stanu jeszcze raz.
    provideClientHydration(
      withI18nSupport(),
      withHttpTransferCacheOptions({ includeRequestsWithAuthHeaders: true, includeNonCacheableRequests: true }),
    ),
    // NgOptimizedImage w trybie dev ostrzega o braku <link rel="preconnect"> dla obrazów `priority`.
    // Celowo go nie mamy (RODO, patrz index.html), więc wyłączamy to sprawdzenie dla Open Library.
    { provide: PRECONNECT_CHECK_BLOCKLIST, useValue: 'https://covers.openlibrary.org' },
  ],
};
