import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { BookDetail } from '../../../shared/models';
import { Seo, summary } from '../../core/seo';
import { ServerResponse } from '../../core/server-response';
import { Cover } from '../../ui/cover/cover';
import { ShelfControl } from '../../ui/shelf-control/shelf-control';
import { Rune } from '../../ui/rune/rune';
import { SpiceMeter } from '../../ui/spice-meter/spice-meter';
import { NotFound } from '../not-found/not-found';
import { SimilarBooks } from './similar-books/similar-books';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

@Component({
  selector: 'app-book-page',
  // SimilarBooks is used only inside @defer, so the compiler splits it into its own chunk.
  imports: [RouterLink, Cover, SpiceMeter, NotFound, Rune, ShelfControl, SimilarBooks],
  templateUrl: './book.html',
  styleUrl: './book.scss',
})
export class BookPage {
  private readonly router = inject(Router);
  private readonly response = inject(ServerResponse);

  /** The :slug route parameter — injected thanks to withComponentInputBinding(). */
  readonly slug = input.required<string>();

  /**
   * A relative URL works on the server too: during SSR Angular resolves it against the
   * current request's address (in production InternalApiBackend sends it to loopback). On the server
   * the response goes into the transfer cache, and in the browser the same request is read from it.
   * A change of slug() (navigating between volumes of a series) fires a new request automatically.
   */
  protected readonly book = httpResource<BookDetail>(() => `/api/books/${this.slug()}`);

  protected readonly notFound = computed(() => {
    const err = this.book.error();
    return err instanceof HttpErrorResponse && err.status === 404;
  });

  /** "BOOK II · SERIES ONGOING" */
  protected readonly seriesLabel = computed(() => {
    const series = this.book.value()?.series;
    if (!series) return null;
    const volume = ROMAN[series.index] ?? String(series.index);
    // Named placeholders (:volume:) — the translator sees a name in the file, not ${…}, and can reorder them.
    const tom = series.plannedBooks
      ? $localize`:@@book.volumeOf:Tom ${volume}:volume: z ${series.plannedBooks}:total:`
      : $localize`:@@book.volume:Tom ${volume}:volume:`;
    const status =
      series.status === 'completed'
        ? $localize`:@@book.seriesCompleted:seria zakończona`
        : $localize`:@@book.seriesOngoing:seria w trakcie`;
    return `${tom} · ${status}`;
  });

  constructor() {
    // No book → a real HTTP 404 (matters for search engines: a "soft 404" with status 200
    // would be indexed as an ordinary page).
    effect(() => {
      if (this.notFound()) this.response.setStatus(404);
    });

    // Old slug: the API answered 301, fetch followed the redirect and we got a book with a
    // DIFFERENT slug than the URL. We redirect to the canonical address:
    // - on the server: status 301 + navigation → the engine sees that the final URL differs
    //   from the requested one and sends a 301 with a Location header instead of HTML,
    // - in the browser: a normal navigation that replaces the history entry.
    effect(() => {
      if (!this.book.hasValue()) return;
      const canonical = this.book.value().slug;
      if (canonical !== this.slug()) {
        this.response.setStatus(301);
        void this.router.navigate(['/ksiazka', canonical], { replaceUrl: true });
      }
    });

    // Meta and JSON-LD Book. Nothing for an old slug — a 301 follows anyway.
    const seo = inject(Seo);
    effect(() => {
      if (!this.book.hasValue() || this.book.value().slug !== this.slug()) return;
      const b = this.book.value();
      const url = seo.link(`/ksiazka/${b.slug}`);
      seo.update({
        title: `${b.title} – ${b.author.name}`,
        description: summary(b.description),
        path: `/ksiazka/${b.slug}`,
        image: b.coverUrl,
        type: 'book',
        jsonLd: {
          '@type': 'Book',
          name: b.title,
          ...(b.originalTitle && { alternateName: b.originalTitle }),
          url,
          author: { '@type': 'Person', name: b.author.name, url: seo.link(`/autor/${b.author.slug}`) },
          isbn: b.isbn,
          ...(b.pages && { numberOfPages: b.pages }),
          datePublished: String(b.year),
          genre: 'Romantasy',
          keywords: b.tropes.map((t) => t.name).join(', '),
          description: b.description,
          ...(b.coverUrl && { image: b.coverUrl }),
          ...(b.series && {
            isPartOf: { '@type': 'BookSeries', name: b.series.name },
            position: b.series.index,
          }),
        },
      });
    });
  }
}
