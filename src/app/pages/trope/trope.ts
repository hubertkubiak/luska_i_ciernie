import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { TropeDetail } from '../../../shared/models';
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
  }
}
