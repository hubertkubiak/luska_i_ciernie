import { Router, type Request } from 'express';
import { LANG_PREFIX, LANGS, type Lang, type Release } from '../shared/models';
import { releasesFrom } from './api';
import type { Catalog } from './catalog';

/**
 * /robots.txt i /sitemap.xml — generowane przez Express, przed Angularem (server.ts).
 * Sitemapa wymienia każdą indeksowalną stronę we wszystkich językach, z odnośnikami hreflang,
 * więc wyszukiwarka wie, że /ksiazka/x i /en/ksiazka/x to ta sama książka w dwóch wersjach.
 */
export function seoRouter(catalog: Catalog): Router {
  const router = Router();

  router.get('/robots.txt', (req, res) => {
    const disallow = ['/api/', ...LANGS.map((l) => `${LANG_PREFIX[l]}/moja-polka`)];
    res.type('text/plain').send(
      ['User-agent: *', ...disallow.map((d) => `Disallow: ${d}`), '', `Sitemap: ${origin(req)}/sitemap.xml`, ''].join('\n'),
    );
  });

  // RSS premier — czytniki kanałów i agregatory pobierają go cyklicznie, więc warto go cache'ować.
  router.get(LANGS.map((l) => `${LANG_PREFIX[l]}/rss/premiery`), (req, res) => {
    const lang = LANGS.find((l) => LANG_PREFIX[l] && req.path.startsWith(LANG_PREFIX[l])) ?? LANGS[0];
    res.set('Cache-Control', 'public, max-age=3600');
    res.type('application/rss+xml').send(rssXml(catalog.listReleases(releasesFrom()), origin(req), lang));
  });

  router.get('/sitemap.xml', (req, res) => {
    res.type('application/xml').send(sitemapXml(sitemapPaths(catalog), origin(req)));
  });

  return router;
}

/** Ścieżki bez prefiksu języka. Wyszukiwarkę z filtrami pomijamy — kombinacji jest nieskończenie wiele. */
export function sitemapPaths(catalog: Catalog): string[] {
  const books = catalog.listBooks();
  const authors = [...new Set(books.map((b) => b.author.slug))];
  return [
    '/',
    '/tropy',
    '/szukaj',
    ...catalog.listTropes().map((t) => `/tropy/${t.slug}`),
    ...books.map((b) => `/ksiazka/${b.slug}`),
    ...authors.map((a) => `/autor/${a}`),
  ];
}

export function sitemapXml(paths: string[], origin: string): string {
  const url = (lang: Lang, path: string) => escapeXml(origin + LANG_PREFIX[lang] + path);
  const entries = paths.flatMap((path) =>
    LANGS.map((lang) =>
      [
        '  <url>',
        `    <loc>${url(lang, path)}</loc>`,
        ...LANGS.map((alt) => `    <xhtml:link rel="alternate" hreflang="${alt}" href="${url(alt, path)}"/>`),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${url(LANGS[0], path)}"/>`,
        '  </url>',
      ].join('\n'),
    ),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}

/**
 * Publiczny adres serwisu. Na produkcji MUSI być ustawiony (PUBLIC_ORIGIN=https://…): sitemapę
 * zapisują wyszukiwarki, więc nie budujemy jej z nagłówka Host, który klient może podrobić.
 * Lokalnie (localhost) bierzemy adres z żądania, żeby dev działał bez konfiguracji.
 */
function origin(req: Request): string {
  const configured = process.env['PUBLIC_ORIGIN'];
  if (configured) return configured.replace(/\/$/, '');
  return req.hostname === 'localhost' ? `${req.protocol}://${req.get('host')}` : 'http://localhost';
}

/** RSS 2.0. Wszystko, co pochodzi z danych, przechodzi przez escapeXml — tytuł z „<” nie zepsuje kanału. */
export function rssXml(releases: Release[], origin: string, lang: Lang): string {
  const page = `${origin}${LANG_PREFIX[lang]}/premiery`;
  const title = lang === 'pl' ? 'Łuska i Ciernie — nadchodzące premiery' : 'Łuska i Ciernie — upcoming releases';
  const items = releases.map((r) =>
    [
      '    <item>',
      `      <title>${escapeXml(`${r.title} — ${r.author}`)}</title>`,
      `      <link>${escapeXml(`${page}#${r.slug}`)}</link>`,
      `      <guid isPermaLink="false">premiera-${escapeXml(r.slug)}</guid>`,
      // pubDate = dzień premiery (RFC 822, jak wymaga RSS 2.0).
      `      <pubDate>${new Date(`${r.date}T00:00:00Z`).toUTCString()}</pubDate>`,
      ...(r.note ? [`      <description>${escapeXml(r.note)}</description>`] : []),
      '    </item>',
    ].join('\n'),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(page)}</link>`,
    `    <description>${escapeXml(title)}</description>`,
    `    <language>${lang}</language>`,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
