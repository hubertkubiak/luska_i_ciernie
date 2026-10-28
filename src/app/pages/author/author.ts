import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input } from '@angular/core';
import type { AuthorDetail } from '../../../shared/models';
import { ServerResponse } from '../../core/server-response';
import { BookCard } from '../../ui/book-card/book-card';
import { NotFound } from '../not-found/not-found';

@Component({
  selector: 'app-author-page',
  imports: [BookCard, NotFound],
  template: `
    @if (author.hasValue()) {
      @let a = author.value();
      <article class="author">
        <p class="label">Kronika autorki · {{ a.books.length }} ksiąg w archiwum</p>
        <h1>{{ a.name }}</h1>
        <p class="bio">{{ a.bio }}</p>

        <h2>Bibliografia</h2>
        <ul class="books">
          @for (b of a.books; track b.slug) {
            <li><app-book-card [book]="b" /></li>
          }
        </ul>
      </article>
    } @else if (notFound()) {
      <app-not-found message="Archiwum nie zna takiego nazwiska." />
    } @else if (author.error()) {
      <p class="state">Coś przebudziło się w lochach. Próbujemy to uspokoić.</p>
    } @else {
      <p class="state" role="status">Smok przeszukuje skarbiec…</p>
    }
  `,
  styles: `
    .author {
      max-width: 64rem;
      margin: 0 auto;
      padding: 3rem clamp(1rem, 4vw, 3rem);
    }
    h1 {
      margin: 0.25rem 0 1rem;
      font-size: clamp(2rem, 5vw, 3rem);
      color: var(--gilt);
    }
    .bio {
      max-width: 42rem;
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
export class AuthorPage {
  private readonly response = inject(ServerResponse);

  readonly slug = input.required<string>();

  protected readonly author = httpResource<AuthorDetail>(() => `/api/authors/${this.slug()}`);

  protected readonly notFound = computed(() => {
    const err = this.author.error();
    return err instanceof HttpErrorResponse && err.status === 404;
  });

  constructor() {
    effect(() => {
      if (this.notFound()) this.response.setStatus(404);
    });
  }
}
