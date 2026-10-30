import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import type { Release } from '../../../shared/models';
import { daysBetween, injectRenderDay } from '../../core/daily';
import { Seo } from '../../core/seo';
import { Countdown } from '../../ui/countdown/countdown';
import { DaysLeftPipe } from '../../ui/days-left.pipe';
import { ReleaseWhenPipe, releaseDatetime } from '../../ui/release-when.pipe';

/**
 * /premiery — RenderMode.Server with Cache-Control: s-maxage=3600 (server.ts): the HTML depends only
 * on the DAY, so a CDN may keep it for an hour for all anonymous visitors.
 *
 * Two time pitfalls (SPEC §6):
 * - #2 "now": the day count is computed from the render day in TransferState (injectRenderDay), so server
 *   and browser say the same; seconds tick only in the browser (app-countdown),
 * - #5 time zone: dates are passed as "YYYY-MM-DD", WITHOUT a time and without a zone in DatePipe.
 *   Angular treats such a string as a local calendar date, so 14 November is 14 November
 *   on a UTC server, in Warsaw and in New York. (Note: a plain new Date('2026-11-14') in JS
 *   is midnight UTC — in New York it would already be the 13th. And forcing the 'UTC' zone in DatePipe
 *   for a date without a time shifts it a day the other way — verified, the first version did that.)
 */
@Component({
  selector: 'app-releases-page',
  imports: [Countdown, DaysLeftPipe, ReleaseWhenPipe],
  templateUrl: './releases.html',
  styleUrl: './releases.scss',
})
export class ReleasesPage {
  private readonly day = injectRenderDay();
  private readonly releases = httpResource<Release[]>(() => '/api/releases', { defaultValue: [] });

  protected readonly items = computed(() =>
    this.releases.value().map((r) => ({
      ...r,
      days: daysBetween(this.day, r.date),
      // Only a month or a quarter is known: no day count, no countdown.
      approximate: r.precision !== 'day',
      datetime: releaseDatetime(r),
    })),
  );
  /** The nearest release with a known day (today or later) — highlighted at the top with a countdown. */
  protected readonly next = computed(() => this.items().find((r) => !r.approximate && r.days >= 0));
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
