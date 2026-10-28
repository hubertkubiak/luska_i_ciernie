// Kontrakt API — importowany zarówno przez serwer (src/server), jak i aplikację Angular (src/app).
// Dzięki temu zmiana kształtu odpowiedzi wysypie się w kompilacji po obu stronach.

/** Kraina z SPEC §2.2 — wyznacza akcent kolorystyczny. */
export type Realm = 'turnie' | 'mgly' | 'skryptorium';

export type SeriesStatus = 'ongoing' | 'completed';

/** 0 — Niewinny pocałunek … 5 — Smoczy ogień */
export type Spice = 0 | 1 | 2 | 3 | 4 | 5;

export interface TropeRef {
  slug: string;
  name: string;
}

export interface Trope extends TropeRef {
  description: string;
  realm: Realm;
  bookCount: number;
}

export interface AuthorRef {
  slug: string;
  name: string;
}

export interface SeriesRef {
  slug: string;
  name: string;
  status: SeriesStatus;
  plannedBooks?: number;
}

/** Wersja „na kartę” — wystarcza do list i wyników wyszukiwania. */
export interface BookSummary {
  slug: string;
  title: string;
  year: number;
  spice: Spice;
  coverUrl: string;
  author: AuthorRef;
  tropes: TropeRef[];
  series?: SeriesRef & { index: number };
}

export interface BookDetail extends BookSummary {
  isbn: string;
  pages: number;
  description: string;
  contentWarnings: string[];
  realm: Realm;
  /** Pozostałe tomy serii (łącznie z bieżącym), w kolejności. */
  seriesBooks: { slug: string; title: string; index: number }[];
}

export interface AuthorDetail extends AuthorRef {
  bio: string;
  books: BookSummary[];
}

export interface TropeDetail extends Trope {
  books: BookSummary[];
}

/** Status serii z perspektywy wyszukiwania — „standalone” = książka spoza serii. */
export type SeriesFilter = SeriesStatus | 'standalone';

/** Filtry GET /api/books. Wszystkie opcjonalne; brak = bez ograniczenia. */
export interface BookQuery {
  /** Fraza szukana w tytule, autorze i nazwie serii (bez względu na wielkość liter i ogonki). */
  q?: string;
  tropes?: string[];
  /** all = książka ma wszystkie tropy (AND), any = choć jeden (OR). Domyślnie all. */
  match?: 'all' | 'any';
  maxSpice?: Spice;
  status?: SeriesFilter;
  author?: string;
}

export interface ApiError {
  error: string;
}
