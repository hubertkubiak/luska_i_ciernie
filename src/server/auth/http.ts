import type { Request, Response } from 'express';

export const SESSION_COOKIE = 'sid';

/** A simple Cookie header parser — enough for us, no need for the cookie-parser package. */
export function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
}

/**
 * The session cookie:
 * - HttpOnly — the page's JavaScript cannot see it, so even a successful XSS cannot steal the session,
 * - SameSite=Lax — the browser will not attach it to a POST sent from a foreign site (CSRF),
 * - Secure — HTTPS only (not set locally over HTTP, otherwise signing in would be impossible).
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

/** Behind a proxy (e.g. on a host) set Express `trust proxy` (TRUST_PROXY), so req.secure sees HTTPS. */
function isHttps(req: Request): boolean {
  return req.secure || process.env['COOKIE_SECURE'] === 'true';
}

/**
 * CSRF defence number two (next to SameSite): a POST that came from another site carries a foreign
 * address in its Origin header. A missing header is let through — all modern browsers send it,
 * and old ones are protected by SameSite anyway.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.get('origin');
  return !origin || origin === `${req.protocol}://${req.get('host')}`;
}

/**
 * Where to return after signing in. Only a path within the site is accepted — otherwise
 * /logowanie?next=https://evil.example would be an "open redirect", perfect for phishing
 * (the link looks like ours, and after signing in you end up at the scammer's). "//x" and "/\x" are
 * other domains to a browser too.
 */
export function safeNext(next: unknown, fallback = '/moja-polka'): string {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return fallback;
  }
  return next;
}

/** Attempt limit per time window, kept in process memory. For several servers — Redis or a database. */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** true = allowed; false = limit used up. */
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
