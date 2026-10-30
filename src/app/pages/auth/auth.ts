import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CoverConsent } from '../../core/cover-consent';
import { injectDemoMode } from '../../core/demo';
import { Seo } from '../../core/seo';

export type AuthMode = 'login' | 'register';

/**
 * /logowanie and /rejestracja — one component, the mode comes from the route's `data` (app.routes.ts).
 *
 * The form is a plain <form method="post">: it works the same with and without JavaScript. Express
 * (src/server/auth/auth-router.ts) accepts the POST, sets the session cookie and answers with
 * a 303 redirect. On error it comes back here with ?blad=…, and the fields are refilled from the URL —
 * except the password, which never goes into a URL.
 */
@Component({
  selector: 'app-auth-page',
  imports: [RouterLink],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
})
export class AuthPage {
  /** From the route's `data`. */
  readonly mode = input.required<AuthMode>();
  /** From query params (withComponentInputBinding). */
  readonly blad = input<string>();
  readonly email = input<string>();
  readonly displayName = input<string>();
  readonly next = input<string>();

  protected readonly error = computed(() => {
    switch (this.blad()) {
      case 'dane':
        // One message for a wrong e-mail and a wrong password on purpose — we do not reveal which accounts exist.
        return $localize`:@@auth.errorCredentials:Nieprawidłowy e-mail lub hasło.`;
      case 'limit':
        return $localize`:@@auth.errorLimit:Zbyt wiele prób. Odpocznij chwilę i spróbuj ponownie za kilkanaście minut.`;
      case 'email':
        return $localize`:@@auth.errorEmail:Podaj poprawny adres e-mail.`;
      case 'haslo':
        return $localize`:@@auth.errorPassword:Hasło musi mieć od 8 do 128 znaków.`;
      case 'imie':
        return $localize`:@@auth.errorName:Imię lub pseudonim musi mieć od 2 do 40 znaków.`;
      case 'zajety':
        return $localize`:@@auth.errorTaken:Pod tym adresem pakt jest już zawarty. Zaloguj się.`;
      default:
        return null;
    }
  });

  /** Demo hosting without a persistent disk: say honestly that accounts will not last. */
  protected readonly demo = injectDemoMode();
  protected readonly coversAvailable = inject(CoverConsent).available;

  /** The same `next` in the "Seal the pact / Cross the threshold" link, so the target survives switching forms. */
  protected readonly nextParams = computed(() => (this.next() ? { next: this.next() } : {}));

  constructor() {
    const seo = inject(Seo);
    // effect, not constructor code: the mode() input is set only after the component is created.
    // Form pages have no business in search results → noindex.
    effect(() =>
      seo.update({
        title:
          this.mode() === 'login'
            ? $localize`:@@auth.loginTitle:Przekrocz próg`
            : $localize`:@@auth.registerTitle:Zawrzyj pakt`,
        description: $localize`:@@auth.description:Konto w Łusce i Cierniach: własny skarbiec książek.`,
        path: this.mode() === 'login' ? '/logowanie' : '/rejestracja',
        noindex: true,
      }),
    );
  }
}
