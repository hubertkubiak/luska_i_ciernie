import { Router, type Request } from 'express';
import { LANGS, type Lang } from '../shared/models';
import { Catalog } from './catalog';

/** Prefiksy wersji językowych — te same co LANG_PREFIX w src/app/core/seo.ts i "subPath" w angular.json. */
const LANG_PREFIX: Record<Lang, string> = { pl: '', en: '/en' };

/**
 * /robots.txt i /sitemap.xml — generowane przez Express, przed Angularem (server.ts).
 * Sitemapa wymienia każdą indeksowalną stronę we wszystkich językach, z odnośnikami hreflang,
 * więc wyszukiwarka wie, że /ksiazka/x i /en/ksiazka/x to ta sama książka w dwóch wersjach.
 */
export function seoRouter(catalog = new Catalog()): Router {
  const router = Router();

  router.get('/robots.txt', (req, res) => {
    const disallow = ['/api/', ...LANGS.map((l) => `${LANG_PREFIX[l]}/moja-polka`)];
    res.type('text/plain').send(
      ['User-agent: *', ...disallow.map((d) => `Disallow: ${d}`), '', `Sitemap: ${origin(req)}/sitemap.xml`, ''].join('\n'),
    );
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

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
