import express, { Router, type Request, type RequestHandler, type Response } from 'express';
import { LANG_PREFIX, LANGS, type SessionUser } from '../../shared/models';
import { setCoversCookie } from '../covers';
import { LIMITS, SESSION_TTL_MS, normalizeEmail, type Account, type Accounts } from './accounts';
import { RateLimiter, SESSION_COOKIE, clearSessionCookie, isSameOrigin, readCookie, safeNext, setSessionCookie } from './http';

/** Paths with every language prefix: '/logowanie' → ['/logowanie', '/en/logowanie']. */
export const localized = (path: string) => LANGS.map((l) => LANG_PREFIX[l] + path);

/** Language prefix of the mount path: '/en/auth' → '/en', '/auth' → ''. */
const langPrefix = (req: Request, mount: string) => req.baseUrl.slice(0, req.baseUrl.length - mount.length);

/** The signed-in person of the current request (set by sessionMiddleware) — with the internal id. */
export const currentUser = (res: Response): Account | null => res.locals['user'] ?? null;

/** What the browser may see: without the internal id. */
export const publicUser = (account: Account | null): SessionUser | null =>
  account && { email: account.email, displayName: account.displayName };

/** Reads the session cookie and stores the person in res.locals — for Angular, guards and /api/me. */
export function sessionMiddleware(accounts: Accounts): RequestHandler {
  return (req, res, next) => {
    const token = readCookie(req, SESSION_COOKIE);
    res.locals['user'] = token ? accounts.userForSession(token) : null;
    // A cookie that no longer matches any session (expired, signed out on another device)
    // is cleared right away, so the browser stops sending it forever.
    if (token && !res.locals['user']) clearSessionCookie(req, res);
    next();
  };
}

/**
 * POST /auth/logowanie, /auth/rejestracja, /auth/wyloguj (+ /en/auth/…). The forms work
 * without JavaScript: the browser sends a POST and we answer with a 303 redirect to a page
 * (the Post/Redirect/Get pattern — reloading the page does not resubmit the form).
 */
export function authRouter(accounts: Accounts, options: { realCovers: boolean }): Router {
  const router = Router();
  const loginLimit = new RateLimiter(10, 15 * 60 * 1000);
  // By default 5 accounts per hour from one IP. The e2e test server may raise it
  // (REGISTER_LIMIT_PER_HOUR=1000), because the test suite creates new accounts on every run.
  const registerLimit = new RateLimiter(Number(process.env['REGISTER_LIMIT_PER_HOUR'] ?? 5), 60 * 60 * 1000);

  router.use(express.urlencoded({ extended: false, limit: '4kb' }));
  router.use((req, res, next) => {
    if (req.method === 'POST' && !isSameOrigin(req)) {
      res.status(403).type('text/plain').send('Żądanie z innej strony zostało odrzucone.');
      return;
    }
    next();
  });

  router.post('/logowanie', async (req, res) => {
    const prefix = langPrefix(req, '/auth');
    const email = field(req, 'email', LIMITS.email);
    const next = safeNext(req.body?.next);
    const back = (blad: string) =>
      res.redirect(303, `${prefix}/logowanie?${params({ blad, email, next: next === '/moja-polka' ? '' : next })}`);

    // The limit is per IP + e-mail pair: guessing one account's password is slow, and one person
    // behind a shared IP does not block everyone else.
    const key = `${req.ip}|${normalizeEmail(email)}`;
    if (!loginLimit.take(key)) return back('limit');

    const user = await accounts.login(email, field(req, 'password', LIMITS.password.max));
    if (!user) return back('dane');

    loginLimit.reset(key);
    startSession(req, res, accounts, user.id);
    // Consent given earlier (registration, another device) applies in this browser too.
    if (options.realCovers && accounts.hasCoversConsent(user.id)) setCoversCookie(req, res, true);
    res.redirect(303, prefix + next);
  });

  router.post('/rejestracja', async (req, res) => {
    const prefix = langPrefix(req, '/auth');
    const email = field(req, 'email', LIMITS.email);
    const displayName = field(req, 'displayName', LIMITS.displayName.max);
    const next = safeNext(req.body?.next);
    const back = (blad: string) =>
      res.redirect(
        303,
        `${prefix}/rejestracja?${params({ blad, email, displayName, next: next === '/moja-polka' ? '' : next })}`,
      );

    if (!registerLimit.take(req.ip ?? '')) return back('limit');
    const result = await accounts.register({
      email,
      displayName,
      // No trimming of length: a too-long password must fail, not be silently cut.
      password: typeof req.body?.password === 'string' ? req.body.password : '',
      // An optional, unticked checkbox — the account never depends on it (GDPR art. 7(4)).
      coversConsent: options.realCovers && req.body?.okladki === 'tak',
    });
    if ('error' in result) return back(result.error);

    startSession(req, res, accounts, result.user.id);
    // Either way the person has decided, so the consent banner will not ask again.
    if (options.realCovers) setCoversCookie(req, res, req.body?.okladki === 'tak');
    res.redirect(303, prefix + next);
  });

  router.post('/wyloguj', (req, res) => {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) accounts.destroySession(token);
    clearSessionCookie(req, res);
    res.redirect(303, `${langPrefix(req, '/auth')}/`);
  });

  return router;
}

/** GET /api/me — who am I. Needed where the HTML does not know the session (prerender, Client mode). */
export const meHandler: RequestHandler = (_req, res) => {
  res.set('Cache-Control', 'private, no-store');
  const user = publicUser(currentUser(res));
  if (user) res.json(user);
  else res.status(401).json({ error: 'Nie jesteś zalogowana' });
};

/**
 * Guard for private pages (e.g. /moja-polka/**). These pages use RenderMode.Client — Angular
 * does not render them on the server, so its guard would only run in the browser after the JS
 * loads (a flash of an empty page). Express answers 302 at once, before anything reaches Angular.
 */
export function requireUser(mount: string): RequestHandler {
  return (req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    if (currentUser(res)) return next();
    const prefix = langPrefix(req, mount);
    const path = mount + (req.url === '/' ? '' : req.url);
    res.redirect(302, `${prefix}/logowanie?${params({ next: path })}`);
  };
}

/** A signed-in person has nothing to do on /logowanie or /rejestracja. */
export function redirectIfLoggedIn(page: string): RequestHandler {
  return (req, res, next) => {
    if (req.method !== 'GET' || !currentUser(res)) return next();
    res.redirect(302, `${langPrefix(req, page)}/moja-polka`);
  };
}

function startSession(req: Request, res: Response, accounts: Accounts, userId: number): void {
  // The old session of this browser (if any) ends — the new one gets a fresh token.
  const old = readCookie(req, SESSION_COOKIE);
  if (old) accounts.destroySession(old);
  setSessionCookie(req, res, accounts.createSession(userId), SESSION_TTL_MS);
}

/** A form field as text of limited length (a body from the client can be anything). */
function field(req: Request, name: string, max: number): string {
  const value = req.body?.[name];
  return typeof value === 'string' ? value.slice(0, max) : '';
}

/** Query string without empty values. Passwords never end up here. */
function params(values: Record<string, string>): string {
  return new URLSearchParams(Object.entries(values).filter(([, v]) => v)).toString();
}
