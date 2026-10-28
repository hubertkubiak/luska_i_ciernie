import { TestBed } from '@angular/core/testing';
import { TransferState, makeStateKey } from '@angular/core';
import { NOW, injectRenderDay, pickForDay, utcDay } from './daily';

describe('daily', () => {
  it('utcDay liczy dzień w UTC, niezależnie od strefy', () => {
    // 23:30 w Warszawie (UTC+1) to jeszcze ten sam dzień w UTC, 00:30 następnego dnia — już nie.
    expect(utcDay(new Date('2026-01-15T23:30:00+01:00'))).toBe('2026-01-15');
    expect(utcDay(new Date('2026-01-16T00:30:00+01:00'))).toBe('2026-01-15');
  });

  it('pickForDay jest deterministyczny i mieści się w zakresie', () => {
    expect(pickForDay('2026-10-28', 17)).toBe(pickForDay('2026-10-28', 17));
    for (let d = 1; d <= 28; d++) {
      const i = pickForDay(`2026-02-${String(d).padStart(2, '0')}`, 17);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(17);
    }
  });

  it('injectRenderDay woli dzień z TransferState niż własny zegar', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: NOW, useValue: () => new Date('2026-10-29T00:00:01Z') }],
    });
    // Tak wygląda przeglądarka po SSR: serwer zdążył zapisać „wczoraj”.
    TestBed.inject(TransferState).set(makeStateKey<string>('dzien-renderu'), '2026-10-28');

    expect(TestBed.runInInjectionContext(() => injectRenderDay())).toBe('2026-10-28');
  });

  it('bez wpisu w TransferState liczy dzień z zegara i go zapisuje', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: NOW, useValue: () => new Date('2026-10-29T00:00:01Z') }],
    });
    expect(TestBed.runInInjectionContext(() => injectRenderDay())).toBe('2026-10-29');
    expect(TestBed.inject(TransferState).get(makeStateKey<string>('dzien-renderu'), '')).toBe('2026-10-29');
  });
});
