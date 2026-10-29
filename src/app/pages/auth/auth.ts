import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Seo } from '../../core/seo';

export type AuthMode = 'login' | 'register';

/**
 * /logowanie i /rejestracja — jeden komponent, tryb z `data` trasy (app.routes.ts).
 *
 * Formularz to zwykły <form method="post">: działa bez JavaScriptu i z nim tak samo. Express
 * (src/server/auth/auth-router.ts) przyjmuje POST, ustawia ciasteczko sesji i odpowiada
 * przekierowaniem 303. Przy błędzie wraca tu z ?blad=…, a pola wypełniamy z adresu — oprócz
 * hasła, które nigdy nie trafia do URL-a.
 */
@Component({
  selector: 'app-auth-page',
  imports: [RouterLink],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
})
export class AuthPage {
  /** Z `data` trasy. */
  readonly mode = input.required<AuthMode>();
  /** Z query params (withComponentInputBinding). */
  readonly blad = input<string>();
  readonly email = input<string>();
  readonly displayName = input<string>();
  readonly next = input<string>();

  protected readonly error = computed(() => {
    switch (this.blad()) {
      case 'dane':
        // Celowo jeden komunikat dla złego e-maila i złego hasła — nie zdradzamy, które konta istnieją.
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

  /** Ten sam `next` w linku „Zawrzyj pakt / Przekrocz próg”, żeby nie zgubić celu przy zmianie formularza. */
  protected readonly nextParams = computed(() => (this.next() ? { next: this.next() } : {}));

  constructor() {
    const seo = inject(Seo);
    // effect, nie kod w konstruktorze: input mode() jest ustawiany dopiero po utworzeniu komponentu.
    // Strony formularzy nie mają czego szukać w wynikach wyszukiwania → noindex.
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
