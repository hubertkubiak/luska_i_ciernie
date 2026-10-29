import { Component, DestroyRef, afterNextRender, computed, inject, input, signal } from '@angular/core';

/**
 * Tykający zegar do premiery (SPEC §6, pułapka #2). „Teraz” na serwerze i w przeglądarce to
 * różne chwile, więc sekundy policzone w SSR nigdy nie zgadzałyby się z tymi po hydracji.
 * Serwer renderuje więc tylko tekst zależny od DNIA (wspólnego dzięki TransferState),
 * a sekundy zaczynają tykać dopiero w przeglądarce — afterNextRender nie działa na serwerze.
 */
@Component({
  selector: 'app-countdown',
  templateUrl: './countdown.html',
  styleUrl: './countdown.scss',
})
export class Countdown {
  /** Dzień premiery RRRR-MM-DD — liczymy do północy UTC. */
  readonly date = input.required<string>();
  /** Tekst z SSR (np. „jutro”) — widoczny, zanim ruszy zegar, i bez JavaScriptu. */
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
