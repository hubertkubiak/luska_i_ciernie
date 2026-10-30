import { Component, input } from '@angular/core';

/**
 * A trope rune (SPEC §2.5). The glyphs themselves live in the SVG sprite pasted into src/index.html,
 * here we only reference them via <use href="#rune-…">. The sprite is part of every HTML page
 * from the server, so runes are visible at once — without JS and without an extra request.
 */
@Component({
  selector: 'app-rune',
  templateUrl: './rune.html',
  styleUrl: './rune.scss',
})
export class Rune {
  /** Trope slug, e.g. "enemies-to-lovers". */
  readonly trope = input.required<string>();
}
