import { Location } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { CoverConsent } from '../../core/cover-consent';
import { Session } from '../../core/session';

/**
 * A one-time question about real covers for anonymous visitors (signed-in people answered it at
 * registration). Not a modal: it does not cover the page or block scrolling, the reader can ignore it.
 * Both answers are equally prominent (no "nudging" towards yes) and both are stored (`covers=on|off`),
 * so it never comes back. With COVER_SOURCE=none there is nothing to ask about.
 *
 * Rendered on the server from the cookie, so it does not flash on pages where the decision is already made.
 */
@Component({
  selector: 'app-cover-consent-banner',
  imports: [RouterLink],
  templateUrl: './cover-consent-banner.html',
  styleUrl: './cover-consent-banner.scss',
})
export class CoverConsentBanner {
  private readonly consent = inject(CoverConsent);
  private readonly user = inject(Session).user;
  private readonly router = inject(Router);

  protected readonly visible = computed(() => this.consent.available && !this.consent.decided() && this.user() === null);

  /** Return to the same page after the POST. Initial value from Location — see account.ts. */
  protected readonly here = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: inject(Location).path() || '/' },
  );
}
