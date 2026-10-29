import { NgOptimizedImage } from '@angular/common';
import { Component, input } from '@angular/core';
import type { BookSummary } from '../../../shared/models';
import { Rune } from '../rune/rune';

/**
 * Okładka książki. Prawdziwa (NgOptimizedImage), gdy API podało coverUrl, albo własna,
 * generowana (SPEC §2.9): tło krainy, runa głównego tropu, tytuł i autorka. Generowana nie
 * narusza niczyich praw i nie wysyła adresu IP czytelniczki do zewnętrznego serwera
 * (COVER_SOURCE=none, patrz docs/PRAWNE.md).
 */
@Component({
  selector: 'app-cover',
  imports: [NgOptimizedImage, Rune],
  templateUrl: './cover.html',
  styleUrl: './cover.scss',
})
export class Cover {
  readonly book = input.required<BookSummary>();
  readonly width = input.required<number>();
  readonly height = input.required<number>();
  /** Obraz LCP strony — Angular dopisze <link rel="preload"> w <head> już na serwerze. */
  readonly priority = input(false);
  /** Pusty = dekoracja (tytuł stoi obok, czytnik ekranu nie musi go czytać drugi raz). */
  readonly alt = input('');
}
