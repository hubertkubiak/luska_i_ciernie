import authorsSeed from '../../seed/authors.json';
import booksSeed from '../../seed/books.json';
import seriesSeed from '../../seed/series.json';
import tropesSeed from '../../seed/tropes.json';
import type {
  AuthorDetail,
  BookDetail,
  BookQuery,
  BookSummary,
  Lang,
  Realm,
  SeriesFilter,
  SeriesRef,
  SeriesStatus,
  Spice,
  Trope,
  TropeDetail,
} from '../shared/models';

/**
 * Lokalne warianty dla języków innych niż angielski (oryginał). Brak klucza = wydanie pod tytułem
 * oryginału albo brak wydania w tym języku.
 */
type Localized<T> = Partial<Record<Exclude<Lang, 'en'>, T>>;

// Kształt rekordów w seed/*.json. Relacje zapisane slugami, żeby plik dało się edytować ręcznie.
interface SeedBook {
  slug: string;
  /** Dawne adresy (np. z czasów, gdy katalog używał polskich tytułów) — odpowiadają 301. */
  oldSlugs?: string[];
  /** Tytuł oryginału (wersja angielska serwisu). */
  title: string;
  /** Tytuły wydań lokalnych — dla pl z katalogu Biblioteki Narodowej (data.bn.org.pl). */
  titles?: Localized<string>;
  author: string;
  series?: string;
  seriesIndex?: number;
  isbn: string;
  year: number;
  pages?: number;
  /** Okładka wydania oryginalnego w Open Library… */
  coverId: number;
  /** …i wydań lokalnych, jeśli Open Library je ma. */
  covers?: Localized<number>;
  spice: number;
  tropes: string[];
  contentWarnings: string[];
  description: string;
}

interface SeedSeries {
  slug: string;
  name: string;
  names?: Localized<string>;
  status: SeriesStatus;
  plannedBooks?: number;
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

export interface CatalogOptions {
  /**
   * Skąd brać okładki. 'openlibrary' — obrazy z covers.openlibrary.org; 'none' — brak URL-i,
   * UI rysuje własne okładki. Okładki są chronione prawem autorskim — patrz docs/PRAWNE.md.
   */
  covers?: 'openlibrary' | 'none';
}

/**
 * Katalog w pamięci, zbudowany raz przy starcie procesu.
 * W etapie SQLite zastąpimy go bazą — API (src/server/api.ts) zostanie bez zmian,
 * bo zależy tylko od tej publicznej powierzchni.
 */
export class Catalog {
  private readonly books = new Map<string, SeedBook>();
  private readonly tropes = new Map<string, SeedTrope>();
  private readonly authors = new Map<string, SeedAuthor>();
  private readonly series = new Map<string, SeedSeries>();
  /** stary slug → aktualny slug */
  private readonly redirects = new Map<string, string>();
  private readonly covers: NonNullable<CatalogOptions['covers']>;

  constructor(
    books: SeedBook[] = booksSeed,
    tropes: SeedTrope[] = tropesSeed,
    authors: SeedAuthor[] = authorsSeed,
    series: SeedSeries[] = seriesSeed as SeedSeries[],
    options: CatalogOptions = {},
  ) {
    for (const t of tropes) this.tropes.set(t.slug, t);
    for (const a of authors) this.authors.set(a.slug, a);
    for (const s of series) this.series.set(s.slug, s);
    for (const b of books) {
      this.books.set(b.slug, b);
      for (const old of b.oldSlugs ?? []) this.redirects.set(old, b.slug);
    }
    this.covers = options.covers ?? 'openlibrary';
    this.validate();
  }

  /** Aktualny slug dla dawnego adresu książki albo undefined. */
  currentBookSlug(oldSlug: string): string | undefined {
    return this.redirects.get(oldSlug);
  }

  /** Lista książek po filtrach, posortowana po tytule w danym języku — kolejność jest stabilna. */
  listBooks(query: BookQuery = {}, lang: Lang = 'pl'): BookSummary[] {
    const needle = query.q ? fold(query.q) : '';
    const tropes = query.tropes ?? [];
    const has = (b: SeedBook, t: string) => b.tropes.includes(t);

    const found = [...this.books.values()]
      .filter((b) => !query.slugs || query.slugs.includes(b.slug))
      .filter((b) => !query.author || b.author === query.author)
      .filter((b) =>
        tropes.length === 0 || (query.match === 'any' ? tropes.some((t) => has(b, t)) : tropes.every((t) => has(b, t))),
      )
      .filter((b) => query.maxSpice === undefined || b.spice <= query.maxSpice)
      .filter((b) => !query.status || this.seriesFilterOf(b) === query.status)
      .filter((b) => !needle || this.searchText(b).includes(needle))
      .map((b) => this.toSummary(b, lang));

    if (query.slugs) {
      const order = query.slugs;
      return found.sort((x, y) => order.indexOf(x.slug) - order.indexOf(y.slug));
    }
    return found.sort((x, y) => x.title.localeCompare(y.title, lang));
  }

