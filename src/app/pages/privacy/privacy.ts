import { Component, inject } from '@angular/core';
import { CoverConsent } from '../../core/cover-consent';
import { injectDemoMode } from '../../core/demo';
import { Seo } from '../../core/seo';
import { CoverConsentForm } from '../../ui/cover-consent-form/cover-consent-form';

/**
 * /prywatnosc — what data the site processes and why (GDPR art. 13), linked quietly from the footer.
 * Rendered on demand: the cover consent form shows the reader's current decision (cookie).
 */
@Component({
  selector: 'app-privacy-page',
  imports: [CoverConsentForm],
  templateUrl: './privacy.html',
  styleUrl: './privacy.scss',
})
export class PrivacyPage {
  protected readonly demo = injectDemoMode();
  protected readonly coversAvailable = inject(CoverConsent).available;

  constructor() {
    inject(Seo).update({
      title: $localize`:@@title.privacy:Prywatność`,
      description: $localize`:@@seo.privacyDescription:Jakie dane przetwarza Łuska i Ciernie, jakie ciasteczka zapisuje i skąd biorą się okładki.`,
      path: '/prywatnosc',
    });
  }
}
