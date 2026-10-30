import { Catalog } from './catalog';
import { memoryDatabase, repoSeed } from './db/testing';
import { releaseDate } from './db/database';

describe('Catalog', () => {
  const catalog = new Catalog(memoryDatabase());

  it('loads the seed and resolves relations', () => {
    const book = catalog.getBook('fourth-wing');
    expect(book?.author.name).toBe('Rebecca Yarros');
    expect(book?.series?.status).toBe('ongoing');
    expect(book?.realm).toBe('turnie');
    expect(book?.seriesBooks.map((b) => b.index)).toEqual([1, 2, 3]);
    expect(catalog.getBook('a-court-of-silver-flames')?.series?.index).toBe(5);
  });

  it('suggests similar books by shared tropes, outside the same series', () => {
    const book = catalog.getBook('fourth-wing')!;
    const own = book.tropes.map((t) => t.slug);
    const shared = (b: { tropes: { slug: string }[] }) => b.tropes.filter((t) => own.includes(t.slug)).length;

    expect(book.similar.length).toBeGreaterThan(0);
    expect(book.similar.length).toBeLessThanOrEqual(4);
    expect(book.similar.map((b) => b.slug)).not.toContain('fourth-wing');
    expect(book.similar.every((b) => b.series?.slug !== book.series?.slug)).toBe(true);
    // Most similar first: the number of shared tropes does not grow down the list.
    const counts = book.similar.map(shared);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    expect(counts.every((n) => n > 0)).toBe(true);
  });

  it('returns undefined for unknown slugs', () => {
    expect(catalog.getBook('nie-ma-takiej')).toBeUndefined();
    expect(catalog.getAuthor('nie-ma-takiego')).toBeUndefined();
  });

  it('filters books by trope and counts them on the trope', () => {
    const fae = catalog.listBooks({ tropes: ['dwory-fae'] });
    expect(fae.length).toBeGreaterThan(0);
    expect(fae.every((b) => b.tropes.some((t) => t.slug === 'dwory-fae'))).toBe(true);
    expect(catalog.getTrope('dwory-fae')?.bookCount).toBe(fae.length);
  });

  it('combines tropes with AND by default and with OR on request', () => {
    const both = catalog.listBooks({ tropes: ['jezdzcy-smokow', 'enemies-to-lovers'] });
    const either = catalog.listBooks({ tropes: ['jezdzcy-smokow', 'enemies-to-lovers'], match: 'any' });
    expect(both.length).toBeGreaterThan(0);
    expect(either.length).toBeGreaterThan(both.length);
    for (const b of both) {
      expect(b.tropes.map((t) => t.slug)).toEqual(expect.arrayContaining(['jezdzcy-smokow', 'enemies-to-lovers']));
    }
  });

  it('filters by max spice and series status', () => {
    expect(catalog.listBooks({ maxSpice: 1 }).every((b) => b.spice <= 1)).toBe(true);
    expect(catalog.listBooks({ status: 'standalone' }).every((b) => !b.series)).toBe(true);
    expect(catalog.listBooks({ status: 'ongoing' }).every((b) => b.series?.status === 'ongoing')).toBe(true);
  });

  it('searches title, author and series ignoring case', () => {
    expect(catalog.listBooks({ q: 'FOURTH' }).map((b) => b.slug)).toContain('fourth-wing');
    expect(catalog.listBooks({ q: 'yarros' }).map((b) => b.slug)).toContain('iron-flame');
    expect(catalog.listBooks({ q: 'nie ma takiej frazy' })).toEqual([]);
  });

  it('sorts results by the localized title', () => {
    for (const lang of ['pl', 'en'] as const) {
      const titles = catalog.listBooks({}, lang).map((b) => b.title);
      expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, lang)));
    }
  });

  it('returns titles of the local edition for each language', () => {
    expect(catalog.getBook('the-cruel-prince', 'pl')?.title).toBe('Okrutny książę');
    expect(catalog.getBook('the-cruel-prince', 'en')?.title).toBe('The Cruel Prince');
    expect(catalog.getBook('the-cruel-prince', 'pl')?.originalTitle).toBe('The Cruel Prince');
    expect(catalog.getBook('the-cruel-prince', 'en')?.originalTitle).toBeUndefined();
    // No local title = published under the original (or not published) → the original.
    expect(catalog.getBook('lightlark', 'pl')?.title).toBe('Lightlark');
  });

  it('localizes series names and series book lists', () => {
    const book = catalog.getBook('a-court-of-mist-and-fury', 'pl')!;
    expect(book.series?.name).toBe('Dwór cierni i róż');
    expect(book.seriesBooks.map((b) => b.title)).toContain('Dwór szronu i blasku gwiazd');
  });

  it('finds a book by any of its titles', () => {
    for (const q of ['okrutny', 'cruel prince']) {
      expect(catalog.listBooks({ q }, 'pl').map((b) => b.slug)).toContain('the-cruel-prince');
    }
  });

  it('can switch covers off (generated covers in the UI)', () => {
    const noCovers = new Catalog(memoryDatabase(), { covers: 'none' });
    expect(noCovers.getBook('fourth-wing')?.coverUrl).toBeNull();
    expect(catalog.getBook('fourth-wing')?.coverUrl).toMatch(/^https:\/\/covers\.openlibrary\.org\//);
  });

  it('uses the local edition cover when there is one', () => {
    const pl = catalog.getBook('throne-of-glass', 'pl')!.coverUrl;
    const en = catalog.getBook('throne-of-glass', 'en')!.coverUrl;
    expect(pl).not.toBe(en);
  });

  it('returns requested slugs in the requested order', () => {
    const slugs = ['one-dark-window', 'fourth-wing'];
    expect(catalog.listBooks({ slugs }).map((b) => b.slug)).toEqual(slugs);
  });

  it('maps old slugs to the current one', () => {
    expect(catalog.currentBookSlug('okrutny-ksiaze')).toBe('the-cruel-prince');
    expect(catalog.currentBookSlug('the-cruel-prince')).toBeUndefined();
  });

  it('finds phrases with LIKE wildcards literally', () => {
    expect(catalog.listBooks({ q: '%' })).toEqual([]);
    expect(catalog.listBooks({ q: '_' })).toEqual([]);
  });

});

