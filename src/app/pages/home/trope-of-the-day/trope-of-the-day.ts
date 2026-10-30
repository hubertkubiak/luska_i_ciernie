import { httpResource } from '@angular/common/http';
import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Trope } from '../../../../shared/models';
import { injectRenderDay, pickForDay } from '../../../core/daily';
import { Rune } from '../../../ui/rune/rune';

/**
 * Trope of the day (SPEC §6, pitfall #1). The pick must come out identical on server and browser:
 * - the trope list: from the transfer cache (the same /api/tropes response as on the server),
 * - "today": from TransferState (see injectRenderDay), not from the browser's clock.
 * Math.random() here throws no error — Angular silently replaces the text after hydration.
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
