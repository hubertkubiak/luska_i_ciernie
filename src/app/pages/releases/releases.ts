import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import type { Release } from '../../../shared/models';
import { daysBetween, injectRenderDay } from '../../core/daily';
import { Seo } from '../../core/seo';
import { Countdown } from '../../ui/countdown/countdown';
import { DaysLeftPipe } from '../../ui/days-left.pipe';

/**
 * /premiery — RenderMode.Server z Cache-Control: s-maxage=3600 (server.ts): HTML zależy tylko
 * od DNIA, więc CDN może go trzymać godzinę dla wszystkich anonimowych osób.
 *
 * Dwie pułapki czasu (SPEC §6):
 * - #2 „teraz”: liczba dni liczona z dnia renderu z TransferState (injectRenderDay), więc serwer
 *   i przeglądarka mówią to samo; sekundy tykają tylko w przeglądarce (app-countdown),
 * - #5 strefa czasowa: daty przekazujemy jako „RRRR-MM-DD”, BEZ godziny i bez strefy w DatePipe.
 *   Angular traktuje taki napis jako lokalną datę kalendarzową, więc 14 listopada to 14 listopada
 *   na serwerze w UTC, w Warszawie i w Nowym Jorku. (Uwaga: zwykłe new Date('2026-11-14') w JS
 *   to północ UTC — w Nowym Jorku byłby już 13. A wymuszenie strefy 'UTC' w DatePipe przy dacie
 *   bez godziny przesuwa ją o dzień w drugą stronę — sprawdzone, tak było w pierwszej wersji.)
 */
@Component({
  selector: 'app-releases-page',
  imports: [DatePipe, Countdown, DaysLeftPipe],
  templateUrl: './releases.html',
  styleUrl: './releases.scss',
})
export class ReleasesPage {
  private readonly day = injectRenderDay();
  private readonly releases = httpResource<Release[]>(() => '/api/releases', { defaultValue: [] });

  protected readonly items = computed(() =>
    this.releases.value().map((r) => ({ ...r, days: daysBetween(this.day, r.date) })),
  );
  /** Najbliższa premiera (dziś lub później) — wyróżniona na górze. */
  protected readonly next = computed(() => this.items().find((r) => r.days >= 0));
  protected readonly loading = this.releases.isLoading;

  constructor() {
    inject(Seo).update({
      title: $localize`:@@releases.title:Nadchodzące przepowiednie`,
      description: $localize`:@@releases.description:Kalendarz premier romantasy z odliczaniem do każdej zapowiedzi.`,
      path: '/premiery',
      feed: { title: $localize`:@@releases.feed:Premiery — kanał RSS`, path: '/rss/premiery' },
    });
  }
}
