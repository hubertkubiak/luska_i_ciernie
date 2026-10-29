import type { DatabaseSync } from 'node:sqlite';
import type {
  AuthorDetail,
  BookDetail,
  BookQuery,
  BookSummary,
  Lang,
  Realm,
  SeriesStatus,
  Spice,
  Trope,
  TropeDetail,
} from '../shared/models';
import { fold } from './db/database';

export interface CatalogOptions {
  /**
   * Skąd brać okładki. 'openlibrary' — obrazy z covers.openlibrary.org; 'none' — brak URL-i,
   * UI rysuje własne okładki. Okładki są chronione prawem autorskim — patrz docs/PRAWNE.md.
   */
  covers?: 'openlibrary' | 'none';
}

/** Wiersz zapytania summarySql() — kolumny nazwane tak, żeby mapowanie na BookSummary było oczywiste. */
interface SummaryRow {
  slug: string;
  title: string;
  original_title: string;
  year: number;
  spice: number;
  cover_id: number;
  realm: Realm;
  author_slug: string;
  author_name: string;
  series_slug: string | null;
  series_name: string | null;
  series_status: SeriesStatus | null;
  planned_books: number | null;
  series_index: number | null;
  /** JSON z json_group_array — SQLite składa listę tropów w jednym zapytaniu. */
  tropes: string;
}

/**
 * Wspólny SELECT kart książek. Tytuł, okładka i nazwa serii biorą wersję lokalną (LEFT JOIN
 * po języku), a gdy jej brak — oryginał (COALESCE). Tropy i kraina przychodzą z podzapytań,
 * więc lista 91 książek to jedno zapytanie, a nie 91 dodatkowych (problem N+1).
 */
const summarySql = (extraColumns = '') => `
SELECT ${extraColumns}
  b.slug,
  COALESCE(bt.title, b.title)       AS title,
  b.title                           AS original_title,
  b.year,
  b.spice,
  COALESCE(bc.cover_id, b.cover_id) AS cover_id,
  a.slug                            AS author_slug,
  a.name                            AS author_name,
  s.slug                            AS series_slug,
  COALESCE(sn.name, s.name)         AS series_name,
  s.status                          AS series_status,
  s.planned_books,
  b.series_index,
  (SELECT t.realm FROM book_tropes x JOIN tropes t ON t.slug = x.trope
    WHERE x.book = b.slug ORDER BY x.position LIMIT 1) AS realm,
  (SELECT json_group_array(json_object('slug', slug, 'name', name)) FROM (
     SELECT t.slug, t.name FROM book_tropes x JOIN tropes t ON t.slug = x.trope
      WHERE x.book = b.slug ORDER BY x.position)) AS tropes
FROM books b
JOIN authors a          ON a.slug = b.author
LEFT JOIN series s      ON s.slug = b.series
LEFT JOIN book_titles bt  ON bt.book = b.slug AND bt.lang = :lang
LEFT JOIN book_covers bc  ON bc.book = b.slug AND bc.lang = :lang
LEFT JOIN series_names sn ON sn.series = s.slug AND sn.lang = :lang
`;

/**
 * Katalog nad bazą SQLite. Publiczne metody są te same co w wersji „w pamięci” z etapów 2–10,
 * więc api.ts, seo.ts i cała aplikacja Angular nie zauważyły zmiany.
 */
export class Catalog {
  private readonly covers: NonNullable<CatalogOptions['covers']>;

  constructor(
    private readonly db: DatabaseSync,
    options: CatalogOptions = {},
  ) {
    this.covers = options.covers ?? 'openlibrary';
  }

  /** Aktualny slug dla dawnego adresu książki albo undefined. */
  currentBookSlug(oldSlug: string): string | undefined {
    const row = this.db.prepare('SELECT book FROM old_slugs WHERE old_slug = ?').get(oldSlug) as
      | { book: string }
      | undefined;
    return row?.book;
  }

