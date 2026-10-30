import { formatDate } from '@angular/common';
import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';
import type { Release } from '../../shared/models';

const ROMAN = ['I', 'II', 'III', 'IV'];

/**
 * A release date with the precision the announcement gives: "11 lis 2026", "listopad 2026"
 * (LLLL — the standalone month name, not the genitive "listopada") or "IV kw. 2026" / "Q4 2026".
 * Dates are "YYYY-MM-DD" without a zone — formatDate reads them as a local calendar date (see releases.ts).
 */
@Pipe({ name: 'releaseWhen' })
export class ReleaseWhenPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(release: Pick<Release, 'date' | 'precision'>, style: 'short' | 'long' = 'short'): string {
    switch (release.precision) {
      case 'day':
        return formatDate(release.date, style === 'short' ? 'd MMM yyyy' : 'd MMMM yyyy', this.locale);
      case 'month':
        return formatDate(release.date, 'LLLL yyyy', this.locale);
      case 'quarter': {
        // Quarter names differ in form, not only in words (Roman numerals in Polish) — hence no $localize.
        const quarter = Math.ceil(Number(release.date.slice(5, 7)) / 3);
        const year = release.date.slice(0, 4);
        return this.locale.startsWith('pl') ? `${ROMAN[quarter - 1]} kw. ${year}` : `Q${quarter} ${year}`;
      }
    }
  }
}

/** The <time datetime> value: as precise as we know — "2026-11-11", "2026-11" or "2026". */
export function releaseDatetime(release: Pick<Release, 'date' | 'precision'>): string {
  return release.precision === 'day' ? release.date : release.date.slice(0, release.precision === 'month' ? 7 : 4);
}
