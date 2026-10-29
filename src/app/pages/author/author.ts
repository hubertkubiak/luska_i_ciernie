import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input } from '@angular/core';
import type { AuthorDetail } from '../../../shared/models';
import { Seo, summary } from '../../core/seo';
import { ServerResponse } from '../../core/server-response';
import { BookCard } from '../../ui/book-card/book-card';
import { NotFound } from '../not-found/not-found';

@Component({
  selector: 'app-author-page',
  imports: [BookCard, NotFound],
  templateUrl: './author.html',
  styleUrl: './author.scss',
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

    const seo = inject(Seo);
    effect(() => {
      if (!this.author.hasValue()) return;
      const a = this.author.value();
      seo.update({
        title: a.name,
        description: summary(a.bio),
        path: `/autor/${a.slug}`,
        type: 'profile',
        jsonLd: { '@type': 'Person', name: a.name, description: a.bio, url: seo.link(`/autor/${a.slug}`) },
      });
    });
  }
}
