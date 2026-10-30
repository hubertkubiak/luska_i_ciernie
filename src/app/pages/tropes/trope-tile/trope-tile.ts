import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Trope } from '../../../../shared/models';
import { BooksCountPipe } from '../../../ui/books-count.pipe';
import { Rune } from '../../../ui/rune/rune';

/** A trope tile on the /tropy list: rune, name and book count in the realm's colour. */
@Component({
  selector: 'app-trope-tile',
  imports: [RouterLink, Rune, BooksCountPipe],
  templateUrl: './trope-tile.html',
  styleUrl: './trope-tile.scss',
})
export class TropeTile {
  readonly trope = input.required<Trope>();
}
