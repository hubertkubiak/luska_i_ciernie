import type { HttpInterceptorFn } from '@angular/common/http';
import { LOCALE_ID, inject } from '@angular/core';

/**
 * Mówi API, w jakim języku jest ta wersja aplikacji. LOCALE_ID wkompilował build (pl / en),
 * więc i SSR, i przeglądarka wysyłają ten sam nagłówek — odpowiedź z transfer cache pasuje 1:1.
 * Nie polegamy na Accept-Language przeglądarki: czytelniczka z angielskim systemem, która
 * otworzyła polską wersję, ma dostać polskie tytuły.
 */
export const apiLanguageInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) return next(req);
  return next(req.clone({ setHeaders: { 'Accept-Language': inject(LOCALE_ID) } }));
};
