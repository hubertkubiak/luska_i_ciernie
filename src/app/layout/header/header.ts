import { Location } from '@angular/common';
import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { Session } from '../../core/session';
import { Rune } from '../../ui/rune/rune';
import { Account } from '../account/account';
import { LanguageSwitch } from '../language-switch/language-switch';
import { ThemeToggle } from '../theme-toggle/theme-toggle';

interface NavItem {
  path: string;
  /** The atmospheric name (SPEC §2.6)… */
  label: string;
  /** …always paired with a plain meaning. */
  meaning: string;
}

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, Rune, Account, LanguageSwitch, ThemeToggle],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  // $localize: texts in TS code also go into the translation files (ng extract-i18n).
  // Routes that do not exist yet end up on the "overgrown with thorns" page.
  private readonly items: NavItem[] = [
    { path: '/szukaj', label: $localize`:@@nav.search:Przeszukaj archiwum`, meaning: $localize`:@@nav.searchMeaning:Szukaj książek` },
    { path: '/tropy', label: $localize`:@@nav.tropes:Tropy`, meaning: $localize`:@@nav.tropesMeaning:Katalog tropów` },
    { path: '/premiery', label: $localize`:@@nav.releases:Nadchodzące przepowiednie`, meaning: $localize`:@@nav.releasesMeaning:Kalendarz premier` },
    { path: '/wyrocznia', label: $localize`:@@nav.oracle:Wyrocznia`, meaning: $localize`:@@nav.oracleMeaning:Quiz rekomendacji` },
    { path: '/moja-polka', label: $localize`:@@nav.shelf:Skarbiec`, meaning: $localize`:@@nav.shelfMeaning:Twoje książki` },
  ];

  private readonly session = inject(Session);

  /**
   * When signed in, "Treasury" disappears from the menu: the name in the header (app-account) leads
   * there anyway, and two identical links pushed the header onto two lines on a 1366 px laptop.
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

  /** The "Skip to content" link on the current page, with the base href (e.g. /en/tropy#tresc). */
  protected readonly skipHref = computed(() => this.location.prepareExternalUrl(this.url().split('#')[0]) + '#tresc');

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Without JS a link click reloads the page, so the panel disappears by itself. With JS the router
    // changes the view without a reload — the panel must be closed by hand. afterNextRender: browser only
    // (the server DOM has no Popover API, and there is no "navigation by click" on the server anyway).
    afterNextRender(() => {
      this.router.events
        .pipe(
          // id > 1: skip the INITIAL navigation. It finishes only after hydration, so a panel
          // opened earlier (slow connection, the menu works without JS) would close on the reader by itself.
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
