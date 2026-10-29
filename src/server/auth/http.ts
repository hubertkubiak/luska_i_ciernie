import type { Request, Response } from 'express';

export const SESSION_COOKIE = 'sid';

/** Prosty parser nagłówka Cookie — wystarcza nam, nie trzeba pakietu cookie-parser. */
export function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
}

/**
 * Ciasteczko sesji:
 * - HttpOnly — JavaScript strony go nie widzi, więc nawet udany atak XSS nie wykradnie sesji,
 * - SameSite=Lax — przeglądarka nie dołączy go do POST-a wysłanego z cudzej strony (CSRF),
 * - Secure — tylko po HTTPS (lokalnie po HTTP go nie ustawiamy, bo nie dałoby się zalogować).
 */
export function setSessionCookie(req: Request, res: Response, token: string, maxAgeMs: number): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps(req),
    path: '/',
    maxAge: maxAgeMs,
  });
}

export function clearSessionCookie(req: Request, res: Response): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: isHttps(req), path: '/' });
}

/** Za proxy (np. na hostingu) ustaw w Expressie `trust proxy`, żeby req.secure widziało HTTPS. */
function isHttps(req: Request): boolean {
  return req.secure || process.env['COOKIE_SECURE'] === 'true';
}

/**
 * Obrona przed CSRF numer dwa (obok SameSite): POST, który przyszedł z innej strony, ma w nagłówku
 * Origin cudzy adres. Brak nagłówka przepuszczamy — wysyłają go wszystkie współczesne przeglądarki,
 * a stare i tak chroni SameSite.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.get('origin');
  return !origin || origin === `${req.protocol}://${req.get('host')}`;
}

/**
 * Dokąd wrócić po zalogowaniu. Przyjmujemy tylko ścieżkę w obrębie serwisu — inaczej
 * /logowanie?next=https://zla-strona.example byłoby „otwartym przekierowaniem”, idealnym do phishingu
 * (link wygląda na nasz, a po zalogowaniu ląduje się u oszusta). "//x" i "/\x" to dla przeglądarki
 * też adresy innych domen.
 */
export function safeNext(next: unknown, fallback = '/moja-polka'): string {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return fallback;
  }
  return next;
}

/** Limit prób w oknie czasowym, trzymany w pamięci procesu. Na kilka serwerów — Redis lub baza. */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** true = wolno; false = limit wyczerpany. */
  take(key: string, now = Date.now()): boolean {
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      this.prune(now);
      return true;
    }
    entry.count++;
    return entry.count <= this.max;
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  private prune(now: number): void {
    if (this.hits.size < 10_000) return;
    for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key);
  }
}
