import { Component, afterNextRender, signal } from '@angular/core';

interface Spark {
  left: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
}

/**
 * Floating sparks in the hero (SPEC §2.7). Random positions are fine here, because they are created
 * ONLY in the browser: the server renders an empty container, and afterNextRender fires only
 * after the first render on the client (i.e. after hydration) and never on the server.
 * Hydration therefore compares an empty container with an empty container.
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
      // matchMedia exists only in the browser — allowed here, because this code never runs on the server.
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
