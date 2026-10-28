import { Component, input } from '@angular/core';

/**
 * Runa tropu (SPEC §2.5). Same glify mieszkają w sprite'cie SVG wklejonym do src/index.html,
 * tu tylko odwołujemy się do nich przez <use href="#rune-…">. Sprite jest częścią każdego HTML-a
 * z serwera, więc runy widać od razu — bez JS i bez dodatkowego requestu.
 */
@Component({
  selector: 'app-rune',
  template: `<svg aria-hidden="true" focusable="false"><use [attr.href]="'#rune-' + trope()" /></svg>`,
  styles: `
    :host {
      display: inline-flex;
      width: 1.1em;
      height: 1.1em;
      flex: none;
    }
    svg {
      width: 100%;
      height: 100%;
      /* Właściwości dziedziczone przechodzą do wnętrza <use>, więc glify w sprite'cie
         nie muszą mieć własnych kolorów — przejmują currentColor z miejsca użycia. */
      fill: none;
      stroke: currentColor;
      stroke-width: 1.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
})
export class Rune {
  /** Slug tropu, np. "enemies-to-lovers". */
  readonly trope = input.required<string>();
}
