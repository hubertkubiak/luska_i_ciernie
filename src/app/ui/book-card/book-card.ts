import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { BookSummary } from '../../../shared/models';
import { Cover } from '../cover/cover';
import { SpiceMeter } from '../spice-meter/spice-meter';

/** A book card for lists (author, tropes, search results). */
@Component({
  selector: 'app-book-card',
  imports: [RouterLink, Cover, SpiceMeter],
  templateUrl: './book-card.html',
  styleUrl: './book-card.scss',
})
export class BookCard {
  readonly book = input.required<BookSummary>();
}