// Rules that Catalog.validate() used to check by hand are now enforced by the database schema.
describe('database constraints', () => {
  const broken = (mutate: (seed: ReturnType<typeof repoSeed>) => void) => {
    const seed = repoSeed();
    mutate(seed);
    return () => memoryDatabase(seed);
  };

  it('rejects an unknown trope (foreign key)', () => {
    expect(broken((s) => (s.books[0].tropes = ['brak']))).toThrow(/book_tropes.*fourth-wing.*„tropes”/);
  });

  it('rejects an unknown author (foreign key)', () => {
    expect(broken((s) => (s.books[0].author = 'nikt'))).toThrow(/books.*"nikt".*„authors”/);
  });

  it('rejects spice out of range (CHECK)', () => {
    expect(broken((s) => (s.books[0].spice = 9))).toThrow(/CHECK constraint/);
  });

  it('rejects an old slug that is a current book (trigger)', () => {
    expect(broken((s) => (s.books[0].oldSlugs = ['iron-flame']))).toThrow(/koliduje z istniejącą książką/);
  });

  it('rejects a book without tropes', () => {
    expect(broken((s) => (s.books[0].tropes = []))).toThrow(/brak tropów/);
  });
});


describe('releaseDate', () => {
  it('keeps a known day and maps a month or quarter to its last day', () => {
    expect(releaseDate('2026-11-11')).toEqual({ date: '2026-11-11', precision: 'day' });
    expect(releaseDate('2026-11')).toEqual({ date: '2026-11-30', precision: 'month' });
    expect(releaseDate('2028-02')).toEqual({ date: '2028-02-29', precision: 'month' });
    expect(releaseDate('2026-Q4')).toEqual({ date: '2026-12-31', precision: 'quarter' });
    expect(releaseDate('2027-Q1')).toEqual({ date: '2027-03-31', precision: 'quarter' });
  });

  it('rejects anything else', () => {
    expect(() => releaseDate('koniec 2026')).toThrow(/RRRR-MM-DD/);
  });
});

describe('translations', () => {
  const catalog = new Catalog(memoryDatabase());

  it('serves English texts on /en/ and Polish ones by default', () => {
    const en = catalog.getBook('fourth-wing', 'en')!;
    expect(en.description).toMatch(/^A fragile girl/);
    expect(en.contentWarnings).toEqual(['violence', 'death', 'sex scenes']);
    expect(en.tropes.map((t) => t.name)).toContain('Dragon riders');
    expect(catalog.getBook('fourth-wing')!.contentWarnings).toEqual(['przemoc', 'śmierć', 'sceny erotyczne']);

    expect(catalog.getAuthor('rebecca-yarros', 'en')!.bio).toMatch(/^An American author/);
    expect(catalog.listTropes('en').find((t) => t.slug === 'slow-burn')!.name).toBe('Slow burn');
    expect(catalog.listTropes().find((t) => t.slug === 'slow-burn')!.name).toBe('Powolny żar');
    expect(catalog.listReleases('2026-01-01', 'en')[0].note).toMatch(/A Court of Thorns and Roses/);
  });

  it('has an English version of every text in the seed', () => {
    const englishWarnings = new Set(Object.values(repoSeed().warnings!).map((t) => t['en']));
    for (const { slug } of catalog.listBooks()) {
      const en = catalog.getBook(slug, 'en')!;
      expect(en.description, slug).not.toBe(catalog.getBook(slug)!.description);
      for (const w of en.contentWarnings) expect(englishWarnings.has(w), `${slug}: ${w}`).toBe(true);
      expect(catalog.getAuthor(en.author.slug, 'en')!.bio, en.author.slug).not.toBe(catalog.getAuthor(en.author.slug)!.bio);
    }
    const plTropes = catalog.listTropes();
    catalog.listTropes('en').forEach((t, i) => expect(t.description, t.slug).not.toBe(plTropes[i].description));
  });

  it('falls back to Polish when a translation is missing', () => {
    const seed = repoSeed();
    delete seed.books.find((b) => b.slug === 'fourth-wing')!.descriptions;
    const partial = new Catalog(memoryDatabase(seed));
    expect(partial.getBook('fourth-wing', 'en')!.description).toMatch(/^Krucha dziewczyna/);
  });
});
