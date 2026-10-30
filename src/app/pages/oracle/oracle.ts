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
 * /wyrocznia — the quiz "Which trope is yours?". RenderMode.Client (app.routes.server.ts):
 * the server sends the empty index.csr.html shell, the browser draws the whole page. So there is no
 * hydration and no SSR pitfalls, but nothing for crawlers either — that is why it is not in sitemap.xml.
 *
 * Quiz state lives in signals, the RESULT in the URL (?wynik=slow-burn&ogien=3). That way
 * the result can be shared, a reload keeps it, and "back" returns to the questions.
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

  /** Query params with the result — injected by withComponentInputBinding(). */
  readonly wynik = input<string>();
  readonly ogien = input<string>();

  protected readonly total = QUESTIONS.length + 1;

  /** Indexes of the chosen answers. A change of the result in the URL (e.g. "Ask again") clears the quiz. */
  private readonly answers = linkedSignal<number[]>(() => {
    this.wynik();
    return [];
  });
  protected readonly step = computed(() => this.answers().length);

  /** The current question; after the trope questions comes the spice question. */
  protected readonly current = computed(() => {
    const q = QUESTIONS[this.step()] ?? SPICE_QUESTION;
    return { title: q.title, labels: q.answers.map((a) => a.label) };
  });

  private readonly heading = viewChild<ElementRef<HTMLElement>>('question');

  protected readonly trope = httpResource<TropeDetail>(() => {
    const slug = this.wynik();
    return slug ? `/api/tropes/${encodeURIComponent(slug)}` : undefined;
  });

  /** Spice limit from the URL; anything outside 0–5 (a hand-typed URL) = no limit. */
  protected readonly maxSpice = computed(() => {
    const n = Number(this.ogien());
    return Number.isInteger(n) && n >= 0 && n <= 5 ? n : 5;
  });

  /** Books within the spice limit first (closest to the limit first), then those exceeding it least. */
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
      // The new question replaces the content in the same place — move focus to it, so a screen
      // reader reads it and keyboard focus does not stay on a removed button.
      afterNextRender(() => this.heading()?.nativeElement.focus(), { injector: this.injector });
      return;
    }
    // The last answer: the result goes into the URL, and the result view reads it from there (input()).
    const spice = SPICE_QUESTION.answers[index].maxSpice;
    void this.router.navigate([], { queryParams: { wynik: pickTrope(answers), ogien: spice } });
  }

  protected back(): void {
    this.answers.update((a) => a.slice(0, -1));
  }
}
