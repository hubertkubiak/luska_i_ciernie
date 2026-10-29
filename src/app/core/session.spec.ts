import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, REQUEST_CONTEXT, TransferState, makeStateKey } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { RequestContext, SessionUser } from '../../shared/models';
import { Session } from './session';

const violet: SessionUser = { email: 'violet@example.com', displayName: 'Violet' };
const KEY = makeStateKey<SessionUser | null>('sesja');

function setup(platform: 'server' | 'browser', context?: RequestContext, transferred?: SessionUser | null) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: PLATFORM_ID, useValue: platform },
      ...(context ? [{ provide: REQUEST_CONTEXT, useValue: context }] : []),
    ],
  });
  if (transferred !== undefined) TestBed.inject(TransferState).set(KEY, transferred);
  return { session: TestBed.inject(Session), state: TestBed.inject(TransferState) };
}

describe('Session', () => {
  it('SSR: bierze osobę z REQUEST_CONTEXT i przekazuje ją przeglądarce w TransferState', () => {
    const { session, state } = setup('server', { user: violet });
    expect(session.user()).toEqual(violet);
    expect(state.get(KEY, null)).toEqual(violet);
  });

  it('SSR anonima: zapisuje „na pewno anonim” (null)', () => {
    const { session, state } = setup('server', { user: null });
    expect(session.user()).toBeNull();
    expect(state.hasKey(KEY)).toBe(true);
  });

  it('prerender (brak kontekstu): NIE zapisuje nic — ten HTML zobaczą też zalogowani', async () => {
    const { session, state } = setup('server');
    expect(session.user()).toBeUndefined();
    expect(state.hasKey(KEY)).toBe(false);
    expect(await session.load()).toBeNull();
  });

  it('przeglądarka po SSR: wie od razu, bez żądania do /api/me', async () => {
    const { session } = setup('browser', undefined, violet);
    expect(await session.load()).toEqual(violet);
    TestBed.inject(HttpTestingController).expectNone('/api/me');
  });

  it('przeglądarka po prerenderze: pyta /api/me raz, nawet przy kilku wywołaniach', async () => {
    const { session } = setup('browser');
    const first = session.load();
    const second = session.load();
    TestBed.inject(HttpTestingController).expectOne('/api/me').flush(violet);
    expect(await first).toEqual(violet);
    expect(await second).toEqual(violet);
    expect(session.user()).toEqual(violet);
  });

  it('przeglądarka: 401 z /api/me = anonim', async () => {
    const { session } = setup('browser');
    const result = session.load();
    TestBed.inject(HttpTestingController).expectOne('/api/me').flush({ error: 'x' }, { status: 401, statusText: 'Unauthorized' });
    expect(await result).toBeNull();
  });
});
