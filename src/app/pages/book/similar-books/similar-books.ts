import { Component, input } from '@angular/core';
import type { BookSummary } from '../../../../shared/models';
import { BookCard } from '../../../ui/book-card/book-card';

/**
 * „Podobne ścieżki” pod opisem książki. Strona książki wstawia ten komponent w @defer, więc jego
 * kod (i BookCard) trafia do osobnego chunka JS. Dane przychodzą inputem z odpowiedzi
 * /api/books/:slug — komponent niczego nie pobiera sam, dzięki czemu SSR wyrenderuje go od razu.
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
