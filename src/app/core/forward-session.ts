import type { HttpInterceptorFn } from '@angular/common/http';
import { REQUEST, inject } from '@angular/core';

/**
 * SSR i sesja. Podczas renderu na serwerze HttpClient woła nasze API jak każdy inny klient —
 * BEZ ciasteczek czytelniczki, bo to serwer wysyła żądanie, a nie jej przeglądarka. Dla katalogu
 * to dobrze (wspólne odpowiedzi), ale stan półki na stronie książki zależy od tego, kto patrzy.
 *
 * Dlatego przekazujemy dalej ciasteczko sesji, z dwoma ograniczeniami:
 * - tylko do naszego /api/shelf (adres względny = ten sam serwer) — przekazanie sesji do obcego
 *   API oddałoby mu konto czytelniczki,
 * - tylko ciasteczko `sid`, nie cały nagłówek Cookie.
 * W przeglądarce REQUEST nie istnieje — tam ciasteczka dołącza sama przeglądarka.
 */
export const forwardSessionInterceptor: HttpInterceptorFn = (req, next) => {
  const request = inject(REQUEST, { optional: true });
  if (!request || !req.url.startsWith('/api/shelf')) return next(req);
  const sid = /(?:^|;\s*)sid=([^;]*)/.exec(request.headers.get('cookie') ?? '')?.[1];
  return sid ? next(req.clone({ setHeaders: { Cookie: `sid=${sid}` } })) : next(req);
};
