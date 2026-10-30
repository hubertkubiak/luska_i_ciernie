import { InjectionToken, TransferState, inject, makeStateKey } from '@angular/core';

/**
 * The clock as a token instead of `new Date()` in a component — tests (and exercises) can replace it,
 * e.g. to pretend the server rendered just before midnight.
 */
export const NOW = new InjectionToken<() => Date>('NOW', { factory: () => () => new Date() });

/** The UTC day, "2026-10-28". UTC, because the server and the reader may live in different time zones. */
export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Whole days between two YYYY-MM-DD days (UTC). Negative = the date has passed. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Deterministic pick: the same day → the same index, on every machine. */
export function pickForDay(day: string, count: number): number {
  // FNV-1a — a simple hash; a plain sum of char codes would give neighbouring days neighbouring indexes.
  let hash = 0x811c9dc5;
  for (let i = 0; i < day.length; i++) {
    hash ^= day.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % count;
}

const DAY_KEY = makeStateKey<string>('dzien-renderu');

/**
 * "Today" shared by server and browser. The server computes the day and stores it in TransferState
 * (it lands in <script id="ng-state">), the browser reads it instead of asking its own clock.
 * Without this a render at 23:59:59 UTC and hydration at 00:00:01 would pick different tropes.
 * Call it in an injection context (class field, constructor).
 */
export function injectRenderDay(): string {
  const state = inject(TransferState);
  if (state.hasKey(DAY_KEY)) return state.get(DAY_KEY, '');

  // The server, or a browser without an SSR value (e.g. navigation by click).
  const day = utcDay(inject(NOW)());
  state.set(DAY_KEY, day);
  return day;
}
