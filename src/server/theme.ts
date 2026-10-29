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
 * POST /motyw (+ /en/motyw) — przełącznik motywu bez JavaScriptu. Z JS aplikacja ustawia
 * ciasteczko sama (src/app/core/theme.ts) i nie przeładowuje strony.
 *
 * Ciasteczko motywu NIE jest HttpOnly: to nie sekret, a przełącznik z JS musi móc je zapisać.
 * To preferencja ustawiana na wyraźne żądanie osoby — patrz docs/PRAWNE.md §3.
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
 * Strony z SSR mają już właściwy motyw — ustawia go Angular, czytając ciasteczko przez REQUEST.
 * Ale HTML z prerenderu (powstał w `ng build`) i „skorupa” stron w trybie Client nie znają
 * żadnego żądania, więc zawsze mają domyślny `data-theme="night"`. Bez tej poprawki osoba
 * z motywem pergaminowym zobaczyłaby na nich błysk ciemnego motywu (FOUC), zanim zadziała JS.
 */
export async function withTheme(response: Response, theme: Theme): Promise<Response> {
  if (theme === DEFAULT_THEME || !response.headers.get('content-type')?.includes('text/html')) return response;
  const html = (await response.text()).replace(/(<html\b[^>]*?\bdata-theme=")[^"]*(")/, `$1${theme}$2`);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}
