import { Component, afterNextRender, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { Session } from '../../core/session';

/**
 * Konto w nagłówku. Anonim: „Przekrocz próg” (z ?next=, żeby po zalogowaniu wrócić na tę stronę).
 * Zalogowana osoba: imię (link do Skarbca) i „Opuść dwór”.
 *
 * Na stronach z SSR serwer zna osobę od razu (REQUEST_CONTEXT → Session). Strony z prerenderu
 * powstały w `ng build` i nie wiedzą, kto patrzy — dlatego po hydracji pytamy /api/me
 * (afterNextRender = tylko przeglądarka, już po hydracji, więc zmiana nie psuje hydracji).
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

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
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
