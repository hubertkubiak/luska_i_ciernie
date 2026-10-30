import { Location } from '@angular/common';
import { Component, LOCALE_ID, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { LANG_PREFIX, LANGS, type Lang } from '../../../shared/models';
import { currentLang } from '../../core/seo';

/** Every language names itself — someone looking for English may not read Polish. */
const NATIVE_NAME: Record<Lang, string> = { pl: 'Polski', en: 'English' };

/**
 * The same page in the other language(s): /ksiazka/x ⇄ /en/ksiazka/x, query string included.
 *
 * A plain <a href>, not routerLink: every language is a separate build of the app (ng build --localize),
 * so switching always means loading the other build — a full page load. It works without JS too.
 * No cookie and no Accept-Language redirect: the URL alone says the language (clear for people and search engines).
 */
@Component({
  selector: 'app-language-switch',
  templateUrl: './language-switch.html',
  styleUrl: './language-switch.scss',
})
export class LanguageSwitch {
  private readonly current = currentLang(inject(LOCALE_ID));
  private readonly router = inject(Router);

  /** App path without the language prefix. Initial value from Location — see account.ts for why. */
  private readonly path = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: inject(Location).path() || '/' },
  );

  protected readonly others = computed(() =>
    LANGS.filter((lang) => lang !== this.current).map((lang) => ({
      lang,
      code: lang.toUpperCase(),
      name: NATIVE_NAME[lang],
      href: LANG_PREFIX[lang] + this.path().split('#')[0],
    })),
  );
}
