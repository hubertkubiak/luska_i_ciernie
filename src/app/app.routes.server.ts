import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';
import { firstValueFrom } from 'rxjs';
import type { Trope } from '../shared/models';

// Rendering strategy per route (SPEC §3). Paths must match the ones in app.routes.ts.
export const serverRoutes: ServerRoute[] = [
  // Home: rendered on demand, although SPEC §3 suggests Prerender. Reason: the trope of the day. In a
  // prerender "today" = the day of `ng build`, stored in the TransferState of index.html — the page
  // would hydrate consistently, but be out of date every day.
  { path: '', renderMode: RenderMode.Server },
  // The trope list rarely changes → also a file from the build (dist/.../browser/tropy/index.html).
  { path: 'tropy', renderMode: RenderMode.Prerender },
  {
    path: 'tropy/:slug',
    renderMode: RenderMode.Prerender,
    // Called during `ng build`, in the server app's injection context — inject() works.
    // Returns a list of parameters; each item = one generated HTML file.
    async getPrerenderParams() {
      const tropes = await firstValueFrom(inject(HttpClient).get<Trope[]>('/api/tropes'));
      return tropes.map((t) => ({ slug: t.slug }));
    },
    // A slug outside the build-time list → rendered on demand (the default, spelled out here).
    fallback: PrerenderFallback.Server,
  },
  // Results depend on query params → on-demand rendering only (a prerender knows just the path).
  { path: 'szukaj', renderMode: RenderMode.Server },
  // Countdown in days → the HTML is valid for a day. Rendered on demand but cached (s-maxage in server.ts).
  { path: 'premiery', renderMode: RenderMode.Server },
  // Shows the reader's current cover consent (cookie) → rendered on demand.
  { path: 'prywatnosc', renderMode: RenderMode.Server },
  // Forms: rendered on demand (the error message and filled-in fields depend on query params).
  { path: 'logowanie', renderMode: RenderMode.Server },
  { path: 'rejestracja', renderMode: RenderMode.Server },
  // Private, no SEO → browser only. Express redirects anonymous visitors (302) before that.
  { path: 'moja-polka', renderMode: RenderMode.Client },
  { path: 'moja-polka/**', renderMode: RenderMode.Client },
  // Quiz: pure interaction, nothing to index → an empty HTML shell, the browser draws everything.
  // The server does not run Angular, so it answers at once and there is nothing to hydrate.
  { path: 'wyrocznia', renderMode: RenderMode.Client },
  // Thousands of items and changing data → rendered on demand. The page itself sets 404/301
  // (RESPONSE_INIT), because they depend on the API response.
  { path: 'ksiazka/:slug', renderMode: RenderMode.Server },
  { path: 'autor/:slug', renderMode: RenderMode.Server },
  // Anything not listed above is an unknown address → the status is set statically in the config.
  // NOTE: every new route in app.routes.ts needs its own entry here, otherwise it answers 404.
  { path: '**', renderMode: RenderMode.Server, status: 404 },
];
