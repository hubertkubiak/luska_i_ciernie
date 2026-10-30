import { Component, input } from '@angular/core';
import type { BookSummary } from '../../../../shared/models';
import { BookCard } from '../../../ui/book-card/book-card';

/**
 * "Kindred paths" below the book description. The book page puts this component in @defer, so its
 * code (and BookCard) goes into a separate JS chunk. The data comes as an input from the
 * /api/books/:slug response — the component fetches nothing itself, so SSR renders it right away.
 */
@Component({
  selector: 'app-similar-books',
  imports: [BookCard],
  templateUrl: './similar-books.html',
  styleUrl: './similar-books.scss',
})
export class SimilarBooks {
  readonly books = input.required<BookSummary[]>();
}
