import { httpResource } from '@angular/common/http';
import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Trope } from '../../../../shared/models';
import { injectRenderDay, pickForDay } from '../../../core/daily';
import { Rune } from '../../../ui/rune/rune';

/**
 * Trop dnia (SPEC §6, pułapka #1). Wybór musi wyjść identycznie na serwerze i w przeglądarce:
 * - lista tropów: z transfer cache (ta sama odpowiedź /api/tropes, co na serwerze),
 * - „dzisiaj”: z TransferState (patrz injectRenderDay), a nie z zegara przeglądarki.
 * Math.random() w tym miejscu nie rzuca błędu — Angular po cichu podmienia tekst po hydracji.
 */
@Component({
  selector: 'app-trope-of-the-day',
  imports: [RouterLink, Rune],
  templateUrl: './trope-of-the-day.html',
  styleUrl: './trope-of-the-day.scss',
})
export class TropeOfTheDay {
  private readonly tropes = httpResource<Trope[]>(() => '/api/tropes', { defaultValue: [] });

  protected readonly day = injectRenderDay();

  protected readonly trope = computed(() => {
    const all = this.tropes.value();
    return all.length ? all[pickForDay(this.day, all.length)] : undefined;
  });
}
