import { Pipe, PipeTransform } from '@angular/core';

/**
 * "in 3 days" / "tomorrow" / "out today" / "already in bookshops". No ICU (ICU inside @for breaks
 * i18n hydration in Angular 22.2) — and no plural forms: from 2 days up Polish and English have one
 * form ("dni" / "days"), and 1 day is "tomorrow".
 */
@Pipe({ name: 'daysLeft' })
export class DaysLeftPipe implements PipeTransform {
  transform(days: number): string {
    if (days < 0) return $localize`:@@releases.out:już w księgarniach`;
    if (days === 0) return $localize`:@@releases.today:dziś premiera`;
    if (days === 1) return $localize`:@@releases.tomorrow:jutro`;
    return $localize`:@@releases.inDays:za ${days}:count: dni`;
  }
}
