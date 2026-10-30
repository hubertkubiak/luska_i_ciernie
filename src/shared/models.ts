// The API contract — imported by both the server (src/server) and the Angular app (src/app).
// A change to a response shape therefore breaks the compilation on both sides.

/**
 * Site languages. The first one is the default when the client sends no Accept-Language.
 * New language: an entry here + a locale in angular.json ("i18n") + src/locale/messages.<lang>.json
 * + a <lang> key in `titles` / `covers` / `names` in seed/*.json.
 */
export const LANGS = ['pl', 'en'] as const;
export type Lang = (typeof LANGS)[number];

/** Path prefix of each language version — must match "subPath" in angular.json. */
export const LANG_PREFIX: Record<Lang, string> = { pl: '', en: '/en' };

/** Realm from SPEC §2.2 — sets the colour accent. */
export type Realm = 'turnie' | 'mgly' | 'skryptorium';

export type SeriesStatus = 'ongoing' | 'completed';

/** 0 — Innocent kiss … 5 — Dragonfire */
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

/** The "card" version — enough for lists and search results. */
export interface BookSummary {
  slug: string;
  /** Title in the request language (Accept-Language): the local edition's title or the original. */
  title: string;
  year: number;
  spice: Spice;
  /** null = no cover we may use → the UI draws its own (see docs/PRAWNE.md). */
  coverUrl: string | null;
  /** Realm of the dominant trope — colour of the generated cover and accents. */
  realm: Realm;
  author: AuthorRef;
  tropes: TropeRef[];
  series?: SeriesRef & { index: number };
}

export interface BookDetail extends BookSummary {
  /** Original title — only when it differs from `title`. */
  originalTitle?: string;
  isbn: string;
  /** Missing when no source gives the page count (we do not guess). */
  pages?: number;
  description: string;
  contentWarnings: string[];
  /** The other volumes of the series (including this one), in order. */
  seriesBooks: { slug: string; title: string; index: number }[];
  /** Up to 4 books outside the series with the most shared tropes, most similar first. */
  similar: BookSummary[];
}

export interface AuthorDetail extends AuthorRef {
  bio: string;
  books: BookSummary[];
}

export interface TropeDetail extends Trope {
  books: BookSummary[];
}

/** Series status from the search's point of view — "standalone" = a book outside any series. */
export type SeriesFilter = SeriesStatus | 'standalone';

/** GET /api/books filters. All optional; missing = no restriction. */
export interface BookQuery {
  /** Phrase searched in title, author and series name (case- and diacritics-insensitive). */
  q?: string;
  tropes?: string[];
  /** all = the book has every trope (AND), any = at least one (OR). Default: all. */
  match?: 'all' | 'any';
  maxSpice?: Spice;
  status?: SeriesFilter;
  author?: string;
  /** Specific books (e.g. featured on the home page) — in the order given here. */
  slugs?: string[];
}

export interface ApiError {
  error: string;
}

/** The signed-in person — only what the UI needs (no password, no session id). */
export interface SessionUser {
  email: string;
  displayName: string;
}

/**
 * Origin written into prerendered HTML (canonical, hreflang, og:url, JSON-LD). At `ng build` time the
 * public address is unknown — the build serves pages from a random localhost port — so Seo writes this
 * reserved, never-resolving origin (.invalid, RFC 2606) and Express swaps it for the real one on the way out.
 */
export const PRERENDER_ORIGIN = 'https://prerender.invalid';

/**
 * Data Express passes to Angular when rendering (angularApp.handle(req, context)),
 * read by Angular via inject(REQUEST_CONTEXT). There is no context while prerendering in `ng build`.
 */
export interface RequestContext {
  user: SessionUser | null;
  /** Public demo with ephemeral storage (DEMO_MODE=true) — auth pages warn about it. */
  demo?: boolean;
  /** Real covers can be shown at all (COVER_SOURCE ≠ none) — otherwise there is nothing to consent to. */
  covers?: boolean;
  /** Where SSR should call our own API directly (http://127.0.0.1:PORT) — see core/internal-api.ts. */
  apiOrigin?: string;
}

/** A release announcement (GET /api/releases). */
/**
 * How exact a release date is. Announcements often name only a month ("November 2026") or
 * "the end of the year" — we show that as it is instead of inventing a day.
 */
export const RELEASE_PRECISIONS = ['day', 'month', 'quarter'] as const;
export type ReleasePrecision = (typeof RELEASE_PRECISIONS)[number];

export interface Release {
  slug: string;
  title: string;
  author: string;
  /**
   * YYYY-MM-DD. For a 'day' — the release day; for a month or quarter — the LAST day of that period,
   * so sorting puts "November" after every known November day and the entry stays listed until it ends.
   */
  date: string;
  precision: ReleasePrecision;
  note: string | null;
}

/** Theme: night (default) or parchment. Stored in the `theme` cookie. */
export const THEMES = ['night', 'parchment'] as const;
export type Theme = (typeof THEMES)[number];

/**
 * The decision about real covers from Open Library: `covers=on` (consent) or `covers=off` (declined or
 * withdrawn). Without consent the UI draws only our own covers, so the reader's browser never connects
 * to a third-party server (docs/PRAWNE.md §2).
 */
export const COVERS_COOKIE = 'covers';

/** Shelf: to read / reading / read. */
export const SHELF_STATUSES = ['tbr', 'reading', 'read'] as const;
export type ShelfStatus = (typeof SHELF_STATUSES)[number];

/** What a reader may save about a book (PUT /api/shelf/:slug). */
export interface ShelfEntry {
  status: ShelfStatus;
  /** 1–5, only for books already read. */
  rating?: number | null;
  note?: string | null;
}

export interface ShelfItem extends ShelfEntry {
  slug: string;
  updatedAt: string;
  book: BookSummary;
}
