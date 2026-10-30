import { Location } from '@angular/common';
import { Component, afterNextRender, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { Session } from '../../core/session';

/**
 * The account in the header. Anonymous: "Cross the threshold" (with ?next= to return to this page after signing in).
 * Signed in: the name (a link to the Treasury) and "Leave the court".
 *
 * On SSR pages the server knows the person right away (REQUEST_CONTEXT → Session). Prerendered pages
 * were made in `ng build` and do not know who is looking — so after hydration we ask /api/me
 * (afterNextRender = browser only, already after hydration, so the change does not break it).
 */
@Component({
  selector: 'app-account',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './account.html',
  styleUrl: './account.scss',
})
export class Account {
  private readonly session = inject(Session);
  private readonly router = inject(Router);

  protected readonly user = this.session.user;

  // The initial value comes from Location, not router.url: until the FIRST navigation finishes,
  // router.url is still "/". Since stage 15 (withViewTransitions) that navigation finishes a tick
  // later, and a click replayed by event replay hit a link without ?next=.
  // Location knows the address right away — in the browser from the address bar, on the server from the request.
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: inject(Location).path() || '/' },
  );

  protected readonly loginParams = computed(() => {
    const url = this.url().split('#')[0];
    const pointless = url === '/' || url.startsWith('/logowanie') || url.startsWith('/rejestracja');
    return pointless ? {} : { next: url };
  });

  constructor() {
    afterNextRender(() => void this.session.load());
  }
}
