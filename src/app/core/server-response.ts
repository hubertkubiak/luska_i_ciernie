import { Injectable, RESPONSE_INIT, inject } from '@angular/core';

/**
 * The only place in the app that touches RESPONSE_INIT.
 *
 * RESPONSE_INIT is a plain `ResponseInit` object (status + headers) that AngularNodeAppEngine
 * turns into the HTTP response after rendering. It exists only in RenderMode.Server —
 * in the browser (and while prerendering) we inject null, so the methods are no-ops there.
 *
 * When is the status set "in time"? The engine waits for `ApplicationRef.whenStable()` — i.e. also for
 * finished HTTP requests and effects — before building the Response. A status set in an effect
 * after the API response is therefore still taken into account.
 */
@Injectable({ providedIn: 'root' })
export class ServerResponse {
  private readonly init = inject(RESPONSE_INIT, { optional: true });

  setStatus(status: number): void {
    if (this.init) this.init.status = status;
  }
}
