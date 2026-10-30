import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SHELF_STATUSES, type ShelfItem, type ShelfStatus } from '../../../shared/models';
import { isReplayed } from '../../core/event-replay';
import { Session } from '../../core/session';
import { STATUS_LABELS, ShelfService } from '../../core/shelf';

/**
 * "Add to shelf" on the book page.
 *
 * SSR already knows the shelf state: forwardSessionInterceptor forwards the session cookie to /api/shelf,
 * and the response travels to the browser in the transfer cache — the button shows the right state at once.
 *
 * A click works at three moments:
 * - without JavaScript and BEFORE hydration: it is a plain <form method="post" action="polka"> — the browser
 *   submits it itself, Express saves and redirects back (303). The click is not lost;
 * - after hydration: we intercept submit and save through the JSON API, without reloading the page.
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

  /** The entry from the API; null = the book is not on the shelf. Anonymous: we do not ask at all. */
  private readonly remote = httpResource<ShelfItem | null>(() => (this.user() ? `/api/shelf/${this.slug()}` : undefined));

  /** Local state: starts from the API response, then clicks change it. */
  protected readonly item = linkedSignal<ShelfItem | null>(() => (this.remote.hasValue() ? this.remote.value() : null));
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);

  protected readonly here = computed(() => `/ksiazka/${this.slug()}`);

  protected async submit(event: SubmitEvent): Promise<void> {
    // A click from before hydration: the browser has already submitted the form — do not save twice.
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
