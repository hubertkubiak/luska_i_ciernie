import { Catalog } from './catalog';
import { memoryDatabase } from './db/testing';
import { sitemapPaths, sitemapXml } from './seo';

describe('sitemap', () => {
  const catalog = new Catalog(memoryDatabase());

  it('lists every book, author and trope once', () => {
    const paths = sitemapPaths(catalog);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toContain('/ksiazka/fourth-wing');
    expect(paths).toContain('/autor/sarah-j-maas');
    expect(paths).toContain('/tropy/slow-burn');
    expect(paths.filter((p) => p.startsWith('/ksiazka/')).length).toBe(catalog.listBooks().length);
  });

  it('has an entry per language with hreflang alternates', () => {
    const xml = sitemapXml(['/tropy'], 'https://example.com');
    expect(xml).toContain('<loc>https://example.com/tropy</loc>');
    expect(xml).toContain('<loc>https://example.com/en/tropy</loc>');
    expect(xml).toContain('hreflang="en" href="https://example.com/en/tropy"');
    expect(xml).toContain('hreflang="x-default" href="https://example.com/tropy"');
    expect(xml.match(/<url>/g)?.length).toBe(2);
  });

  it('escapes XML special characters', () => {
    expect(sitemapXml(['/szukaj?a=1&b=2'], 'https://x.pl')).toContain('/szukaj?a=1&amp;b=2');
  });
});
