import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CoverConsent } from '../../core/cover-consent';

/**
 * "Show real covers" / "Withdraw consent". A plain POST /okladki form, not intercepted by JS on purpose:
 * the full reload renders every cover on the page again from the server (src/server/covers.ts).
 * When signed in, the server also records the decision on the account.
 */
@Component({
  selector: 'app-cover-consent-form',
  imports: [RouterLink],
  templateUrl: './cover-consent-form.html',
  styleUrl: './cover-consent-form.scss',
})
export class CoverConsentForm {
  /** Where to return after the decision — app path without the language prefix. */
  readonly next = input.required<string>();
  /** The link to /prywatnosc (pointless on that page itself). */
  readonly moreLink = input(true);

  private readonly consent = inject(CoverConsent);
  protected readonly available = this.consent.available;
  protected readonly granted = this.consent.granted;
}
