import { Component, afterNextRender, signal } from '@angular/core';

interface Spark {
  left: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
}

/**
 * Unoszące się iskry w hero (SPEC §2.7). Losowe pozycje są tu w porządku, bo powstają
 * WYŁĄCZNIE w przeglądarce: serwer renderuje pusty kontener, a afterNextRender odpala się
 * dopiero po pierwszym renderze na kliencie (czyli po hydracji) i nigdy na serwerze.
 * Hydracja porównuje więc pusty kontener z pustym kontenerem.
 */
@Component({
  selector: 'app-sparks',
  templateUrl: './sparks.html',
  styleUrl: './sparks.scss',
})
export class Sparks {
  protected readonly sparks = signal<Spark[]>([]);

  constructor() {
    afterNextRender(() => {
      // matchMedia istnieje tylko w przeglądarce — tutaj wolno, bo ten kod nie biegnie na serwerze.
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      this.sparks.set(
        Array.from({ length: 18 }, () => ({
          left: Math.random() * 100,
          size: 2 + Math.random() * 3,
          delay: Math.random() * 8,
          duration: 6 + Math.random() * 6,
          drift: (Math.random() - 0.5) * 120,
        })),
      );
    });
  }
}
