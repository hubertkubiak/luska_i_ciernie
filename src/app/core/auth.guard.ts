import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { Session } from './session';

/**
 * Guard dla nawigacji W PRZEGLĄDARCE (kliknięcie linku „Skarbiec”). Wejście z paska adresu
 * obsługuje wcześniej Express (requireUser w server.ts): odpowiada 302, zanim cokolwiek się
 * wyrenderuje. Ten guard domyka przypadek, którego serwer nie widzi — nawigację routerem.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  // inject() tylko przed pierwszym await — potem kontekst wstrzykiwania już nie istnieje.
  const session = inject(Session);
  const router = inject(Router);
  const user = await session.load();
  return user ? true : router.createUrlTree(['/logowanie'], { queryParams: { next: state.url } });
};