  getBook(slug: string, lang: Lang = 'pl'): BookDetail | undefined {
    const b = this.books.get(slug);
    if (!b) return undefined;

    const seriesBooks = b.series
      ? [...this.books.values()]
          .filter((other) => other.series === b.series)
          .map((other) => ({ slug: other.slug, title: localTitle(other, lang), index: other.seriesIndex ?? 0 }))
          .sort((x, y) => x.index - y.index)
      : [];

    const summary = this.toSummary(b, lang);
    return {
      ...summary,
      ...(summary.title !== b.title && { originalTitle: b.title }),
      isbn: b.isbn,
      ...(b.pages && { pages: b.pages }),
      description: b.description,
      contentWarnings: b.contentWarnings,
      seriesBooks,
    };
  }

  getAuthor(slug: string, lang: Lang = 'pl'): AuthorDetail | undefined {
    const a = this.authors.get(slug);
    if (!a) return undefined;
    return { ...a, books: this.listBooks({ author: slug }, lang) };
  }

  listTropes(): Trope[] {
    return [...this.tropes.values()].map((t) => this.toTrope(t));
  }

  getTrope(slug: string, lang: Lang = 'pl'): TropeDetail | undefined {
    const t = this.tropes.get(slug);
    if (!t) return undefined;
    return { ...this.toTrope(t), books: this.listBooks({ tropes: [slug] }, lang) };
  }

  private seriesFilterOf(b: SeedBook): SeriesFilter {
    return b.series ? this.series.get(b.series)!.status : 'standalone';
  }

  /** Szukamy po WSZYSTKICH wariantach tytułu: „Okrutny książę” i „The Cruel Prince” znajdą to samo. */
  private searchText(b: SeedBook): string {
    const s = b.series ? this.series.get(b.series)! : undefined;
    const parts = [b.title, ...Object.values(b.titles ?? {}), this.authors.get(b.author)!.name];
    if (s) parts.push(s.name, ...Object.values(s.names ?? {}));
    return fold(parts.join(' '));
  }

  private toTrope(t: SeedTrope): Trope {
    const bookCount = [...this.books.values()].filter((b) => b.tropes.includes(t.slug)).length;
    return { ...t, realm: t.realm as Realm, bookCount };
  }

  private toSummary(b: SeedBook, lang: Lang): BookSummary {
    const author = this.authors.get(b.author)!;
    const series = b.series ? this.series.get(b.series)! : undefined;
    return {
      slug: b.slug,
      title: localTitle(b, lang),
      year: b.year,
      spice: b.spice as Spice,
      coverUrl: this.coverUrl(b, lang),
      // Kraina książki = kraina jej pierwszego (dominującego) tropu.
      realm: this.tropes.get(b.tropes[0])!.realm as Realm,
      author: { slug: author.slug, name: author.name },
      tropes: b.tropes.map((slug) => {
        const t = this.tropes.get(slug)!;
        return { slug: t.slug, name: t.name };
      }),
      series: series && {
        slug: series.slug,
        name: (lang !== 'en' && series.names?.[lang]) || series.name,
        status: series.status,
        ...(series.plannedBooks && { plannedBooks: series.plannedBooks }),
        index: b.seriesIndex ?? 1,
      },
    };
  }

  private coverUrl(b: SeedBook, lang: Lang): string | null {
    if (this.covers === 'none') return null;
    const id = (lang !== 'en' && b.covers?.[lang]) || b.coverId;
    return `https://covers.openlibrary.org/b/id/${id}-M.jpg`;
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

function localTitle(b: SeedBook, lang: Lang): string {
  return (lang !== 'en' && b.titles?.[lang]) || b.title;
}

/** "Łuska Ćmy" → "luska cmy": małe litery, bez ogonków (ł nie rozkłada się w NFD, stąd osobno). */
function fold(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l').trim();
}
