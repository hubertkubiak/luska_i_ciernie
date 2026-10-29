import { Router, type Request } from 'express';
import { LANGS, type ApiError, type BookQuery, type Lang, type SeriesFilter, type Spice } from '../shared/models';
import { Catalog } from './catalog';

/**
 * REST API katalogu. Montowane w server.ts pod /api, PRZED Angularem —
 * kolejność middleware w Express decyduje, kto pierwszy obsłuży żądanie.
 */
export function apiRouter(catalog = new Catalog(undefined, undefined, undefined, undefined, { covers: coverSource() })): Router {
  const router = Router();

  // Log każdego żądania z informacją, kto pyta: przeglądarka czy SSR (fetch z Node ma
  // User-Agent "node"). Pozwala sprawdzić w terminalu, czy transfer cache działa —
  // po wejściu na stronę książki powinien pojawić się tylko wpis od SSR.
  router.use((req, _res, next) => {
    const ua = req.get('user-agent') ?? '';
    const who = ua === 'node' || ua.startsWith('undici') ? 'SSR' : 'przeglądarka';
    console.log(`[api] ${req.method} ${req.originalUrl} ← ${who}`);
    next();
  });

  // Sztuczne opóźnienie (np. API_DELAY_MS=1500) — przyda się, żeby zobaczyć stany ładowania
  // i porównać SSR z renderowaniem po stronie klienta.
  // Odpowiedź zależy od języka → cache (przeglądarka, CDN) musi rozróżniać wersje po nagłówku.
  router.use((req, res, next) => {
    res.vary('Accept-Language');
    res.set('Content-Language', lang(req));
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
    // Stary adres → 301 na aktualny zasób API. fetch (także ten w SSR) podąża za
    // przekierowaniem sam, więc Angular dostanie dane książki pod nowym slugiem.
    const current = catalog.currentBookSlug(req.params.slug);
    if (current) res.redirect(301, `${req.baseUrl}/books/${current}`);
    else notFound(res, 'Książka nie istnieje');
  });

  router.get('/authors/:slug', (req, res) => {
    const author = catalog.getAuthor(req.params.slug, lang(req));
    if (author) res.json(author);
    else notFound(res, 'Autor nie istnieje');
  });

  router.get('/tropes', (_req, res) => {
    res.json(catalog.listTropes());
  });

  router.get('/tropes/:slug', (req, res) => {
    const trope = catalog.getTrope(req.params.slug, lang(req));
    if (trope) res.json(trope);
    else notFound(res, 'Trop nie istnieje');
  });

  // Bez tego nieznane /api/... „przeciekłoby” dalej do Angulara i dostało stronę HTML
  // ze statusem 200 — klient HTTP spodziewający się JSON-a dostałby śmieci.
  router.use((_req, res) => notFound(res, 'Nieznany endpoint API'));

  return router;
}

function notFound(res: import('express').Response, message: string): void {
  res.status(404).json({ error: message } satisfies ApiError);
}

const SERIES_FILTERS: SeriesFilter[] = ['ongoing', 'completed', 'standalone'];

/**
 * Query string → BookQuery. Nieznane lub błędne wartości pomijamy (zamiast 400) — to filtr,
 * a nie formularz z walidacją; lepiej pokazać szersze wyniki niż stronę błędu.
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
 * Język odpowiedzi z nagłówka Accept-Language. Aplikacja Angular wysyła tu swój LOCALE_ID
 * (interceptor w src/app/core/api-language.ts), więc /en/ dostaje tytuły oryginalne, a / polskie.
 */
function lang(req: Request): Lang {
  return (req.acceptsLanguages(...LANGS) || 'pl') as Lang;
}

/** COVER_SOURCE=none wyłącza zewnętrzne okładki (np. na produkcji, dopóki nie ma licencji). */
function coverSource(): 'openlibrary' | 'none' {
  return process.env['COVER_SOURCE'] === 'none' ? 'none' : 'openlibrary';
}

function stringParam(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

/** ?trope=a&trope=b → Express daje tablicę, ?trope=a → string. Normalizujemy do tablicy. */
function listParam(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.map(stringParam).filter((v): v is string => v !== undefined);
}
