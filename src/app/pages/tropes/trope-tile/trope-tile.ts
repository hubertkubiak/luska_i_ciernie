import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Trope } from '../../../../shared/models';
import { BooksCountPipe } from '../../../ui/books-count.pipe';
import { Rune } from '../../../ui/rune/rune';

/** Kafelek tropu na liście /tropy: runa, nazwa i liczba ksiąg w kolorze krainy. */
@Component({
  selector: 'app-trope-tile',
  imports: [RouterLink, Rune, BooksCountPipe],
  templateUrl: './trope-tile.html',
  styleUrl: './trope-tile.scss',
})
export class TropeTile {
  readonly trope = input.required<Trope>();
}
