import { httpResource } from '@angular/common/http';
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { TropeDetail } from '../../../shared/models';
import { Seo } from '../../core/seo';
import { BookCard } from '../../ui/book-card/book-card';
import { Rune } from '../../ui/rune/rune';
import { QUESTIONS, SPICE_QUESTION, pickTrope } from './questions';

const MAX_BOOKS = 6;

/**
 * /wyrocznia — quiz „Jaki trop jest dla Ciebie?”. RenderMode.Client (app.routes.server.ts):
 * serwer odsyła pustą skorupę index.csr.html, całą stronę rysuje przeglądarka. Nie ma więc
 * hydracji ani pułapek SSR, ale też nic dla robotów — dlatego tej strony nie ma w sitemap.xml.
 *
 * Stan quizu żyje w sygnałach, a WYNIK w adresie (?wynik=slow-burn&ogien=3). Dzięki temu
 * wynikiem można się podzielić, przeładowanie go nie gubi, a „wstecz” wraca do pytań.
 */
@Component({
  selector: 'app-oracle-page',
  imports: [RouterLink, Rune, BookCard],
  templateUrl: './oracle.html',
  styleUrl: './oracle.scss',
})
export class OraclePage {
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  /** Query params z wynikiem — wstrzyknięte przez withComponentInputBinding(). */
  readonly wynik = input<string>();
  readonly ogien = input<string>();

  protected readonly total = QUESTIONS.length + 1;

  /** Indeksy wybranych odpowiedzi. Zmiana wyniku w adresie (np. „Zapytaj jeszcze raz”) czyści quiz. */
  private readonly answers = linkedSignal<number[]>(() => {
    this.wynik();
    return [];
  });
  protected readonly step = computed(() => this.answers().length);

  /** Bieżące pytanie; po pytaniach o tropy przychodzi pytanie o pikanterię. */
  protected readonly current = computed(() => {
    const q = QUESTIONS[this.step()] ?? SPICE_QUESTION;
    return { title: q.title, labels: q.answers.map((a) => a.label) };
  });

  private readonly heading = viewChild<ElementRef<HTMLElement>>('question');

  protected readonly trope = httpResource<TropeDetail>(() => {
    const slug = this.wynik();
    return slug ? `/api/tropes/${encodeURIComponent(slug)}` : undefined;
  });

  /** Granica ognia z adresu; cokolwiek spoza 0–5 (ręcznie wpisany adres) = bez granicy. */
  protected readonly maxSpice = computed(() => {
    const n = Number(this.ogien());
    return Number.isInteger(n) && n >= 0 && n <= 5 ? n : 5;
  });

  /** Najpierw księgi w granicy ognia (od najbliższych granicy), potem najmniej ją przekraczające. */
  protected readonly books = computed(() => {
    const max = this.maxSpice();
    const books = this.trope.value()?.books ?? [];
    const rank = (spice: number) => (spice <= max ? max - spice : 10 + spice - max);
    return [...books].sort((a, b) => rank(a.spice) - rank(b.spice)).slice(0, MAX_BOOKS);
  });
  protected readonly fits = computed(() => this.books().some((b) => b.spice <= this.maxSpice()));

  constructor() {
    inject(Seo).update({
      title: $localize`:@@oracle.pageTitle:Wyrocznia — jaki trop jest dla Ciebie?`,
      description: $localize`:@@oracle.description:Pięć pytań, a Wyrocznia wskaże Twój trop romantasy i księgi, od których warto zacząć.`,
      path: '/wyrocznia',
    });
  }

  protected choose(index: number): void {
    const answers = [...this.answers(), index];
    if (answers.length < this.total) {
      this.answers.set(answers);
      // Nowe pytanie podmienia treść w tym samym miejscu — przenosimy na nie fokus, żeby czytnik
      // ekranu je odczytał, a fokus klawiatury nie został na usuniętym przycisku.
      afterNextRender(() => this.heading()?.nativeElement.focus(), { injector: this.injector });
      return;
    }
    // Ostatnia odpowiedź: wynik ląduje w adresie, a widok wyniku czyta go stamtąd (input()).
    const spice = SPICE_QUESTION.answers[index].maxSpice;
    void this.router.navigate([], { queryParams: { wynik: pickTrope(answers), ogien: spice } });
  }

  protected back(): void {
    this.answers.update((a) => a.slice(0, -1));
  }
}
