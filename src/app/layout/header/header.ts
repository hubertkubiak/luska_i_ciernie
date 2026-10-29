import { Location } from '@angular/common';
import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { Session } from '../../core/session';
import { Rune } from '../../ui/rune/rune';
import { Account } from '../account/account';
import { ThemeToggle } from '../theme-toggle/theme-toggle';

interface NavItem {
  path: string;
  /** Klimatyczna nazwa (SPEC §2.6)… */
  label: string;
  /** …zawsze w parze z jasnym znaczeniem. */
  meaning: string;
}

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, Rune, Account, ThemeToggle],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  // $localize: teksty z kodu TS też trafiają do plików tłumaczeń (ng extract-i18n).
  // Część tras jeszcze nie istnieje — trafią na stronę „zarosła cierniami”.
  private readonly items: NavItem[] = [
    { path: '/szukaj', label: $localize`:@@nav.search:Przeszukaj archiwum`, meaning: $localize`:@@nav.searchMeaning:Szukaj książek` },
    { path: '/tropy', label: $localize`:@@nav.tropes:Tropy`, meaning: $localize`:@@nav.tropesMeaning:Katalog tropów` },
    { path: '/premiery', label: $localize`:@@nav.releases:Nadchodzące przepowiednie`, meaning: $localize`:@@nav.releasesMeaning:Kalendarz premier` },
    { path: '/wyrocznia', label: $localize`:@@nav.oracle:Wyrocznia`, meaning: $localize`:@@nav.oracleMeaning:Quiz rekomendacji` },
    { path: '/moja-polka', label: $localize`:@@nav.shelf:Skarbiec`, meaning: $localize`:@@nav.shelfMeaning:Twoje książki` },
  ];

  private readonly session = inject(Session);

  /**
   * Po zalogowaniu „Skarbiec” znika z menu: imię w nagłówku (app-account) prowadzi tam samo,
   * a dwa identyczne linki rozpychały nagłówek do dwóch linii na laptopie 1366 px.
   */
  protected readonly nav = computed(() =>
    this.session.user() ? this.items.filter((i) => i.path !== '/moja-polka') : this.items,
  );

  private readonly menu = viewChild.required<ElementRef<HTMLElement>>('menu');
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Link „Przejdź do treści” na bieżącej stronie, z base href (np. /en/tropy#tresc). */
  protected readonly skipHref = computed(() => this.location.prepareExternalUrl(this.url().split('#')[0]) + '#tresc');

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Bez JS kliknięcie linku przeładowuje stronę, więc panel znika sam. Z JS router zmienia
    // widok bez przeładowania — panel trzeba zwinąć ręcznie. afterNextRender: tylko przeglądarka
    // (DOM serwera nie zna Popover API, a nawigacji „po kliknięciu” na serwerze i tak nie ma).
    afterNextRender(() => {
      this.router.events
        .pipe(
          // id > 1: pomijamy POCZĄTKOWĄ nawigację. Kończy się ona już po hydracji, więc panel
          // otwarty wcześniej (wolne łącze, menu działa bez JS) zwinąłby się czytelniczce sam.
          filter((e) => e instanceof NavigationEnd && e.id > 1),
          takeUntilDestroyed(destroyRef),
        )
        .subscribe(() => {
          const menu = this.menu().nativeElement;
          if (menu.matches(':popover-open')) menu.hidePopover();
        });
    });
  }
}
