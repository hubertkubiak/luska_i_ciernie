import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, REQUEST_CONTEXT, TransferState, inject, makeStateKey, signal } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';
import type { RequestContext, SessionUser } from '../../shared/models';

const USER_KEY = makeStateKey<SessionUser | null>('sesja');

/**
 * Who is signed in. Three states:
 * - SessionUser — a signed-in person,
 * - null — definitely anonymous,
 * - undefined — we do not know yet.
 *
 * How we know:
 * 1. SSR: Express read the cookie and passed the person in REQUEST_CONTEXT (server.ts). We store it
 *    in TransferState, so after hydration the browser knows the same without an extra request.
 * 2. Prerender (`ng build`): there is no request at all, so REQUEST_CONTEXT is empty. We do NOT store
 *    "anonymous" then — the same HTML file is later served to everyone, signed-in people too.
 * 3. The browser without a TransferState entry (prerendered page, Client mode): asks /api/me.
 */
@Injectable({ providedIn: 'root' })
export class Session {
  private readonly http = inject(HttpClient);
  private readonly server = isPlatformServer(inject(PLATFORM_ID));
  private readonly current = signal<SessionUser | null | undefined>(undefined);
  private pending?: Promise<SessionUser | null>;

  readonly user = this.current.asReadonly();

  constructor() {
    const state = inject(TransferState);
    if (this.server) {
      const context = inject(REQUEST_CONTEXT, { optional: true }) as RequestContext | null;
      if (context) {
        this.current.set(context.user);
        state.set(USER_KEY, context.user);
      }
    } else if (state.hasKey(USER_KEY)) {
      this.current.set(state.get(USER_KEY, null));
    }
  }

  /** A certain answer: at once if we know it, and in the browser via /api/me if needed. */
  load(): Promise<SessionUser | null> {
    const known = this.current();
    if (known !== undefined) return Promise.resolve(known);
    // On the server without a context (prerender) there is no one to ask — the page is to be "anonymous".
    if (this.server) return Promise.resolve(null);
    return (this.pending ??= firstValueFrom(
      this.http.get<SessionUser>('/api/me').pipe(catchError(() => of(null))),
    ).then((user) => {
      this.current.set(user);
      return user;
    }));
  }
}
