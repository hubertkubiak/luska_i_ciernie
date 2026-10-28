import { NgOptimizedImage } from '@angular/common';
import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { BookDetail } from '../../../shared/models';
import { SpiceMeter } from '../../ui/spice-meter/spice-meter';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

@Component({
  selector: 'app-book-page',
  imports: [RouterLink, NgOptimizedImage, SpiceMeter],
  templateUrl: './book.html',
  styleUrl: './book.scss',
})
export class BookPage {
  /** Parametr :slug z trasy — wstrzyknięty dzięki withComponentInputBinding(). */
  readonly slug = input.required<string>();

  /**
   * Względny URL działa również na serwerze: podczas SSR Angular rozwiązuje go względem
   * adresu bieżącego żądania (np. http://localhost:4000/api/...). Na serwerze odpowiedź
   * trafia do transfer cache, a w przeglądarce ten sam request jest z niego odczytywany.
   * Zmiana slug() (nawigacja między tomami serii) automatycznie odpala nowy request.
   */
  protected readonly book = httpResource<BookDetail>(() => `/api/books/${this.slug()}`);

  protected readonly notFound = computed(() => {
    const err = this.book.error();
    return err instanceof HttpErrorResponse && err.status === 404;
  });

  /** „TOM II · SERIA W TRAKCIE” */
  protected readonly seriesLabel = computed(() => {
    const series = this.book.value()?.series;
    if (!series) return null;
    const tom = `Tom ${ROMAN[series.index] ?? series.index}`;
    const of = series.plannedBooks ? ` z ${series.plannedBooks}` : '';
    const status = series.status === 'completed' ? 'seria zakończona' : 'seria w trakcie';
    return `${tom}${of} · ${status}`;
  });
}
