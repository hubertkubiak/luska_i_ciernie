import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Seo } from '../../core/seo';
import { Session } from '../../core/session';

/**
 * /moja-polka — RenderMode.Client: serwer oddaje pustą „skorupę” aplikacji, a treść powstaje
 * dopiero w przeglądarce. Prywatna strona i tak nie ma wartości dla SEO, a nie musimy renderować
 * na serwerze niczego, co zależy od zalogowanej osoby. Dostęp pilnują dwie warstwy:
 * Express (302 przy wejściu z adresu) i authGuard (nawigacja routerem).
 * Sama półka (TBR / czytam / przeczytane) — następny etap.
 */
@Component({
  selector: 'app-shelf-page',
  imports: [RouterLink],
  templateUrl: './shelf.html',
  styleUrl: './shelf.scss',
})
export class ShelfPage {
  protected readonly user = inject(Session).user;

  constructor() {
    inject(Seo).update({
      title: $localize`:@@nav.shelf:Skarbiec`,
      description: $localize`:@@nav.shelfMeaning:Twoje książki`,
      path: '/moja-polka',
      noindex: true,
    });
  }
}
