import type { SeriesFilter, Spice } from '../../../shared/models';

/**
 * Kryteria wyszukiwania w postaci znormalizowanej. Ten sam obiekt powstaje z adresu URL
 * (/szukaj?trop=…) i z formularza (FormData), więc oba wejścia zachowują się identycznie.
 */
export interface SearchCriteria {
  q: string;
  /** Posortowane i bez duplikatów — dzięki temu kolejność w URL nie ma znaczenia. */
  tropes: string[];
  mode: SearchMode;
  maxSpice: Spice | null;
  status: StatusParam | null;
}

/** Polskie wartości w URL-u (dla czytelniczki), angielskie w API (kontrakt w shared/models). */
export type SearchMode = 'wszystkie' | 'dowolny';
export type StatusParam = 'w-trakcie' | 'zakonczona' | 'pojedyncza';

const STATUS_TO_API: Record<StatusParam, SeriesFilter> = {
  'w-trakcie': 'ongoing',
  zakonczona: 'completed',
  pojedyncza: 'standalone',
};

/** Wspólny mianownik ParamMap (router) i FormData (formularz). */
export interface ParamSource {
  get(name: string): unknown;
  getAll(name: string): unknown[];
}

export function parseCriteria(src: ParamSource): SearchCriteria {
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const spice = Number(text(src.get('pikanteria')) || NaN);
  const status = text(src.get('status'));

  return {
    q: text(src.get('q')),
    tropes: [...new Set(src.getAll('trop').map(text).filter(Boolean))].sort(),
    mode: text(src.get('tryb')) === 'dowolny' ? 'dowolny' : 'wszystkie',
    maxSpice: Number.isInteger(spice) && spice >= 0 && spice <= 5 ? (spice as Spice) : null,
    status: status in STATUS_TO_API ? (status as StatusParam) : null,
  };
}

/**
 * Parametry do URL-a w stałej kolejności, bez wartości domyślnych. To jest „adres kanoniczny”
 * wyników: ?tryb=wszystkie&trop=b&trop=a i ?trop=a&trop=b dają to samo.
 */
export function toQueryParams(c: SearchCriteria): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  if (c.q) params['q'] = c.q;
  if (c.tropes.length) params['trop'] = c.tropes;
  // Tryb ma znaczenie dopiero przy dwóch tropach — inaczej to szum w adresie.
  if (c.mode === 'dowolny' && c.tropes.length > 1) params['tryb'] = c.mode;
  if (c.maxSpice !== null) params['pikanteria'] = String(c.maxSpice);
  if (c.status) params['status'] = c.status;
  return params;
}

export function toQueryString(c: SearchCriteria): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(toQueryParams(c))) {
    for (const v of Array.isArray(value) ? value : [value]) search.append(key, v);
  }
  return search.toString();
}

export function toApiUrl(c: SearchCriteria): string {
  const search = new URLSearchParams();
  if (c.q) search.set('q', c.q);
  for (const t of c.tropes) search.append('trope', t);
  if (c.mode === 'dowolny') search.set('match', 'any');
  if (c.maxSpice !== null) search.set('maxSpice', String(c.maxSpice));
  if (c.status) search.set('status', STATUS_TO_API[c.status]);
  const qs = search.toString();
  return qs ? `/api/books?${qs}` : '/api/books';
}