  /** Lista książek po filtrach, posortowana po tytule w danym języku — kolejność jest stabilna. */
  listBooks(query: BookQuery = {}, lang: Lang = 'pl'): BookSummary[] {
    const tropes = query.tropes ?? [];
    const rows = this.db
      .prepare(
        `${summarySql()}
        WHERE (:author IS NULL OR b.author = :author)
          AND (:maxSpice IS NULL OR b.spice <= :maxSpice)
          AND (:status IS NULL OR COALESCE(s.status, 'standalone') = :status)
          AND (:needle IS NULL OR b.search_text LIKE '%' || :needle || '%' ESCAPE '\\')
          AND (:slugs IS NULL OR b.slug IN (SELECT value FROM json_each(:slugs)))
          -- AND: książka ma wszystkie wybrane tropy; OR (match=any): choć jeden.
          AND (:tropeCount = 0 OR (
            SELECT COUNT(*) FROM book_tropes x
             WHERE x.book = b.slug AND x.trope IN (SELECT value FROM json_each(:tropes))
          ) >= (CASE :match WHEN 'any' THEN 1 ELSE :tropeCount END))`,
      )
      .all({
        lang,
        author: query.author ?? null,
        maxSpice: query.maxSpice ?? null,
        status: query.status ?? null,
        needle: query.q ? escapeLike(fold(query.q)) : null,
        slugs: query.slugs ? JSON.stringify(query.slugs) : null,
        tropes: JSON.stringify(tropes),
        tropeCount: tropes.length,
        match: query.match ?? 'all',
      }) as unknown as SummaryRow[];

    const books = rows.map((r) => this.toSummary(r));
    if (query.slugs) {
      const order = query.slugs;
      return books.sort((x, y) => order.indexOf(x.slug) - order.indexOf(y.slug));
    }
    // Sortujemy w JS: SQLite bez rozszerzenia ICU nie zna polskiej kolejności (Ł po L, Ś po S).
    return books.sort((x, y) => x.title.localeCompare(y.title, lang));
  }

  getBook(slug: string, lang: Lang = 'pl'): BookDetail | undefined {
    const row = this.db
      .prepare(
        `${summarySql('b.isbn, b.pages, b.description,')} WHERE b.slug = :slug`,
      )
      .get({ lang, slug }) as (SummaryRow & { isbn: string; pages: number | null; description: string }) | undefined;
    if (!row) return undefined;

    const warnings = this.db
      .prepare('SELECT text FROM content_warnings WHERE book = ? ORDER BY position')
      .all(slug) as { text: string }[];
    const seriesBooks = row.series_slug
      ? (this.db
          .prepare(
            `SELECT b.slug, COALESCE(bt.title, b.title) AS title, b.series_index AS "index"
               FROM books b LEFT JOIN book_titles bt ON bt.book = b.slug AND bt.lang = :lang
              WHERE b.series = :series ORDER BY b.series_index`,
          )
          .all({ lang, series: row.series_slug }) as { slug: string; title: string; index: number }[])
      : [];

    return {
      ...this.toSummary(row),
      ...(row.title !== row.original_title && { originalTitle: row.original_title }),
      isbn: row.isbn,
      ...(row.pages && { pages: row.pages }),
      description: row.description,
      contentWarnings: warnings.map((w) => w.text),
      seriesBooks: seriesBooks.map((b) => ({ ...b })),
    };
  }

  getAuthor(slug: string, lang: Lang = 'pl'): AuthorDetail | undefined {
    const a = this.db.prepare('SELECT slug, name, bio FROM authors WHERE slug = ?').get(slug) as
      | { slug: string; name: string; bio: string }
      | undefined;
    if (!a) return undefined;
    return { ...a, books: this.listBooks({ author: slug }, lang) };
  }

  listTropes(): Trope[] {
    return (
      this.db
        .prepare(
          `SELECT t.slug, t.name, t.realm, t.description,
                  (SELECT COUNT(*) FROM book_tropes x WHERE x.trope = t.slug) AS bookCount
             FROM tropes t ORDER BY t.position`,
        )
        .all() as unknown as Trope[]
    ).map((t) => ({ ...t }));
  }

  getTrope(slug: string, lang: Lang = 'pl'): TropeDetail | undefined {
    const t = this.listTropes().find((x) => x.slug === slug);
    if (!t) return undefined;
    return { ...t, books: this.listBooks({ tropes: [slug] }, lang) };
  }

  private toSummary(r: SummaryRow): BookSummary {
    return {
      slug: r.slug,
      title: r.title,
      year: r.year,
      spice: r.spice as Spice,
      coverUrl: this.covers === 'none' ? null : `https://covers.openlibrary.org/b/id/${r.cover_id}-M.jpg`,
      realm: r.realm,
      author: { slug: r.author_slug, name: r.author_name },
      tropes: JSON.parse(r.tropes),
      series: r.series_slug
        ? {
            slug: r.series_slug,
            name: r.series_name!,
            status: r.series_status!,
            ...(r.planned_books && { plannedBooks: r.planned_books }),
            index: r.series_index ?? 1,
          }
        : undefined,
    };
  }
}

/** % i _ to w LIKE symbole wieloznaczne — w tekście od użytkownika muszą znaczyć siebie. */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}
