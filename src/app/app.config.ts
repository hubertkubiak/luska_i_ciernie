import { registerLocaleData } from '@angular/common';
import localePl from '@angular/common/locales/pl';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

// Dane locale muszą być zarejestrowane w obu bundlach (ten plik trafia też do serwera
// przez mergeApplicationConfig w app.config.server.ts), inaczej pipe'y wyrzucą błąd.
registerLocaleData(localePl);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(),
    // Jawne locale: serwer (Node) i przeglądarka formatują daty/liczby tak samo (SPEC §6, pułapka #5).
    { provide: LOCALE_ID, useValue: 'pl' },
  ],
};
