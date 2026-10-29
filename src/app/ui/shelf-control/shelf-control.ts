import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SHELF_STATUSES, type ShelfItem, type ShelfStatus } from '../../../shared/models';
import { isReplayed } from '../../core/event-replay';
import { Session } from '../../core/session';
import { STATUS_LABELS, ShelfService } from '../../core/shelf';

/**
 * „Dodaj do półki” na stronie książki.
 *
 * Stan półki zna już SSR: forwardSessionInterceptor przekazuje ciasteczko sesji do /api/shelf,
 * a odpowiedź jedzie do przeglądarki w transfer cache — przycisk od razu pokazuje właściwy stan.
 *
 * Kliknięcie działa w trzech chwilach:
 * - bez JavaScriptu i PRZED hydracją: to zwykły <form method="post" action="polka"> — przeglądarka
 *   wysyła go sama, Express zapisuje i odsyła z powrotem (303). Kliknięcie nie ginie;
 * - po hydracji: przechwytujemy submit i zapisujemy przez JSON API, bez przeładowania strony.
 */
@Component({
  selector: 'app-shelf-control',
  imports: [RouterLink],
  templateUrl: './shelf-control.html',
  styleUrl: './shelf-control.scss',
})
export class ShelfControl {
  readonly slug = input.required<string>();

  private readonly shelf = inject(ShelfService);
  protected readonly user = inject(Session).user;
  protected readonly statuses = SHELF_STATUSES;
  protected readonly labels = STATUS_LABELS;

  /** Pozycja z API; null = książki nie ma na półce. Anonim: nie pytamy wcale. */
  private readonly remote = httpResource<ShelfItem | null>(() => (this.user() ? `/api/shelf/${this.slug()}` : undefined));

  /** Lokalny stan: startuje z odpowiedzi API, potem zmieniają go kliknięcia. */
  protected readonly item = linkedSignal<ShelfItem | null>(() => (this.remote.hasValue() ? this.remote.value() : null));
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);

  protected readonly here = computed(() => `/ksiazka/${this.slug()}`);

  protected async submit(event: SubmitEvent): Promise<void> {
    // Kliknięcie sprzed hydracji: przeglądarka już wysłała formularz sama — nie zapisujemy drugi raz.
    if (isReplayed(event)) return;
    event.preventDefault();
    const button = event.submitter as HTMLButtonElement | null;
    if (!button || this.saving()) return;
    this.saving.set(true);
    this.failed.set(false);
    try {
      if (button.name === 'remove') {
        await this.shelf.remove(this.slug());
        this.item.set(null);
      } else {
        const current = this.item();
        this.item.set(
          await this.shelf.save(this.slug(), {
            status: button.value as ShelfStatus,
            rating: current?.rating ?? null,
            note: current?.note ?? null,
          }),
        );
      }
    } catch {
      this.failed.set(true);
    } finally {
      this.saving.set(false);
    }
  }
}
