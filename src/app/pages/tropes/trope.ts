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
  template: `
    @if (trope.hasValue()) {
      @let t = trope.value();
      <article class="trope" [attr.data-realm]="t.realm">
        <a class="back label" routerLink="/tropy">← Wszystkie tropy</a>
        <header>
          <app-rune [trope]="t.slug" />
          <div>
            <p class="label">Trop · {{ realm() }}</p>
            <h1>{{ t.name }}</h1>
          </div>
        </header>
        <p class="description">{{ t.description }}</p>

        <h2>Księgi tym tropem ({{ t.books.length }})</h2>
        <ul class="books">
          @for (b of t.books; track b.slug) {
            <li><app-book-card [book]="b" /></li>
          } @empty {
            <li class="empty">Archiwum milczy. Żadna księga nie podąża jeszcze tą ścieżką.</li>
          }
        </ul>
      </article>
    } @else if (notFound()) {
      <app-not-found message="Nie znamy takiej runy." />
    } @else if (trope.error()) {
      <p class="state">Coś przebudziło się w lochach. Próbujemy to uspokoić.</p>
    } @else {
      <p class="state" role="status">Smok przeszukuje skarbiec…</p>
    }
  `,
  styles: `
    .trope {
      --accent: var(--gilt);
      max-width: 64rem;
      margin: 0 auto;
      padding: 2rem clamp(1rem, 4vw, 3rem) 3rem;

      &[data-realm='turnie'] {
        --accent: var(--ember);
      }
      &[data-realm='mgly'] {
        --accent: var(--fae);
      }
    }
    .back {
      color: var(--text-muted);
      text-decoration: none;
    }
    header {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      margin-top: 1.5rem;
    }
    header app-rune {
      font-size: 4.5rem;
      color: var(--accent);
      filter: drop-shadow(0 0 0.6rem color-mix(in srgb, var(--accent) 45%, transparent));
    }
    h1 {
      margin: 0.25rem 0 0;
      font-size: clamp(2rem, 5vw, 3rem);
      color: var(--gilt);
    }
    .description {
      max-width: 42rem;
      font-size: 1.15rem;
      font-style: italic;
    }
    .books {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
      gap: 1rem;
      padding: 0;
      list-style: none;
    }
    .state {
      padding: 6rem 1rem;
      text-align: center;
    }
  `,
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
