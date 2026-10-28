import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch } from '@angular/common/http';
import localePl from '@angular/common/locales/pl';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';

// Dane locale muszą być zarejestrowane w obu bundlach (ten plik trafia też do serwera
// przez mergeApplicationConfig w app.config.server.ts), inaczej pipe'y wyrzucą błąd.
registerLocaleData(localePl);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: parametr :slug trafia prosto do input() komponentu strony.
    provideRouter(routes, withComponentInputBinding()),
    // withFetch: na serwerze HttpClient używa natywnego fetch z Node zamiast emulacji XHR.
    provideHttpClient(withFetch()),
    // provideClientHydration domyślnie włącza też HTTP transfer cache: odpowiedzi GET
    // pobrane podczas SSR lądują w <script id="ng-state"> i klient nie pyta API drugi raz.
    provideClientHydration(),
    // Jawne locale: serwer (Node) i przeglądarka formatują daty/liczby tak samo (SPEC §6, pułapka #5).
    { provide: LOCALE_ID, useValue: 'pl' },
  ],
};
