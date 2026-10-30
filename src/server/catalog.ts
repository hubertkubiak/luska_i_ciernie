import type { DatabaseSync } from 'node:sqlite';
import type {
  AuthorDetail,
  BookDetail,
  BookQuery,
  BookSummary,
  Lang,
  Realm,
  Release,
  SeriesStatus,
  Spice,
  Trope,
  TropeDetail,
} from '../shared/models';
import { fold } from './db/database';

export interface CatalogOptions {
  /**
   * Where covers come from. 'openlibrary' — images from covers.openlibrary.org; 'none' — no URLs,
   * the UI draws its own covers. Covers are protected by copyright — see docs/PRAWNE.md.
   */
  covers?: 'openlibrary' | 'none';
}

/** A summarySql() row — columns named so that mapping to BookSummary is obvious. */
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
  /** JSON from json_group_array — SQLite builds the trope list in a single query. */
  tropes: string;
}

/**
 * The shared SELECT for book cards. Title, cover, series and trope names take the local version (JOIN
 * by language) and fall back to the original (COALESCE). Tropes and realm come from subqueries,
 * so a list of 91 books is one query, not 91 extra ones (the N+1 problem).
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
     SELECT t.slug, COALESCE(tt.name, t.name) AS name FROM book_tropes x JOIN tropes t ON t.slug = x.trope
       LEFT JOIN trope_texts tt ON tt.trope = t.slug AND tt.lang = :lang
      WHERE x.book = b.slug ORDER BY x.position)) AS tropes
FROM books b
JOIN authors a          ON a.slug = b.author
LEFT JOIN series s      ON s.slug = b.series
LEFT JOIN book_titles bt  ON bt.book = b.slug AND bt.lang = :lang
LEFT JOIN book_covers bc  ON bc.book = b.slug AND bc.lang = :lang
LEFT JOIN series_names sn ON sn.series = s.slug AND sn.lang = :lang
`;

/**
 * The catalogue over the SQLite database. The public methods are the same as in the in-memory version
 * from stages 2–10, so api.ts, seo.ts and the whole Angular app did not notice the change.
 */
export class Catalog {
  private readonly covers: NonNullable<CatalogOptions['covers']>;

  constructor(
    private readonly db: DatabaseSync,
    options: CatalogOptions = {},
  ) {
    this.covers = options.covers ?? 'openlibrary';
  }

  /** The current slug for a book's old address, or undefined. */
  currentBookSlug(oldSlug: string): string | undefined {
    const row = this.db.prepare('SELECT book FROM old_slugs WHERE old_slug = ?').get(oldSlug) as
      | { book: string }
      | undefined;
    return row?.book;
  }

  /** Filtered book list, sorted by title in the given language — the order is stable. */
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
    // Sorted in JS: SQLite without the ICU extension does not know Polish order (Ł after L, Ś after S).
    return books.sort((x, y) => x.title.localeCompare(y.title, lang));
  }

  getBook(slug: string, lang: Lang = 'pl'): BookDetail | undefined {
    const row = this.db
      .prepare(
        `${summarySql(`b.isbn, b.pages,
          COALESCE((SELECT description FROM book_descriptions WHERE book = b.slug AND lang = :lang), b.description)
            AS description,`)} WHERE b.slug = :slug`,
      )
      .get({ lang, slug }) as (SummaryRow & { isbn: string; pages: number | null; description: string }) | undefined;
    if (!row) return undefined;

    const warnings = this.db
      .prepare(
        `SELECT COALESCE(wt.translation, cw.text) AS text FROM content_warnings cw
           LEFT JOIN warning_texts wt ON wt.text = cw.text AND wt.lang = :lang
          WHERE cw.book = :slug ORDER BY cw.position`,
      )
      .all({ lang, slug }) as { text: string }[];
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
      similar: this.similarBooks(slug, row.series_slug, row.spice, lang),
    };
  }

  /**
   * "Kindred books": the most shared tropes, ties broken by closer spice.
   * Volumes of the same series are skipped — the book page lists those separately.
   */
  private similarBooks(slug: string, series: string | null, spice: number, lang: Lang, limit = 4): BookSummary[] {
    const rows = this.db
      .prepare(
        `SELECT x.book AS slug FROM book_tropes x JOIN books b ON b.slug = x.book
          WHERE x.trope IN (SELECT trope FROM book_tropes WHERE book = :slug)
            AND x.book <> :slug
            AND (:series IS NULL OR b.series IS NOT :series)
          GROUP BY x.book
          ORDER BY COUNT(*) DESC, ABS(b.spice - :spice), x.book
          LIMIT :limit`,
      )
      .all({ slug, series, spice, limit }) as { slug: string }[];
    return rows.length ? this.listBooks({ slugs: rows.map((r) => r.slug) }, lang) : [];
  }

  getAuthor(slug: string, lang: Lang = 'pl'): AuthorDetail | undefined {
    const a = this.db
      .prepare(
        `SELECT a.slug, a.name, COALESCE(ab.bio, a.bio) AS bio FROM authors a
           LEFT JOIN author_bios ab ON ab.author = a.slug AND ab.lang = :lang
          WHERE a.slug = :slug`,
      )
      .get({ lang, slug }) as
      | { slug: string; name: string; bio: string }
      | undefined;
    if (!a) return undefined;
    return { ...a, books: this.listBooks({ author: slug }, lang) };
  }

  listTropes(lang: Lang = 'pl'): Trope[] {
    return (
      this.db
        .prepare(
          `SELECT t.slug, COALESCE(tt.name, t.name) AS name, t.realm,
                  COALESCE(tt.description, t.description) AS description,
                  (SELECT COUNT(*) FROM book_tropes x WHERE x.trope = t.slug) AS bookCount
             FROM tropes t LEFT JOIN trope_texts tt ON tt.trope = t.slug AND tt.lang = :lang
            ORDER BY t.position`,
        )
        .all({ lang }) as unknown as Trope[]
    ).map((t) => ({ ...t }));
  }

  getTrope(slug: string, lang: Lang = 'pl'): TropeDetail | undefined {
    const t = this.listTropes(lang).find((x) => x.slug === slug);
    if (!t) return undefined;
    return { ...t, books: this.listBooks({ tropes: [slug] }, lang) };
  }

  /** Releases from the given day (inclusive), nearest first. */
  listReleases(fromDay: string, lang: Lang = 'pl'): Release[] {
    return (
      this.db
        .prepare(
          `SELECT r.slug, r.title, r.author, r.date, r.precision, COALESCE(rn.note, r.note) AS note FROM releases r
             LEFT JOIN release_notes rn ON rn.release = r.slug AND rn.lang = :lang
            WHERE r.date >= :fromDay ORDER BY r.date, r.title`,
        )
        .all({ fromDay, lang }) as unknown as Release[]
    ).map((r) => ({ ...r }));
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

/** % and _ are wildcards in LIKE — in user text they must mean themselves. */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}
