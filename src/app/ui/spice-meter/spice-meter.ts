import { Component, computed, input } from '@angular/core';

/** The spice scale from SPEC §2.6. */
const SPICE_LABELS = [
  $localize`:@@spice.0:Niewinny pocałunek`,
  $localize`:@@spice.1:Iskra`,
  $localize`:@@spice.2:Żar`,
  $localize`:@@spice.3:Płomień`,
  $localize`:@@spice.4:Pożoga`,
  $localize`:@@spice.5:Smoczy ogień`,
];

/** 0–5 flames. Colour is not the only carrier of meaning: the number and name are next to it (SPEC §2.3). */
@Component({
  selector: 'app-spice-meter',
  templateUrl: './spice-meter.html',
  styleUrl: './spice-meter.scss',
})
export class SpiceMeter {
  readonly spice = input.required<number>();

  protected readonly flames = computed(() => Array.from({ length: 5 }, (_, i) => i < this.spice()));
  protected readonly label = computed(() => SPICE_LABELS[this.spice()]);
}
