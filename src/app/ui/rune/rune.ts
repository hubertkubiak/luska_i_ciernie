import { Component, input } from '@angular/core';

/**
 * Runa tropu (SPEC §2.5). Same glify mieszkają w sprite'cie SVG wklejonym do src/index.html,
 * tu tylko odwołujemy się do nich przez <use href="#rune-…">. Sprite jest częścią każdego HTML-a
 * z serwera, więc runy widać od razu — bez JS i bez dodatkowego requestu.
 */
@Component({
  selector: 'app-rune',
  templateUrl: './rune.html',
  styleUrl: './rune.scss',
})
export class Rune {
  /** Slug tropu, np. "enemies-to-lovers". */
  readonly trope = input.required<string>();
}
