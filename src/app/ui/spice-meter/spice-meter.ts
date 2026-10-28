import { Component, computed, input } from '@angular/core';

/** Skala pikanterii z SPEC §2.6. */
const SPICE_LABELS = ['Niewinny pocałunek', 'Iskra', 'Żar', 'Płomień', 'Pożoga', 'Smoczy ogień'];

/** 0–5 płomieni. Kolor nie jest jedynym nośnikiem znaczenia: obok jest liczba i nazwa (SPEC §2.3). */
@Component({
  selector: 'app-spice-meter',
  template: `
    <span class="flames" aria-hidden="true">
      @for (lit of flames(); track $index) {
        <svg viewBox="0 0 24 24" [class.lit]="lit">
          <path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 0 2 1 3 2 3 0-3-1-5 1-8z" />
        </svg>
      }
    </span>
    <span class="label">{{ spice() }}/5 · {{ label() }}</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    svg {
      width: 1.1rem;
      height: 1.1rem;
      fill: var(--velvet);
    }
    svg.lit {
      fill: var(--ember);
    }
  `,
})
export class SpiceMeter {
  readonly spice = input.required<number>();

  protected readonly flames = computed(() => Array.from({ length: 5 }, (_, i) => i < this.spice()));
  protected readonly label = computed(() => SPICE_LABELS[this.spice()]);
}
