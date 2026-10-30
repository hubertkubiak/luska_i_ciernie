import express, { Router, type Request } from 'express';
import { THEMES, type Theme } from '../shared/models';
import { isSameOrigin, readCookie, safeNext } from './auth/http';

export const THEME_COOKIE = 'theme';
const DEFAULT_THEME: Theme = 'night';

export function themeFromRequest(req: Request): Theme {
  const value = readCookie(req, THEME_COOKIE);
  return THEMES.includes(value as Theme) ? (value as Theme) : DEFAULT_THEME;
}

/**
 * POST /motyw (+ /en/motyw) — the theme toggle without JavaScript. With JS the app sets
 * the cookie itself (src/app/core/theme.ts) and does not reload the page.
 *
 * The theme cookie is NOT HttpOnly: it is not a secret, and the JS toggle must be able to write it.
 * It is a preference set at the person's explicit request — see docs/PRAWNE.md §3.
 */
export function themeRouter(): Router {
  const router = Router();
  router.use(express.urlencoded({ extended: false, limit: '1kb' }));
  router.post('/', (req, res) => {
    if (!isSameOrigin(req)) {
      res.status(403).type('text/plain').send('Żądanie z innej strony zostało odrzucone.');
      return;
    }
    const theme = THEMES.includes(req.body?.theme) ? (req.body.theme as Theme) : DEFAULT_THEME;
    res.cookie(THEME_COOKIE, theme, {
      sameSite: 'lax',
      secure: req.secure || process.env['COOKIE_SECURE'] === 'true',
      path: '/',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });
    res.redirect(303, req.baseUrl.slice(0, -'/motyw'.length) + safeNext(req.body?.next, '/'));
  });
  return router;
}

/**
 * SSR pages already have the right theme — Angular sets it by reading the cookie via REQUEST.
 * But prerendered HTML (made in `ng build`) and the shell of Client-mode pages know no request,
 * so they always carry the default `data-theme="night"`. Without this fix a person using the
 * parchment theme would see a flash of the dark theme on them (FOUC) before the JS runs.
 */
export async function withTheme(response: Response, theme: Theme): Promise<Response> {
  if (theme === DEFAULT_THEME || !response.headers.get('content-type')?.includes('text/html')) return response;
  const html = (await response.text()).replace(/(<html\b[^>]*?\bdata-theme=")[^"]*(")/, `$1${theme}$2`);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}
