import { Router, type Request } from 'express';
import { LANGS, type ApiError, type BookQuery, type Lang, type SeriesFilter, type Spice } from '../shared/models';
import type { Catalog } from './catalog';

/**
 * The catalogue REST API. Mounted in server.ts under /api, BEFORE Angular —
 * the order of Express middleware decides who handles a request first.
 */
export function apiRouter(catalog: Catalog): Router {
  const router = Router();

  // Logs every request with who is asking: the browser or SSR (fetch from Node has the
  // User-Agent "node"). Lets you check in the terminal whether the transfer cache works —
  // after opening a book page there should be only the SSR entry.
  router.use((req, _res, next) => {
    const ua = req.get('user-agent') ?? '';
    const who = ua === 'node' || ua.startsWith('undici') ? 'SSR' : 'przeglądarka';
    console.log(`[api] ${req.method} ${req.originalUrl} ← ${who}`);
    next();
  });

  // An artificial delay (e.g. API_DELAY_MS=1500) — handy for seeing loading states
  // and comparing SSR with client-side rendering.
  // The response depends on the language → caches (browser, CDN) must tell versions apart by header.
  router.use((req, res, next) => {
    res.vary('Accept-Language');
    res.set('Content-Language', lang(req));
    next();
  });

  // The catalogue is public and rarely changes → browsers and CDNs may keep it for 5 minutes.
  // (The shelf and /api/me have their own routers with Cache-Control: private, no-store.)
  router.use((req, res, next) => {
    if (req.method === 'GET') res.set('Cache-Control', 'public, max-age=300');
    next();
  });

  const delay = Number(process.env['API_DELAY_MS'] ?? 0);
  if (delay > 0) {
    router.use((_req, _res, next) => void setTimeout(next, delay));
  }

  // GET /api/books?q=…&trope=a&trope=b&match=any&maxSpice=3&status=completed&author=…
  router.get('/books', (req, res) => {
    res.json(catalog.listBooks(bookQuery(req.query), lang(req)));
  });

  router.get('/books/:slug', (req, res) => {
    const book = catalog.getBook(req.params.slug, lang(req));
    if (book) {
      res.json(book);
      return;
    }
    // An old address → 301 to the current API resource. fetch (also the one in SSR) follows
    // the redirect by itself, so Angular gets the book's data under the new slug.
    const current = catalog.currentBookSlug(req.params.slug);
    if (current) res.redirect(301, `${req.baseUrl}/books/${current}`);
    else notFound(res, 'Książka nie istnieje');
  });

  router.get('/authors/:slug', (req, res) => {
    const author = catalog.getAuthor(req.params.slug, lang(req));
    if (author) res.json(author);
    else notFound(res, 'Autor nie istnieje');
  });

  // Releases from 30 days back (the latest "already in bookshops") to the furthest announcement.
  router.get('/releases', (req, res) => {
    res.json(catalog.listReleases(releasesFrom(), lang(req)));
  });

  router.get('/tropes', (req, res) => {
    res.json(catalog.listTropes(lang(req)));
  });

  router.get('/tropes/:slug', (req, res) => {
    const trope = catalog.getTrope(req.params.slug, lang(req));
    if (trope) res.json(trope);
    else notFound(res, 'Trop nie istnieje');
  });

  // Without this an unknown /api/... would "leak" through to Angular and get an HTML page
  // with status 200 — an HTTP client expecting JSON would get garbage.
  router.use((_req, res) => notFound(res, 'Nieznany endpoint API'));

  return router;
}

export function releasesFrom(now = new Date()): string {
  return new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
}

function notFound(res: import('express').Response, message: string): void {
  res.status(404).json({ error: message } satisfies ApiError);
}

const SERIES_FILTERS: SeriesFilter[] = ['ongoing', 'completed', 'standalone'];

/**
 * Query string → BookQuery. Unknown or invalid values are skipped (instead of 400) — it is a filter,
 * not a validated form; better to show broader results than an error page.
 */
function bookQuery(query: Record<string, unknown>): BookQuery {
  const spice = Number(stringParam(query['maxSpice']));
  const status = stringParam(query['status']) as SeriesFilter | undefined;
  return {
    q: stringParam(query['q']),
    tropes: listParam(query['trope']),
    match: query['match'] === 'any' ? 'any' : 'all',
    maxSpice: Number.isInteger(spice) && spice >= 0 && spice <= 5 ? (spice as Spice) : undefined,
    status: status && SERIES_FILTERS.includes(status) ? status : undefined,
    author: stringParam(query['author']),
    ...(query['slug'] !== undefined && { slugs: listParam(query['slug']) }),
  };
}

/**
 * Response language from the Accept-Language header. The Angular app sends its LOCALE_ID here
 * (interceptor in src/app/core/api-language.ts), so /en/ gets the original titles and / the Polish ones.
 */
export function lang(req: Request): Lang {
  return (req.acceptsLanguages(...LANGS) || 'pl') as Lang;
}

function stringParam(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

/** ?trope=a&trope=b → Express gives an array, ?trope=a → a string. Normalised to an array. */
function listParam(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.map(stringParam).filter((v): v is string => v !== undefined);
}
