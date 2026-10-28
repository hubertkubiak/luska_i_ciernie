import { NgOptimizedImage } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { BookSummary } from '../../../shared/models';
import { SpiceMeter } from '../spice-meter/spice-meter';

/** Karta książki do list (autor, tropy, wyniki wyszukiwania). */
@Component({
  selector: 'app-book-card',
  imports: [RouterLink, NgOptimizedImage, SpiceMeter],
  template: `
    @let b = book();
    <a class="card" [routerLink]="['/ksiazka', b.slug]">
      <!-- bez priority: okładki na listach ładują się leniwie (loading="lazy") -->
      <img [ngSrc]="b.coverUrl" width="120" height="180" [alt]="''" />
      <span class="title">{{ b.title }}</span>
      <span class="label">
        {{ b.year }}
        @if (b.series) {
          · {{ b.series.name }} #{{ b.series.index }}
        }
      </span>
      <app-spice-meter [spice]="b.spice" />
    </a>
  `,
  styles: `
    .card {
      display: grid;
      justify-items: start;
      gap: 0.35rem;
      padding: 1rem;
      background: var(--surface);
      border: 1px solid var(--velvet);
      color: var(--text);
      text-decoration: none;
      transition:
        transform var(--dur) var(--ease),
        box-shadow var(--dur) var(--ease);
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 0 1.5rem color-mix(in srgb, var(--ember) 30%, transparent);
    }
    img {
      width: 120px;
      height: 180px;
      object-fit: cover;
      border: 1px solid var(--gilt);
    }
    .title {
      font-family: var(--font-heading);
      font-weight: 700;
      font-size: 1.2rem;
      line-height: 1.2;
    }
    app-spice-meter {
      font-size: 0.8rem;
    }
  `,
})
export class BookCard {
  readonly book = input.required<BookSummary>();
}
