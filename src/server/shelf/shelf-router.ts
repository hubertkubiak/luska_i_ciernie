import express, { Router, type Request, type Response } from 'express';
import type { ShelfItem } from '../../shared/models';
import { lang } from '../api';
import { currentUser } from '../auth/auth-router';
import { isSameOrigin, safeNext } from '../auth/http';
import type { Catalog } from '../catalog';
import { parseEntry, type ShelfStore, type StoredItem } from './shelf-store';

/**
 * Shelf JSON API: GET/PUT/DELETE /api/shelf[/:slug]. Signed-in users only (session cookie).
 *
 * CSRF protection, because authorisation travels in a cookie the browser attaches by itself:
 * 1. SameSite=Lax — the browser will not attach the cookie to a PUT/DELETE from a foreign site,
 * 2. Origin — a write from a foreign address gets 403,
 * 3. Content-Type: application/json is required — a plain HTML form on a foreign site cannot send it,
 *    and fetch from another domain would need a CORS preflight, which we do not allow.
 */
export function shelfApiRouter(shelf: ShelfStore, catalog: Catalog): Router {
  const router = Router();

  router.use((req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    if (!currentUser(res)) {
      res.status(401).json({ error: 'Zaloguj się, by korzystać z półki' });
      return;
    }
    if (req.method !== 'GET' && !isSameOrigin(req)) {
      res.status(403).json({ error: 'Żądanie z innej strony zostało odrzucone' });
      return;
    }
    if (req.method === 'PUT' && !req.is('application/json')) {
      res.status(415).json({ error: 'Oczekiwano application/json' });
      return;
    }
    next();
  });
  router.use(express.json({ limit: '8kb' }));

  router.get('/', (req, res) => {
    res.json(withBooks(shelf.list(userId(res)), catalog, req));
  });

  router.get('/:slug', (req, res) => {
    const item = shelf.get(userId(res), req.params['slug'] as string);
    const [full] = item ? withBooks([item], catalog, req) : [];
    // "Not on the shelf" is a normal state, not an error → 200 with null, not 404. It matters for SSR:
    // the HTTP transfer cache stores only successful responses, so a 404 from the server never reached
    // the HTML and the browser asked again after hydration (getting a red 404 in the console).
    res.json(full ?? null);
  });

  router.put('/:slug', (req, res) => {
    const slug = req.params['slug'] as string;
    if (!catalog.getBook(slug)) {
      res.status(404).json({ error: 'Nie ma takiej książki w katalogu' });
      return;
    }
    const entry = parseEntry(req.body);
    if ('error' in entry) {
      res.status(400).json(entry);
      return;
    }
    res.json(withBooks([shelf.save(userId(res), slug, entry)], catalog, req)[0]);
  });

  router.delete('/:slug', (req, res) => {
    shelf.remove(userId(res), req.params['slug'] as string);
    res.status(204).end();
  });

  return router;
}

/**
 * POST /polka (+ /en/polka) — the same shelf as a plain form: works without JavaScript
 * and for clicks before the app hydrates (the browser then submits the form itself).
 * Fields: slug, status or remove=1, next (where to return).
 */
export function shelfFormRouter(shelf: ShelfStore, catalog: Catalog): Router {
  const router = Router();
  router.use(express.urlencoded({ extended: false, limit: '4kb' }));

  router.post('/', (req, res) => {
    const prefix = req.baseUrl.slice(0, -'/polka'.length);
    const next = safeNext(req.body?.next);
    if (!isSameOrigin(req)) {
      res.status(403).type('text/plain').send('Żądanie z innej strony zostało odrzucone.');
      return;
    }
    const user = currentUser(res);
    if (!user) {
      res.redirect(303, `${prefix}/logowanie?${new URLSearchParams({ next })}`);
      return;
    }
    const slug = typeof req.body?.slug === 'string' ? req.body.slug : '';
    if (catalog.getBook(slug)) {
      if (req.body?.remove) {
        shelf.remove(user.id, slug);
      } else {
        // The form changes only the status — rating and note (if any) stay.
        const entry = parseEntry({ ...shelf.get(user.id, slug), status: req.body?.status });
        if (!('error' in entry)) shelf.save(user.id, slug, entry);
      }
    }
    res.redirect(303, prefix + next);
  });

  return router;
}

function userId(res: Response): number {
  return currentUser(res)!.id;
}

/** Attaches book cards from the catalogue (in the request language). Books removed from the catalogue are skipped. */
function withBooks(items: StoredItem[], catalog: Catalog, req: Request): ShelfItem[] {
  const books = new Map(catalog.listBooks({ slugs: items.map((i) => i.slug) }, lang(req)).map((b) => [b.slug, b]));
  return items.flatMap((item) => {
    const book = books.get(item.slug);
    return book ? [{ ...item, book }] : [];
  });
}
