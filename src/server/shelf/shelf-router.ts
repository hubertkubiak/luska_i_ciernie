import express, { Router, type Request, type Response } from 'express';
import type { ShelfItem } from '../../shared/models';
import { lang } from '../api';
import { currentUser } from '../auth/auth-router';
import { isSameOrigin, safeNext } from '../auth/http';
import type { Catalog } from '../catalog';
import { parseEntry, type ShelfStore, type StoredItem } from './shelf-store';

/**
 * JSON API półki: GET/PUT/DELETE /api/shelf[/:slug]. Tylko dla zalogowanych (ciasteczko sesji).
 *
 * Ochrona przed CSRF, bo autoryzacja jedzie w ciasteczku, które przeglądarka dołącza sama:
 * 1. SameSite=Lax — przeglądarka nie dołączy ciasteczka do PUT/DELETE z cudzej strony,
 * 2. Origin — zapis z obcego adresu dostaje 403,
 * 3. wymagany Content-Type: application/json — zwykły formularz HTML z cudzej strony takiego
 *    nie wyśle, a fetch z innej domeny musiałby przejść zapytanie wstępne CORS, którego nie wpuszczamy.
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
    if (full) res.json(full);
    else res.status(404).json({ error: 'Tej książki nie ma na półce' });
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
 * POST /polka (+ /en/polka) — ta sama półka jako zwykły formularz: działa bez JavaScriptu
 * i przy kliknięciu, zanim aplikacja się zhydratuje (przeglądarka wysyła wtedy formularz sama).
 * Pola: slug, status albo remove=1, next (dokąd wrócić).
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
        // Formularz zmienia tylko status — ocena i notatka (jeśli były) zostają.
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

/** Dołącza karty książek z katalogu (w języku żądania). Książek usuniętych z katalogu nie pokazujemy. */
function withBooks(items: StoredItem[], catalog: Catalog, req: Request): ShelfItem[] {
  const books = new Map(catalog.listBooks({ slugs: items.map((i) => i.slug) }, lang(req)).map((b) => [b.slug, b]));
  return items.flatMap((item) => {
    const book = books.get(item.slug);
    return book ? [{ ...item, book }] : [];
  });
}
