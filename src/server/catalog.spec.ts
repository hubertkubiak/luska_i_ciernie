import { Catalog } from './catalog';

describe('Catalog', () => {
  const catalog = new Catalog();

  it('loads the seed and resolves relations', () => {
    const book = catalog.getBook('fourth-wing');
    expect(book?.author.name).toBe('Rebecca Yarros');
    expect(book?.series?.status).toBe('ongoing');
    expect(book?.realm).toBe('turnie');
    expect(book?.seriesBooks.map((b) => b.index)).toEqual([1, 2, 3]);
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

  it('sorts results by title', () => {
    const titles = catalog.listBooks().map((b) => b.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, 'pl')));
  });

  it('maps old slugs to the current one', () => {
    expect(catalog.currentBookSlug('okrutny-ksiaze')).toBe('the-cruel-prince');
    expect(catalog.currentBookSlug('the-cruel-prince')).toBeUndefined();
  });

  it('rejects a seed with a dangling trope reference', () => {
    const broken = [
      {
        slug: 'x',
        title: 'X',
        author: 'a',
        isbn: '',
        year: 2020,
        pages: 1,
        coverId: 1,
        spice: 0,
        tropes: ['brak'],
        contentWarnings: [],
        description: '',
      },
    ];
    expect(() => new Catalog(broken, [], [{ slug: 'a', name: 'A', bio: '' }], [])).toThrow(/nieznany trop/);
  });
});
