import { Catalog } from './catalog';
import { memoryDatabase } from './db/testing';
import { rssXml, sitemapPaths, sitemapXml } from './seo';

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

describe('rss', () => {
  const release = { slug: 'a', title: 'Sól & <Przysięga>', author: 'M. K.', date: '2026-11-14', note: null };

  it('escapes data so a title cannot break the XML', () => {
    const xml = rssXml([release], 'https://x.pl', 'pl');
    expect(xml).toContain('<title>Sól &amp; &lt;Przysięga&gt; — M. K.</title>');
    expect(xml).toContain('<pubDate>Sat, 14 Nov 2026 00:00:00 GMT</pubDate>');
    expect(xml).toContain('<link>https://x.pl/premiery#a</link>');
  });

  it('points to the page of its language', () => {
    expect(rssXml([release], 'https://x.pl', 'en')).toContain('<link>https://x.pl/en/premiery</link>');
  });
});

describe('releases', () => {
  it('lists releases from the given day, nearest first', () => {
    const catalog = new Catalog(memoryDatabase());
    const dates = catalog.listReleases('2026-11-01').map((r) => r.date);
    expect(dates.length).toBeGreaterThan(0);
    expect(dates.every((d) => d >= '2026-11-01')).toBe(true);
    expect(dates).toEqual([...dates].sort());
  });
});

