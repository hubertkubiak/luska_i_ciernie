import { NgOptimizedImage } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { BookSummary } from '../../../shared/models';
import { SpiceMeter } from '../spice-meter/spice-meter';

/** Karta książki do list (autor, tropy, wyniki wyszukiwania). */
@Component({
  selector: 'app-book-card',
  imports: [RouterLink, NgOptimizedImage, SpiceMeter],
  templateUrl: './book-card.html',
  styleUrl: './book-card.scss',
})
export class BookCard {
  readonly book = input.required<BookSummary>();
}
