import type { HttpInterceptorFn } from '@angular/common/http';
import { REQUEST, inject } from '@angular/core';

/**
 * SSR and the session. While rendering on the server HttpClient calls our API like any other client —
 * WITHOUT the reader's cookies, because the server sends the request, not her browser. For the catalogue
 * that is good (shared responses), but the shelf state on a book page depends on who is looking.
 *
 * So we forward the session cookie, with two restrictions:
 * - only to our own /api/shelf (a relative URL = the same server) — forwarding the session to a foreign
 *   API would hand it the reader's account,
 * - only the `sid` cookie, not the whole Cookie header.
 * In the browser REQUEST does not exist — there the browser attaches cookies itself.
 */
export const forwardSessionInterceptor: HttpInterceptorFn = (req, next) => {
  const request = inject(REQUEST, { optional: true });
  if (!request || !req.url.startsWith('/api/shelf')) return next(req);
  const sid = /(?:^|;\s*)sid=([^;]*)/.exec(request.headers.get('cookie') ?? '')?.[1];
  return sid ? next(req.clone({ setHeaders: { Cookie: `sid=${sid}` } })) : next(req);
};
