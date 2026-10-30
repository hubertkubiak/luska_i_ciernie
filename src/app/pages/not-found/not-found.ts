import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Seo } from '../../core/seo';

/**
 * The "overgrown with thorns" view. It does NOT set the HTTP status itself — that is done:
 * - for unknown URLs: by `status: 404` on the '**' route in app.routes.server.ts (statically),
 * - for missing books/authors: by the page through ServerResponse (dynamically, after the API response).
 */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {
  readonly message = input($localize`:@@notFound.default:Nikt nie chodził tędy od stuleci.`);

  constructor() {
    // noindex: an error page should not end up in search results (the 404 status is one thing,
    // but meta robots also protects against indexing should the status ever get lost).
    inject(Seo).update({
      title: $localize`:@@title.notFound:Ścieżka zarosła cierniami`,
      description: $localize`:@@notFound.default:Nikt nie chodził tędy od stuleci.`,
      path: inject(Router).url,
      noindex: true,
    });
  }
}
