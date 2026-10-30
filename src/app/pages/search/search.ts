import { httpResource } from '@angular/common/http';
import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  linkedSignal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { BookSummary, Trope } from '../../../shared/models';
import { isReplayed } from '../../core/event-replay';
import { Seo } from '../../core/seo';
import { BookCard } from '../../ui/book-card/book-card';
import { Rune } from '../../ui/rune/rune';
import { parseCriteria, toApiUrl, toQueryParams, toQueryString } from './search-criteria';

/**
 * /szukaj — results depend only on the URL, so the server renders them right away
 * (a link to results can be shared, and search engines can index it).
 *
 * The form is a plain <form method="get">: without JS the browser sends GET /szukaj?… itself
 * and gets new HTML from the server. With JS we intercept submit/change and navigate with the router —
 * the same URL, just without reloading the page.
 */
@Component({
  selector: 'app-search-page',
  imports: [RouterLink, BookCard, Rune],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class SearchPage {
  private readonly router = inject(Router);
  private readonly seo = inject(Seo);

  private readonly queryParams = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });

  protected readonly criteria = computed(() => parseCriteria(this.queryParams()));

  protected readonly tropes = httpResource<Trope[]>(() => '/api/tropes', { defaultValue: [] });

  private readonly results = httpResource<BookSummary[]>(() => toApiUrl(this.criteria()));

  /**
   * When filters change, httpResource briefly loses its value (new request = "loading" state).
   * linkedSignal keeps the previous results until the new ones arrive — the list does not flicker.
   */
  protected readonly shown = linkedSignal<BookSummary[] | undefined, BookSummary[] | undefined>({
    source: () => (this.results.hasValue() ? this.results.value() : undefined),
    computation: (next, previous) => next ?? previous?.value,
  });

  protected readonly loading = this.results.isLoading;
  protected readonly failed = computed(() => !!this.results.error());
  protected readonly spiceLevels = [0, 1, 2, 3, 4, 5] as const;

  private readonly form = viewChild.required<ElementRef<HTMLFormElement>>('form');

  constructor() {
    effect(() => {
      const qs = toQueryString(this.criteria());
      // The same results under different URLs (parameter order, default values)
      // have ONE canonical URL — normalised by toQueryString().
      this.seo.update({
        title: $localize`:@@title.search:Przeszukaj archiwum — Łuska i Ciernie`,
        description: $localize`:@@seo.searchDescription:Szukaj romantasy po tropach, pikanterii i statusie serii — także bez JavaScriptu.`,
        path: qs ? `/szukaj?${qs}` : '/szukaj',
      });
    });

    // Form fields keep state only in attributes (default values). When the criteria change
    // from somewhere other than the form itself — "Clear filters", the browser's Back — reset()
    // restores the fields to the new defaults. afterRenderEffect: after rendering (attributes already
    // updated) and only in the browser. The first run (hydration) is skipped on purpose:
    // we keep whatever the reader managed to click before the app came alive.
    let hydrated = false;
    afterRenderEffect(() => {
      this.criteria();
      if (hydrated) this.form().nativeElement.reset();
      hydrated = true;
    });
  }

  /** Enter in the text field or the "Search" button. */
  protected onSubmit(event: SubmitEvent): void {
    if (isReplayed(event)) return; // sent before hydration: the browser is already loading the results (GET)
    event.preventDefault();
    this.apply(event.target as HTMLFormElement);
  }

  /** A checkbox / select change — with JS the results refresh right away. */
  protected onChange(event: Event): void {
    // A text field fires "change" only when you leave it — then we search too.
    this.apply((event.target as HTMLInputElement).form!);
  }

  private apply(form: HTMLFormElement): void {
    void this.router.navigate(['/szukaj'], { queryParams: toQueryParams(parseCriteria(new FormData(form))) });
  }
}
