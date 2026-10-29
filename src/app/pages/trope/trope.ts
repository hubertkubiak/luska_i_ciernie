import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { TropeDetail } from '../../../shared/models';
import { Seo, summary } from '../../core/seo';
import { ServerResponse } from '../../core/server-response';
import { BookCard } from '../../ui/book-card/book-card';
import { realmName } from '../../ui/realm';
import { Rune } from '../../ui/rune/rune';
import { NotFound } from '../not-found/not-found';

/**
 * /tropy/:slug — każdy znany trop ma własny plik HTML z `ng build` (getPrerenderParams).
 * Nieznany slug nie ma pliku, więc trafia do renderu na żądanie (PrerenderFallback.Server)
 * i dostaje 404 tym samym mechanizmem co książki i autorzy.
 */
@Component({
  selector: 'app-trope-page',
  imports: [RouterLink, BookCard, NotFound, Rune],
  templateUrl: './trope.html',
  styleUrl: './trope.scss',
})
export class TropePage {
  private readonly response = inject(ServerResponse);

  readonly slug = input.required<string>();

  protected readonly trope = httpResource<TropeDetail>(() => `/api/tropes/${this.slug()}`);

  protected readonly realm = computed(() => (this.trope.hasValue() ? realmName(this.trope.value().realm) : ''));

  protected readonly notFound = computed(() => {
    const err = this.trope.error();
    return err instanceof HttpErrorResponse && err.status === 404;
  });

  constructor() {
    effect(() => {
      if (this.notFound()) this.response.setStatus(404);
    });

    const seo = inject(Seo);
    effect(() => {
      if (!this.trope.hasValue()) return;
      const t = this.trope.value();
      seo.update({
        title: t.name,
        description: summary(t.description),
        path: `/tropy/${t.slug}`,
        jsonLd: {
          '@type': 'ItemList',
          name: t.name,
          description: t.description,
          itemListElement: t.books.map((b, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: seo.link(`/ksiazka/${b.slug}`),
            name: b.title,
          })),
        },
      });
    });
  }
}
