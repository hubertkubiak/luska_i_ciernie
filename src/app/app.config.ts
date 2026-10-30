import { PRECONNECT_CHECK_BLOCKLIST } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withHttpTransferCacheOptions, withI18nSupport } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
import { apiLanguageInterceptor } from './core/api-language';
import { forwardSessionInterceptor } from './core/forward-session';

// LOCALE_ID is not set by hand here: with i18n the CLI compiles the locale into every build
// (pl for the source version, en for the translation — see "i18n" in angular.json) and adds the
// locale data itself. A manual { provide: LOCALE_ID, useValue: 'pl' } would force Polish in every
// language version. Server and browser share the same build, so they format identically.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: the :slug parameter goes straight into the page component's input().
    // withViewTransitions: every navigation goes through document.startViewTransition() — the old
    // and new page cross-fade, and elements with the same view-transition-name (the cover on the
    // card and on the book page, see Cover) smoothly "fly" to their new place.
    // skipInitialTransition: the first navigation is hydrating the server HTML — nothing to animate.
    // Browsers without the View Transitions API simply navigate as before.
    provideRouter(routes, withComponentInputBinding(), withViewTransitions({ skipInitialTransition: true })),
    // withFetch: on the server HttpClient uses Node's native fetch instead of an XHR emulation.
    // apiLanguageInterceptor: the API answers in this app version's language (pl/en titles).
    // forwardSessionInterceptor: during SSR forwards the session to /api/shelf (does nothing in the browser).
    provideHttpClient(withFetch(), withInterceptors([apiLanguageInterceptor, forwardSessionInterceptor])),
    // provideClientHydration also enables the HTTP transfer cache by default: GET responses
    // fetched during SSR land in <script id="ng-state"> and the client does not call the API again.
    // withI18nSupport: WITHOUT it Angular skips hydrating every component with i18n blocks
    // and re-renders it from scratch (new DOM nodes, clicks before hydration lost) — silently.
    //
    // By default Angular does NOT embed private responses in the HTML — it cannot know whether the
    // page itself ends up in a shared cache. That affects the shelf from /api/shelf in two ways:
    // - includeRequestsWithAuthHeaders: the request has a Cookie header (added by forwardSessionInterceptor,
    //   and the transfer cache interceptor runs AFTER ours, right before sending),
    // - includeNonCacheableRequests: the response has Cache-Control: private, no-store.
    // Safe for us: private data is fetched only by SSR with a session (only /api/shelf), and the HTML
    // of a signed-in person has Cache-Control: private, no-store (server.ts). Without this the shelf
    // button briefly "jumped back" after hydration until the browser fetched the state again.
    provideClientHydration(
      withI18nSupport(),
      withHttpTransferCacheOptions({ includeRequestsWithAuthHeaders: true, includeNonCacheableRequests: true }),
    ),
    // NgOptimizedImage in dev mode warns about a missing <link rel="preconnect"> for `priority` images.
    // We leave it out on purpose (GDPR, see index.html), so the check is disabled for Open Library.
    { provide: PRECONNECT_CHECK_BLOCKLIST, useValue: 'https://covers.openlibrary.org' },
  ],
};
