import express, { Router, type Request, type Response } from 'express';
import { COVERS_COOKIE } from '../shared/models';
import type { Accounts } from './auth/accounts';
import { currentUser } from './auth/auth-router';
import { isSameOrigin, safeNext } from './auth/http';

/** A decision lasts a year — after that we ask again. */
const DECISION_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * The decision in this browser: `covers=on` (consent) or `covers=off` (declined / withdrawn).
 * "off" is stored too, so the banner asking for consent appears only once.
 */
export function setCoversCookie(req: Request, res: Response, granted: boolean): void {
  res.cookie(COVERS_COOKIE, granted ? 'on' : 'off', {
    sameSite: 'lax',
    secure: req.secure || process.env['COOKIE_SECURE'] === 'true',
    path: '/',
    maxAge: DECISION_MAX_AGE_MS,
  });
}

/**
 * POST /okladki (+ /en/okladki) — grant (`zgoda=tak`) or decline / withdraw consent to real covers.
 * Always a plain form and a full reload, also with JavaScript: the page is then rendered again
 * from the server in its new state, so hydration (including @defer blocks still waiting to hydrate)
 * never meets HTML drawn under the old decision.
 *
 * Signed in: the decision is also saved on the account (with its time), so it follows the person
 * to other devices after signing in there. Withdrawing is as easy as granting (one button, GDPR art. 7(3)).
 */
export function coversRouter(accounts: Accounts): Router {
  const router = Router();
  router.use(express.urlencoded({ extended: false, limit: '1kb' }));
  router.post('/', (req, res) => {
    if (!isSameOrigin(req)) {
      res.status(403).type('text/plain').send('Żądanie z innej strony zostało odrzucone.');
      return;
    }
    const granted = req.body?.zgoda === 'tak';
    setCoversCookie(req, res, granted);
    const user = currentUser(res);
    if (user) accounts.setCoversConsent(user.id, granted);
    res.redirect(303, req.baseUrl.slice(0, -'/okladki'.length) + safeNext(req.body?.next, '/'));
  });
  return router;
}
