import { NgOptimizedImage } from '@angular/common';
import { Component, input } from '@angular/core';
import type { BookSummary } from '../../../shared/models';
import { Rune } from '../rune/rune';

/**
 * A book cover. The real one (NgOptimizedImage) when the API gave a coverUrl, or our own,
 * generated one (SPEC §2.9): realm background, the main trope's rune, title and author. The generated
 * one infringes nobody's rights and does not send the reader's IP address to a third-party server
 * (COVER_SOURCE=none, see docs/PRAWNE.md).
 */
@Component({
  selector: 'app-cover',
  imports: [NgOptimizedImage, Rune],
  templateUrl: './cover.html',
  styleUrl: './cover.scss',
  // The same name on the card and on the book page → the View Transition "carries" the cover between them.
  // The name must be unique on a page; every book appears on a list at most once,
  // and "Kindred paths" never include the current one. (A prefix, because the name is a CSS identifier.)
  host: { '[style.view-transition-name]': "'cover-' + book().slug" },
})
export class Cover {
  readonly book = input.required<BookSummary>();
  readonly width = input.required<number>();
  readonly height = input.required<number>();
  /** The page's LCP image — Angular adds <link rel="preload"> to <head> already on the server. */
  readonly priority = input(false);
  /** Empty = decoration (the title is right next to it, a screen reader need not read it twice). */
  readonly alt = input('');
}
