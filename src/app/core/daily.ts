import { InjectionToken, TransferState, inject, makeStateKey } from '@angular/core';

/**
 * Zegar jako token zamiast `new Date()` w komponencie — testy (i ćwiczenia) mogą go podmienić,
 * np. żeby udawać, że serwer renderował tuż przed północą.
 */
export const NOW = new InjectionToken<() => Date>('NOW', { factory: () => () => new Date() });

/** Dzień w UTC, "2026-10-28". UTC, bo serwer i czytelniczka mogą żyć w innych strefach. */
export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Pełne dni między dwoma dniami RRRR-MM-DD (UTC). Ujemne = data już minęła. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Deterministyczny wybór: ten sam dzień → ten sam indeks, na każdej maszynie. */
export function pickForDay(day: string, count: number): number {
  // FNV-1a — prosty hash; zwykła suma kodów znaków dawałaby sąsiednim dniom sąsiednie indeksy.
  let hash = 0x811c9dc5;
  for (let i = 0; i < day.length; i++) {
    hash ^= day.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % count;
}

const DAY_KEY = makeStateKey<string>('dzien-renderu');

/**
 * „Dzisiaj” wspólne dla serwera i przeglądarki. Serwer liczy dzień i zapisuje go w TransferState
 * (ląduje w <script id="ng-state">), przeglądarka odczytuje go zamiast pytać własny zegar.
 * Bez tego render o 23:59:59 UTC i hydracja o 00:00:01 wybrałyby różne tropy.
 * Wywołuj w kontekście wstrzykiwania (pole klasy, konstruktor).
 */
export function injectRenderDay(): string {
  const state = inject(TransferState);
  if (state.hasKey(DAY_KEY)) return state.get(DAY_KEY, '');

  // Serwer albo przeglądarka bez wcześniejszego SSR tej wartości (np. nawigacja kliknięciem).
  const day = utcDay(inject(NOW)());
  state.set(DAY_KEY, day);
  return day;
}
