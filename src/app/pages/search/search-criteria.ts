import type { SeriesFilter, Spice } from '../../../shared/models';

/**
 * Search criteria in normalised form. The same object is built from the URL
 * (/szukaj?trop=…) and from the form (FormData), so both inputs behave identically.
 */
export interface SearchCriteria {
  q: string;
  /** Sorted and de-duplicated — so the order in the URL does not matter. */
  tropes: string[];
  mode: SearchMode;
  maxSpice: Spice | null;
  status: StatusParam | null;
}

/** Polish values in the URL (for the reader), English ones in the API (the contract in shared/models). */
export type SearchMode = 'wszystkie' | 'dowolny';
export type StatusParam = 'w-trakcie' | 'zakonczona' | 'pojedyncza';

const STATUS_TO_API: Record<StatusParam, SeriesFilter> = {
  'w-trakcie': 'ongoing',
  zakonczona: 'completed',
  pojedyncza: 'standalone',
};

/** The common denominator of ParamMap (router) and FormData (form). */
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
 * URL parameters in a fixed order, without default values. This is the results' "canonical address":
 * ?tryb=wszystkie&trop=b&trop=a and ?trop=a&trop=b give the same.
 */
export function toQueryParams(c: SearchCriteria): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  if (c.q) params['q'] = c.q;
  if (c.tropes.length) params['trop'] = c.tropes;
  // The mode matters only with two tropes — otherwise it is noise in the URL.
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
