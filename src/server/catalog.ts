import authorsSeed from '../../seed/authors.json';
import booksSeed from '../../seed/books.json';
import seriesSeed from '../../seed/series.json';
import tropesSeed from '../../seed/tropes.json';
import type {
  AuthorDetail,
  BookDetail,
  BookSummary,
  Realm,
  SeriesRef,
  Spice,
  Trope,
  TropeDetail,
} from '../shared/models';

// Kształt rekordów w seed/*.json. Relacje zapisane slugami, żeby plik dało się edytować ręcznie.
interface SeedBook {
  slug: string;
  /** Dawne adresy (np. z czasów, gdy katalog używał polskich tytułów) — odpowiadają 301. */
  oldSlugs?: string[];
  title: string;
  author: string;
  series?: string;
  seriesIndex?: number;
  isbn: string;
  year: number;
  pages: number;
  coverId: number;
  spice: number;
  tropes: string[];
  contentWarnings: string[];
  description: string;
}

interface SeedTrope {
  slug: string;
  name: string;
  realm: string;
  description: string;
}

interface SeedAuthor {
  slug: string;
  name: string;
  bio: string;
}

export interface BookFilter {
  trope?: string;
  author?: string;
}

/**
 * Katalog w pamięci, zbudowany raz przy starcie procesu.
 * W etapie 9 zastąpimy go SQLite — API (src/server/api.ts) zostanie bez zmian,
 * bo zależy tylko od tej publicznej powierzchni.
 */
export class Catalog {
  private readonly books = new Map<string, SeedBook>();
  private readonly tropes = new Map<string, SeedTrope>();
  private readonly authors = new Map<string, SeedAuthor>();
  private readonly series = new Map<string, SeriesRef>();
  /** stary slug → aktualny slug */
  private readonly redirects = new Map<string, string>();

  constructor(
    books: SeedBook[] = booksSeed,
    tropes: SeedTrope[] = tropesSeed,
    authors: SeedAuthor[] = authorsSeed,
    series: SeriesRef[] = seriesSeed as SeriesRef[],
  ) {
    for (const t of tropes) this.tropes.set(t.slug, t);
    for (const a of authors) this.authors.set(a.slug, a);
    for (const s of series) this.series.set(s.slug, s);
    for (const b of books) {
      this.books.set(b.slug, b);
      for (const old of b.oldSlugs ?? []) this.redirects.set(old, b.slug);
    }
    this.validate();
  }

  /** Aktualny slug dla dawnego adresu książki albo undefined. */
  currentBookSlug(oldSlug: string): string | undefined {
    return this.redirects.get(oldSlug);
  }

  listBooks(filter: BookFilter = {}): BookSummary[] {
    return [...this.books.values()]
      .filter((b) => !filter.trope || b.tropes.includes(filter.trope))
      .filter((b) => !filter.author || b.author === filter.author)
      .map((b) => this.toSummary(b));
  }

  getBook(slug: string): BookDetail | undefined {
    const b = this.books.get(slug);
    if (!b) return undefined;

    const seriesBooks = b.series
      ? [...this.books.values()]
          .filter((other) => other.series === b.series)
          .map((other) => ({ slug: other.slug, title: other.title, index: other.seriesIndex ?? 0 }))
          .sort((x, y) => x.index - y.index)
      : [];

    return {
      ...this.toSummary(b),
      isbn: b.isbn,
      pages: b.pages,
      description: b.description,
      contentWarnings: b.contentWarnings,
      // Kraina książki = kraina jej pierwszego (dominującego) tropu.
      realm: this.tropes.get(b.tropes[0])!.realm as Realm,
      seriesBooks,
    };
  }

  getAuthor(slug: string): AuthorDetail | undefined {
    const a = this.authors.get(slug);
    if (!a) return undefined;
    return { ...a, books: this.listBooks({ author: slug }) };
  }

  listTropes(): Trope[] {
    return [...this.tropes.values()].map((t) => this.toTrope(t));
  }

  getTrope(slug: string): TropeDetail | undefined {
    const t = this.tropes.get(slug);
    if (!t) return undefined;
    return { ...this.toTrope(t), books: this.listBooks({ trope: slug }) };
  }

  private toTrope(t: SeedTrope): Trope {
    const bookCount = [...this.books.values()].filter((b) => b.tropes.includes(t.slug)).length;
    return { ...t, realm: t.realm as Realm, bookCount };
  }

  private toSummary(b: SeedBook): BookSummary {
    const author = this.authors.get(b.author)!;
    const series = b.series ? this.series.get(b.series)! : undefined;
    return {
      slug: b.slug,
      title: b.title,
      year: b.year,
      spice: b.spice as Spice,
      coverUrl: `https://covers.openlibrary.org/b/id/${b.coverId}-M.jpg`,
      author: { slug: author.slug, name: author.name },
      tropes: b.tropes.map((slug) => {
        const t = this.tropes.get(slug)!;
        return { slug: t.slug, name: t.name };
      }),
      series: series && { ...series, index: b.seriesIndex ?? 1 },
    };
  }

  /** Błąd w ręcznie edytowanym seedzie ma wywrócić start serwera, a nie wyprodukować `undefined` w HTML. */
  private validate(): void {
    for (const b of this.books.values()) {
      if (!this.authors.has(b.author)) throw new Error(`[seed] ${b.slug}: nieznany autor "${b.author}"`);
      if (b.series && !this.series.has(b.series)) throw new Error(`[seed] ${b.slug}: nieznana seria "${b.series}"`);
      if (b.tropes.length === 0) throw new Error(`[seed] ${b.slug}: brak tropów`);
      for (const t of b.tropes) {
        if (!this.tropes.has(t)) throw new Error(`[seed] ${b.slug}: nieznany trop "${t}"`);
      }
      if (b.spice < 0 || b.spice > 5) throw new Error(`[seed] ${b.slug}: pikanteria poza zakresem 0–5`);
    }
    for (const [old, current] of this.redirects) {
      if (this.books.has(old)) throw new Error(`[seed] stary slug "${old}" (→ ${current}) koliduje z istniejącą książką`);
    }
  }
}
