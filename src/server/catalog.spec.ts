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
    const fae = catalog.listBooks({ trope: 'dwory-fae' });
    expect(fae.length).toBeGreaterThan(0);
    expect(fae.every((b) => b.tropes.some((t) => t.slug === 'dwory-fae'))).toBe(true);
    expect(catalog.getTrope('dwory-fae')?.bookCount).toBe(fae.length);
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
