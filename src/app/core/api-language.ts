import type { HttpInterceptorFn } from '@angular/common/http';
import { LOCALE_ID, inject } from '@angular/core';

/**
 * Tells the API which language this app version is in. The build compiled in LOCALE_ID (pl / en),
 * so both SSR and the browser send the same header — the response from the transfer cache matches 1:1.
 * We do not rely on the browser's Accept-Language: a reader with an English system who opened
 * the Polish version should get Polish titles.
 */
export const apiLanguageInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) return next(req);
  return next(req.clone({ setHeaders: { 'Accept-Language': inject(LOCALE_ID) } }));
};
