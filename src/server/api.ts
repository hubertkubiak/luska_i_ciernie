import { Router } from 'express';
import type { ApiError } from '../shared/models';
import { Catalog } from './catalog';

/**
 * REST API katalogu. Montowane w server.ts pod /api, PRZED Angularem —
 * kolejność middleware w Express decyduje, kto pierwszy obsłuży żądanie.
 */
export function apiRouter(catalog = new Catalog()): Router {
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
  const delay = Number(process.env['API_DELAY_MS'] ?? 0);
  if (delay > 0) {
    router.use((_req, _res, next) => void setTimeout(next, delay));
  }

  router.get('/books', (req, res) => {
    res.json(
      catalog.listBooks({
        trope: stringParam(req.query['trope']),
        author: stringParam(req.query['author']),
      }),
    );
  });

  router.get('/books/:slug', (req, res) => {
    const book = catalog.getBook(req.params.slug);
    if (book) res.json(book);
    else notFound(res, 'Książka nie istnieje');
  });

  router.get('/authors/:slug', (req, res) => {
    const author = catalog.getAuthor(req.params.slug);
    if (author) res.json(author);
    else notFound(res, 'Autor nie istnieje');
  });

  router.get('/tropes', (_req, res) => {
    res.json(catalog.listTropes());
  });

  router.get('/tropes/:slug', (req, res) => {
    const trope = catalog.getTrope(req.params.slug);
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

/** ?trope=a&trope=b daje tablicę — na razie bierzemy tylko pojedyncze wartości. */
function stringParam(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
