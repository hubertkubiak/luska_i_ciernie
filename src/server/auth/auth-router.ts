import express, { Router, type Request, type RequestHandler, type Response } from 'express';
import { LANG_PREFIX, LANGS, type SessionUser } from '../../shared/models';
import { LIMITS, SESSION_TTL_MS, normalizeEmail, type Accounts } from './accounts';
import { RateLimiter, SESSION_COOKIE, clearSessionCookie, isSameOrigin, readCookie, safeNext, setSessionCookie } from './http';

/** Ścieżki z prefiksem każdej wersji językowej: '/logowanie' → ['/logowanie', '/en/logowanie']. */
export const localized = (path: string) => LANGS.map((l) => LANG_PREFIX[l] + path);

/** Prefiks języka z adresu, pod którym zamontowano router: '/en/auth' → '/en', '/auth' → ''. */
const langPrefix = (req: Request, mount: string) => req.baseUrl.slice(0, req.baseUrl.length - mount.length);

/** Zalogowana osoba bieżącego żądania (ustawia sessionMiddleware). */
export const currentUser = (res: Response): SessionUser | null => res.locals['user'] ?? null;

/** Czyta ciasteczko sesji i odkłada osobę do res.locals — dla Angulara, strażników i /api/me. */
export function sessionMiddleware(accounts: Accounts): RequestHandler {
  return (req, res, next) => {
    const token = readCookie(req, SESSION_COOKIE);
    res.locals['user'] = token ? accounts.userForSession(token) : null;
    // Ciasteczko, któremu nie odpowiada już żadna sesja (wygasła, wylogowano na innym urządzeniu)
    // od razu sprzątamy, żeby przeglądarka nie wysyłała go bez końca.
    if (token && !res.locals['user']) clearSessionCookie(req, res);
    next();
  };
}

/**
 * POST /auth/logowanie, /auth/rejestracja, /auth/wyloguj (+ /en/auth/…). Formularze działają
 * bez JavaScriptu: przeglądarka wysyła POST, a my odpowiadamy przekierowaniem 303 na stronę
 * (wzorzec Post/Redirect/Get — odświeżenie strony nie wyśle formularza drugi raz).
 */
export function authRouter(accounts: Accounts): Router {
  const router = Router();
  const loginLimit = new RateLimiter(10, 15 * 60 * 1000);
  // Domyślnie 5 kont na godzinę z jednego IP. Serwer do testów e2e może to podnieść
  // (REGISTER_LIMIT_PER_HOUR=1000), bo zestaw testów zakłada kolejne konta przy każdym przebiegu.
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

    // Limit na parę IP + e-mail: zgadywanie hasła jednego konta jest wolne, a jedna osoba
    // z wielu kont (współdzielone IP) nie blokuje innych.
    const key = `${req.ip}|${normalizeEmail(email)}`;
    if (!loginLimit.take(key)) return back('limit');

    const user = await accounts.login(email, field(req, 'password', LIMITS.password.max));
    if (!user) return back('dane');

    loginLimit.reset(key);
    startSession(req, res, accounts, user.id);
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
      // Bez przycinania długości: za długie hasło ma dać błąd, a nie zostać po cichu obcięte.
      password: typeof req.body?.password === 'string' ? req.body.password : '',
    });
    if ('error' in result) return back(result.error);

    startSession(req, res, accounts, result.user.id);
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

/** GET /api/me — kim jestem. Potrzebne tam, gdzie HTML nie zna sesji (prerender, tryb Client). */
export const meHandler: RequestHandler = (_req, res) => {
  res.set('Cache-Control', 'private, no-store');
  const user = currentUser(res);
  if (user) res.json(user);
  else res.status(401).json({ error: 'Nie jesteś zalogowana' });
};

/**
 * Strażnik prywatnych stron (np. /moja-polka/**). Te strony mają RenderMode.Client — Angular
 * nie renderuje ich na serwerze, więc jego guard zadziałałby dopiero w przeglądarce, po pobraniu
 * JS (mignięcie pustej strony). Express odpowiada 302 od razu, zanim cokolwiek trafi do Angulara.
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

/** Zalogowana osoba na /logowanie albo /rejestracja nie ma tam czego szukać. */
export function redirectIfLoggedIn(page: string): RequestHandler {
  return (req, res, next) => {
    if (req.method !== 'GET' || !currentUser(res)) return next();
    res.redirect(302, `${langPrefix(req, page)}/moja-polka`);
  };
}

function startSession(req: Request, res: Response, accounts: Accounts, userId: number): void {
  // Stara sesja z tej przeglądarki (jeśli była) przestaje istnieć — nowa dostaje nowy token.
  const old = readCookie(req, SESSION_COOKIE);
  if (old) accounts.destroySession(old);
  setSessionCookie(req, res, accounts.createSession(userId), SESSION_TTL_MS);
}

/** Pole formularza jako tekst o ograniczonej długości (body od klienta może być czymkolwiek). */
function field(req: Request, name: string, max: number): string {
  const value = req.body?.[name];
  return typeof value === 'string' ? value.slice(0, max) : '';
}

/** Query string bez pustych wartości. Hasła nigdy tu nie trafiają. */
function params(values: Record<string, string>): string {
  return new URLSearchParams(Object.entries(values).filter(([, v]) => v)).toString();
}
