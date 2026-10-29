import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, REQUEST_CONTEXT, TransferState, inject, makeStateKey, signal } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';
import type { RequestContext, SessionUser } from '../../shared/models';

const USER_KEY = makeStateKey<SessionUser | null>('sesja');

/**
 * Kto jest zalogowany. Trzy stany:
 * - SessionUser — zalogowana osoba,
 * - null — na pewno anonim,
 * - undefined — jeszcze nie wiemy.
 *
 * Skąd wiemy:
 * 1. SSR: Express odczytał ciasteczko i przekazał osobę w REQUEST_CONTEXT (server.ts). Zapisujemy ją
 *    w TransferState, więc przeglądarka po hydracji wie to samo bez dodatkowego żądania.
 * 2. Prerender (`ng build`): nie ma żadnego żądania, więc REQUEST_CONTEXT jest pusty. NIE zapisujemy
 *    wtedy „anonim” — ten sam plik HTML dostanie później każdy, także zalogowany.
 * 3. Przeglądarka bez wpisu w TransferState (strona z prerenderu, tryb Client): pyta /api/me.
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

  /** Pewna odpowiedź: od razu, jeśli ją znamy, a w przeglądarce w razie potrzeby przez /api/me. */
  load(): Promise<SessionUser | null> {
    const known = this.current();
    if (known !== undefined) return Promise.resolve(known);
    // Na serwerze bez kontekstu (prerender) nie mamy kogo zapytać — strona ma być „anonimowa”.
    if (this.server) return Promise.resolve(null);
    return (this.pending ??= firstValueFrom(
      this.http.get<SessionUser>('/api/me').pipe(catchError(() => of(null))),
    ).then((user) => {
      this.current.set(user);
      return user;
    }));
  }
}
