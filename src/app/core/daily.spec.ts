import { TestBed } from '@angular/core/testing';
import { TransferState, makeStateKey } from '@angular/core';
import { NOW, daysBetween, injectRenderDay, pickForDay, utcDay } from './daily';

describe('daily', () => {
  it('utcDay liczy dzień w UTC, niezależnie od strefy', () => {
    // 23:30 in Warsaw (UTC+1) is still the same day in UTC, 00:30 the next day — no longer.
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
    // This is what the browser looks like after SSR: the server managed to store "yesterday".
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

describe('daysBetween', () => {
  it('counts whole UTC days, negative for the past', () => {
    expect(daysBetween('2026-10-29', '2026-10-30')).toBe(1);
    expect(daysBetween('2026-10-29', '2026-10-29')).toBe(0);
    expect(daysBetween('2026-10-29', '2026-10-20')).toBe(-9);
    // A DST change (25.10.2026 in Europe) does not change the result — we count in UTC.
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
  });
});
