import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { Session } from './session';

/**
 * Guard for navigation IN THE BROWSER (clicking the "Treasury" link). Opening it from the address bar
 * is handled earlier by Express (requireUser in server.ts): it answers 302 before anything is
 * rendered. This guard covers the case the server never sees — navigation by the router.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  // inject() only before the first await — after it the injection context no longer exists.
  const session = inject(Session);
  const router = inject(Router);
  const user = await session.load();
  return user ? true : router.createUrlTree(['/logowanie'], { queryParams: { next: state.url } });
};
