// Kontrakt API — importowany zarówno przez serwer (src/server), jak i aplikację Angular (src/app).
// Dzięki temu zmiana kształtu odpowiedzi wysypie się w kompilacji po obu stronach.

/**
 * Języki serwisu. Pierwszy = domyślny, gdy klient nie poda Accept-Language.
 * Nowy język: wpis tutaj + locale w angular.json ("i18n") + src/locale/messages.<lang>.json
 * + klucz <lang> w `titles` / `covers` / `names` w seed/*.json.
 */
export const LANGS = ['pl', 'en'] as const;
export type Lang = (typeof LANGS)[number];

/** Prefiks ścieżki każdej wersji językowej — musi zgadzać się z "subPath" w angular.json. */
export const LANG_PREFIX: Record<Lang, string> = { pl: '', en: '/en' };

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
  /** Tytuł w języku żądania (Accept-Language): tytuł lokalnego wydania albo oryginał. */
  title: string;
  year: number;
  spice: Spice;
  /** null = brak okładki, której wolno użyć → UI rysuje własną (patrz docs/PRAWNE.md). */
  coverUrl: string | null;
  /** Kraina dominującego tropu — kolor generowanej okładki i akcentów. */
  realm: Realm;
  author: AuthorRef;
  tropes: TropeRef[];
  series?: SeriesRef & { index: number };
}

export interface BookDetail extends BookSummary {
  /** Tytuł oryginału — tylko gdy różni się od `title`. */
  originalTitle?: string;
  isbn: string;
  /** Brak, gdy żadne źródło nie podaje liczby stron (nie zgadujemy). */
  pages?: number;
  description: string;
  contentWarnings: string[];
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
  /** Konkretne książki (np. polecane na stronie głównej) — w kolejności podanej tutaj. */
  slugs?: string[];
}

export interface ApiError {
  error: string;
}

/** Zalogowana osoba — tylko to, czego potrzebuje interfejs (bez hasła, bez identyfikatora sesji). */
export interface SessionUser {
  email: string;
  displayName: string;
}

/**
 * Dane, które Express przekazuje Angularowi przy renderze (angularApp.handle(req, context)),
 * a Angular czyta przez inject(REQUEST_CONTEXT). Podczas prerenderu w `ng build` kontekstu nie ma.
 */
export interface RequestContext {
  user: SessionUser | null;
}

/** Zapowiedź premiery (GET /api/releases). */
export interface Release {
  slug: string;
  title: string;
  author: string;
  /** Dzień premiery, RRRR-MM-DD. */
  date: string;
  note: string | null;
}

/** Motyw: noc (domyślny) albo pergamin. Zapisany w ciasteczku `theme`. */
export const THEMES = ['night', 'parchment'] as const;
export type Theme = (typeof THEMES)[number];

/** Półka: do przeczytania / czytam / przeczytane. */
export const SHELF_STATUSES = ['tbr', 'reading', 'read'] as const;
export type ShelfStatus = (typeof SHELF_STATUSES)[number];

/** Co czytelniczka może zapisać o książce (PUT /api/shelf/:slug). */
export interface ShelfEntry {
  status: ShelfStatus;
  /** 1–5, tylko dla przeczytanych. */
  rating?: number | null;
  note?: string | null;
}

export interface ShelfItem extends ShelfEntry {
  slug: string;
  updatedAt: string;
  book: BookSummary;
}
