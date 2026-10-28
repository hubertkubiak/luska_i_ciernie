import { NgOptimizedImage } from '@angular/common';
import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { BookDetail } from '../../../shared/models';
import { ServerResponse } from '../../core/server-response';
import { SpiceMeter } from '../../ui/spice-meter/spice-meter';
import { NotFound } from '../not-found/not-found';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

@Component({
  selector: 'app-book-page',
  imports: [RouterLink, NgOptimizedImage, SpiceMeter, NotFound],
  templateUrl: './book.html',
  styleUrl: './book.scss',
})
export class BookPage {
  private readonly router = inject(Router);
  private readonly response = inject(ServerResponse);

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

  constructor() {
    // Brak książki → prawdziwe HTTP 404 (ważne dla wyszukiwarek: „soft 404” z kodem 200
    // zostałoby zaindeksowane jako zwykła strona).
    effect(() => {
      if (this.notFound()) this.response.setStatus(404);
    });

    // Stary slug: API odpowiedziało 301, fetch poszedł za przekierowaniem i dostaliśmy
    // książkę o INNYM slugu niż w adresie. Przekierowujemy na adres kanoniczny:
    // - na serwerze: status 301 + nawigacja → silnik widzi, że URL końcowy różni się
    //   od żądanego, i zamiast HTML-a odsyła odpowiedź 301 z nagłówkiem Location,
    // - w przeglądarce: zwykła nawigacja z podmianą wpisu w historii.
    effect(() => {
      if (!this.book.hasValue()) return;
      const canonical = this.book.value().slug;
      if (canonical !== this.slug()) {
        this.response.setStatus(301);
        void this.router.navigate(['/ksiazka', canonical], { replaceUrl: true });
      }
    });
  }
}
