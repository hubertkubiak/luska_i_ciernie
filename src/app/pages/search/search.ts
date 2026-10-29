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
import { Seo } from '../../core/seo';
import { BookCard } from '../../ui/book-card/book-card';
import { Rune } from '../../ui/rune/rune';
import { parseCriteria, toApiUrl, toQueryParams, toQueryString } from './search-criteria';

/**
 * /szukaj — wyniki zależą tylko od adresu URL, więc serwer renderuje je od razu
 * (link do wyników da się wysłać, a wyszukiwarka może je zaindeksować).
 *
 * Formularz to zwykły <form method="get">: bez JS przeglądarka sama wyśle GET /szukaj?…
 * i dostanie nowy HTML z serwera. Z JS przechwytujemy submit/change i nawigujemy routerem —
 * ten sam adres, tylko bez przeładowania strony.
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
   * Przy zmianie filtrów httpResource na chwilę traci wartość (nowe żądanie = stan „loading”).
   * linkedSignal trzyma poprzednie wyniki, dopóki nie przyjdą nowe — lista nie mruga.
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
      // Ta sama lista wyników pod różnymi adresami (kolejność parametrów, wartości domyślne)
      // ma JEDEN adres kanoniczny — znormalizowany przez toQueryString().
      this.seo.update({
        title: $localize`:@@title.search:Przeszukaj archiwum — Łuska i Ciernie`,
        description: $localize`:@@seo.searchDescription:Szukaj romantasy po tropach, pikanterii i statusie serii — także bez JavaScriptu.`,
        path: qs ? `/szukaj?${qs}` : '/szukaj',
      });
    });

    // Pola formularza mają stan tylko w atrybutach (wartościach domyślnych). Gdy kryteria zmienią
    // się z innego źródła niż sam formularz — „Wyczyść filtry”, Wstecz w przeglądarce — reset()
    // przywraca pola do nowych wartości domyślnych. afterRenderEffect: po renderze (atrybuty już
    // zaktualizowane) i tylko w przeglądarce. Pierwszy przebieg (hydracja) pomijamy celowo:
    // zachowujemy to, co czytelniczka zdążyła kliknąć, zanim aplikacja ożyła.
    let hydrated = false;
    afterRenderEffect(() => {
      this.criteria();
      if (hydrated) this.form().nativeElement.reset();
      hydrated = true;
    });
  }

  /** Enter w polu tekstowym albo przycisk „Szukaj”. */
  protected onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    this.apply(event.target as HTMLFormElement);
  }

  /** Zmiana checkboxa / selecta — z JS wyniki odświeżają się od razu. */
  protected onChange(event: Event): void {
    // Pole tekstowe odpala „change” dopiero przy wyjściu z niego — wtedy też szukamy.
    this.apply((event.target as HTMLInputElement).form!);
  }

  private apply(form: HTMLFormElement): void {
    void this.router.navigate(['/szukaj'], { queryParams: toQueryParams(parseCriteria(new FormData(form))) });
  }
}
