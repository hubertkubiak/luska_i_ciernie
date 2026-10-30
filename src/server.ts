import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { join, resolve } from 'node:path';
import type { RequestContext } from './shared/models';
import { apiRouter } from './server/api';
import { openAccounts } from './server/auth/accounts';
import {
  authRouter,
  currentUser,
  publicUser,
  localized,
  meHandler,
  redirectIfLoggedIn,
  requireUser,
  sessionMiddleware,
} from './server/auth/auth-router';
import { Catalog } from './server/catalog';
import { openDatabase } from './server/db/database';
import { allowedHosts, healthz, isDemo, publicOrigin, securityHeaders, trustProxy, withPublicOrigin } from './server/production';
import { seoRouter } from './server/seo';
import { themeFromRequest, themeRouter, withTheme } from './server/theme';
import { ShelfStore } from './server/shelf/shelf-store';
import { shelfApiRouter, shelfFormRouter } from './server/shelf/shelf-router';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();

// Production behind a proxy (Render, Fly…): see src/server/production.ts for why this matters.
app.set('trust proxy', trustProxy());
app.disable('x-powered-by');

/**
 * Catalogue over the SQLite file (npm run db:seed). One instance for the API and the sitemap.
 * The path is relative to the working directory — also during `ng build`, when prerendering calls our API.
 */
const catalogDb = openCatalogDb();
const catalog = new Catalog(catalogDb, {
  covers: process.env['COVER_SOURCE'] === 'none' ? 'none' : 'openlibrary',
});

function openCatalogDb(): DatabaseSync {
  try {
    return openDatabase(resolve(process.env['DB_PATH'] ?? 'data/luska.db'));
  } catch (e) {
    // Without this Node would print the whole minified bundle line before the message.
    console.error((e as Error).message);
    process.exit(1);
  }
}
/** Accounts and sessions — a separate, writable file (the catalogue is read-only). */
const accounts = openAccounts(resolve(process.env['USERS_DB_PATH'] ?? 'data/users.db'));
const session = sessionMiddleware(accounts);
const shelf = new ShelfStore(accounts.db);
const demo = isDemo();
/** Set once we listen on a port ourselves; ng serve and prerendering leave it undefined. */
let apiOrigin: string | undefined;

const angularApp = new AngularNodeAppEngine({ allowedHosts: allowedHosts() });

/** Health check first: no headers, sessions or Angular — the platform polls it often. */
app.get('/healthz', healthz);

app.use(securityHeaders());

/** Who am I and the shelf — before the catalogue router, which answers 404 to any unknown /api/… path. */
app.get('/api/me', session, meHandler);
app.use('/api/shelf', session, shelfApiRouter(shelf, catalog));

/**
 * Our own catalogue REST API (src/server/api.ts). It must come before Angular,
 * otherwise `angularApp.handle()` would try to render /api/... as a page.
 */
app.use('/api', apiRouter(catalog));

/** /robots.txt, /sitemap.xml and RSS (src/server/seo.ts) — also before Angular and static files. */
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
 * From here on we know who is signed in (cookie → session). Static files are above,
 * so fetching an image or a script does not query the session database.
 */
app.use(session);

/** Sign-in, registration and sign-out forms (POST, work without JS). */
app.use(localized('/auth'), authRouter(accounts));
app.use(localized('/polka'), shelfFormRouter(shelf, catalog));
app.use(localized('/motyw'), themeRouter());

/** Private pages: 302 to sign-in before Angular ever sees the request. */
app.use(localized('/moja-polka'), requireUser('/moja-polka'));
app.use(localized('/logowanie'), redirectIfLoggedIn('/logowanie'));

/**
 * Per-route cache headers. /premiery is public and changes once a day (countdown in days),
 * so a CDN may keep it for an hour (s-maxage) and serve the stale copy for 10 more minutes
 * while refreshing it in the background (stale-while-revalidate). Browser — 5 minutes (max-age).
 * A signed-in person gets private, no-store below (the header shows their name).
 */
app.use(localized('/premiery'), (_req, res, next) => {
  if (!currentUser(res)) res.set('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=600');
  next();
});
app.use(localized('/rejestracja'), redirectIfLoggedIn('/rejestracja'));

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  const user = currentUser(res);
  // HTML with a signed-in person's name must never land in a shared cache (CDN, proxy) —
  // the next visitor would see someone else's header. The page depends on the cookie: Vary.
  res.vary('Cookie');
  if (user) res.set('Cache-Control', 'private, no-store');

  angularApp
    // The second argument reaches Angular as REQUEST_CONTEXT.
    .handle(req, { user: publicUser(user), demo, apiOrigin } satisfies RequestContext)
    // Theme from the cookie, also in prerendered and Client-mode HTML (src/server/theme.ts).
    .then((response) => (response ? withTheme(response, themeFromRequest(req)) : null))
    // Prerendered pages were built without knowing our address — fill it in (src/server/production.ts).
    // The Host header is safe here: Angular has already rejected hosts outside allowedHosts.
    .then((response) =>
      response ? withPublicOrigin(response, publicOrigin() ?? `${req.protocol}://${req.get('host')}`) : null,
    )
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  // SSR calls our API on the loopback interface instead of the public URL (src/app/core/internal-api.ts).
  apiOrigin = `http://127.0.0.1:${port}`;
  const server = app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });

  // Platforms stop containers with SIGTERM (Docker: SIGTERM, then SIGKILL after a grace period).
  // Finish in-flight requests, then close SQLite cleanly so the WAL is checkpointed into the file.
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      accounts.db.close();
      catalogDb.close();
      process.exit(0);
    });
    // Keep-alive connections could hold close() open forever.
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
