import { Pipe, PipeTransform } from '@angular/core';

/**
 * „za 3 dni” / „jutro” / „dziś premiera” / „już w księgarniach”. Bez ICU (ICU w @for wywraca
 * hydrację i18n w Angularze 22.2) — i bez odmiany: od 2 dni wzwyż polski i angielski mają jedną
 * formę („dni” / „days”), a 1 dzień to „jutro”.
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
