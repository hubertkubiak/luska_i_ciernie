import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withI18nSupport } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';

// LOCALE_ID nie jest tu ustawiany ręcznie: przy i18n CLI wkompilowuje locale w każdy build
// (pl dla wersji źródłowej, en/de dla tłumaczeń — patrz "i18n" w angular.json) i sam dołącza
// dane locale. Ręczne { provide: LOCALE_ID, useValue: 'pl' } zablokowałoby polski we wszystkich
// wersjach językowych. Serwer i przeglądarka mają ten sam build, więc formatują identycznie.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: parametr :slug trafia prosto do input() komponentu strony.
    provideRouter(routes, withComponentInputBinding()),
    // withFetch: na serwerze HttpClient używa natywnego fetch z Node zamiast emulacji XHR.
    provideHttpClient(withFetch()),
    // provideClientHydration domyślnie włącza też HTTP transfer cache: odpowiedzi GET
    // pobrane podczas SSR lądują w <script id="ng-state"> i klient nie pyta API drugi raz.
    // withI18nSupport: BEZ tego Angular pomija hydrację każdego komponentu z blokami i18n
    // i renderuje go od nowa (nowe węzły DOM, zgubione kliknięcia sprzed hydracji) — po cichu.
    provideClientHydration(withI18nSupport()),
  ],
};
