import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join, resolve } from 'node:path';
import type { RequestContext } from './shared/models';
import { apiRouter } from './server/api';
import { openAccounts } from './server/auth/accounts';
import {
  authRouter,
  currentUser,
  localized,
  meHandler,
  redirectIfLoggedIn,
  requireUser,
  sessionMiddleware,
} from './server/auth/auth-router';
import { Catalog } from './server/catalog';
import { openDatabase } from './server/db/database';
import { seoRouter } from './server/seo';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();

/**
 * Katalog nad plikiem SQLite (npm run db:seed). Jedna instancja dla API i sitemapy. Ścieżka
 * względem katalogu roboczego — także podczas `ng build`, gdy prerender woła nasze API.
 */
const catalog = loadCatalog();

function loadCatalog(): Catalog {
  try {
    return new Catalog(openDatabase(resolve(process.env['DB_PATH'] ?? 'data/luska.db')), {
      covers: process.env['COVER_SOURCE'] === 'none' ? 'none' : 'openlibrary',
    });
  } catch (e) {
    // Bez tego Node wypisałby przed komunikatem całą zminifikowaną linię bundla.
    console.error((e as Error).message);
    process.exit(1);
  }
}
/** Konta i sesje — osobny, zapisywalny plik (katalog jest tylko do odczytu). */
const accounts = openAccounts(resolve(process.env['USERS_DB_PATH'] ?? 'data/users.db'));
const session = sessionMiddleware(accounts);

const angularApp = new AngularNodeAppEngine();

/** Kim jestem — przed routerem katalogu, bo ten odpowiada 404 na każdy nieznany adres /api/…. */
app.get('/api/me', session, meHandler);

/**
 * Własne REST API katalogu (src/server/api.ts). Musi być przed Angularem,
 * inaczej `angularApp.handle()` próbowałby wyrenderować /api/... jako stronę.
 */
app.use('/api', apiRouter(catalog));

/** /robots.txt i /sitemap.xml (src/server/seo.ts) — też przed Angularem i plikami statycznymi. */
app.use(seoRouter(catalog));

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Od tego miejsca znamy zalogowaną osobę (ciasteczko → sesja). Pliki statyczne są wyżej,
 * więc pobranie obrazka czy skryptu nie odpytuje bazy sesji.
 */
app.use(session);

/** Formularze logowania, rejestracji i wylogowania (POST, działają bez JS). */
app.use(localized('/auth'), authRouter(accounts));

/** Prywatne strony: 302 na logowanie, zanim Angular w ogóle zobaczy żądanie. */
app.use(localized('/moja-polka'), requireUser('/moja-polka'));
app.use(localized('/logowanie'), redirectIfLoggedIn('/logowanie'));
app.use(localized('/rejestracja'), redirectIfLoggedIn('/rejestracja'));

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  const user = currentUser(res);
  // HTML z imieniem zalogowanej osoby nie może trafić do wspólnego cache (CDN, proxy) —
  // inaczej kolejna osoba zobaczyłaby cudzy nagłówek. Strona zależy od ciasteczka: Vary.
  res.vary('Cookie');
  if (user) res.set('Cache-Control', 'private, no-store');

  angularApp
    // Drugi argument trafia do Angulara jako REQUEST_CONTEXT.
    .handle(req, { user } satisfies RequestContext)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
