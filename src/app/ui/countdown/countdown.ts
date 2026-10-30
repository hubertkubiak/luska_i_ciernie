import { Component, DestroyRef, afterNextRender, computed, inject, input, signal } from '@angular/core';

/**
 * A ticking clock to a release (SPEC §6, pitfall #2). "Now" on the server and in the browser are
 * different moments, so seconds computed during SSR would never match those after hydration.
 * The server therefore renders only text that depends on the DAY (shared thanks to TransferState),
 * and the seconds start ticking only in the browser — afterNextRender does not run on the server.
 */
@Component({
  selector: 'app-countdown',
  templateUrl: './countdown.html',
  styleUrl: './countdown.scss',
})
export class Countdown {
  /** Release day YYYY-MM-DD — we count to midnight UTC. */
  readonly date = input.required<string>();
  /** Text from SSR (e.g. "tomorrow") — visible before the clock starts, and without JavaScript. */
  readonly label = input.required<string>();

  private readonly now = signal<number | null>(null);

  protected readonly remaining = computed(() => {
    const now = this.now();
    if (now === null) return null;
    const ms = Date.parse(`${this.date()}T00:00:00Z`) - now;
    if (ms <= 0) return null;
    const s = Math.floor(ms / 1000);
    return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const tick = () => this.now.set(Date.now());
      tick();
      const id = setInterval(tick, 1000);
      destroyRef.onDestroy(() => clearInterval(id));
    });
  }
}
