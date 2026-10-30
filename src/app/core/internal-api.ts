import { DOCUMENT } from '@angular/common';
import { FetchBackend, type HttpEvent, type HttpRequest } from '@angular/common/http';
import { Injectable, REQUEST_CONTEXT, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { RequestContext } from '../../shared/models';

/**
 * Server-only HTTP backend: during SSR, calls to our own API skip the public internet.
 *
 * Components use relative URLs (/api/books/…). On the server Angular resolves them against the
 * request URL — in production that is https://<app>.onrender.com, so the server would call itself
 * through DNS, TLS and Render's proxy (slow, and from the outside the API looks like any client).
 * Here the public origin is swapped for the local one Express gave us (http://127.0.0.1:PORT).
 *
 * Why a backend and not an interceptor: the backend runs AFTER every interceptor, including the
 * transfer cache. The cache key stays "/api/…", exactly what the browser asks for after hydration.
 * (An interceptor would change the key and the browser would fetch everything again.)
 *
 * No apiOrigin (ng serve, prerendering in `ng build`) → nothing changes.
 */
@Injectable()
export class InternalApiBackend extends FetchBackend {
  private readonly apiOrigin = (inject(REQUEST_CONTEXT, { optional: true }) as RequestContext | null)?.apiOrigin;
  private readonly publicOrigin = inject(DOCUMENT).location.origin;

  override handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    if (this.apiOrigin && request.url.startsWith(`${this.publicOrigin}/api/`)) {
      request = request.clone({ url: this.apiOrigin + request.url.slice(this.publicOrigin.length) });
    }
    return super.handle(request);
  }
}
