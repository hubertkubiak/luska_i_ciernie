import { httpResource } from '@angular/common/http';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SHELF_STATUSES, type ShelfItem, type ShelfStatus } from '../../../shared/models';
import { Seo } from '../../core/seo';
import { Session } from '../../core/session';
import { STATUS_LABELS, ShelfService } from '../../core/shelf';
import { BookCard } from '../../ui/book-card/book-card';

/** Section order: what I am reading now comes first. */
const SECTIONS: ShelfStatus[] = ['reading', 'tbr', 'read'];

/**
 * /moja-polka — RenderMode.Client: the server returns an empty app "shell" and the content is made
 * only in the browser. A private page has no SEO value anyway, and we need not render anything
 * that depends on the signed-in person on the server. Access is guarded in two layers:
 * Express (302 when opened by URL) and authGuard (router navigation).
 */
@Component({
  selector: 'app-shelf-page',
  imports: [RouterLink, BookCard],
  templateUrl: './shelf.html',
  styleUrl: './shelf.scss',
})
export class ShelfPage {
  private readonly shelf = inject(ShelfService);
  protected readonly user = inject(Session).user;
  protected readonly statuses = SHELF_STATUSES;
  protected readonly labels = STATUS_LABELS;
  protected readonly ratings = [1, 2, 3, 4, 5];

  private readonly remote = httpResource<ShelfItem[]>(() => '/api/shelf');
  /** A local copy of the list — changes show at once, without refetching the whole shelf. */
  protected readonly items = linkedSignal<ShelfItem[]>(() => (this.remote.hasValue() ? this.remote.value() : []));
  protected readonly loading = this.remote.isLoading;
  /** Title of the book whose change could not be saved. */
  protected readonly failed = signal<string | null>(null);

  protected readonly sections = computed(() =>
    SECTIONS.map((status) => ({ status, items: this.items().filter((i) => i.status === status) })).filter(
      (s) => s.items.length > 0,
    ),
  );

  constructor() {
    inject(Seo).update({
      title: $localize`:@@nav.shelf:Skarbiec`,
      description: $localize`:@@nav.shelfMeaning:Twoje książki`,
      path: '/moja-polka',
      noindex: true,
    });
  }

  protected setStatus(item: ShelfItem, status: string): Promise<void> {
    return this.save(item, { status: status as ShelfStatus });
  }

  protected setRating(item: ShelfItem, rating: string): Promise<void> {
    return this.save(item, { rating: rating ? Number(rating) : null });
  }

  protected setNote(item: ShelfItem, note: string): Promise<void> {
    return note.trim() === (item.note ?? '') ? Promise.resolve() : this.save(item, { note });
  }

  protected remove(item: ShelfItem): Promise<void> {
    return this.run(item, async () => {
      await this.shelf.remove(item.slug);
      this.items.update((list) => list.filter((i) => i.slug !== item.slug));
    });
  }

  private save(item: ShelfItem, change: Partial<ShelfItem>): Promise<void> {
    return this.run(item, async () => {
      const next = { ...item, ...change };
      // Changing the status away from "read" clears the rating — the server enforces the same (CHECK in the database).
      const saved = await this.shelf.save(item.slug, {
        status: next.status,
        rating: next.status === 'read' ? next.rating : null,
        note: next.note,
      });
      this.items.update((list) => list.map((i) => (i.slug === saved.slug ? saved : i)));
    });
  }

  private async run(item: ShelfItem, action: () => Promise<void>): Promise<void> {
    this.failed.set(null);
    try {
      await action();
    } catch {
      this.failed.set(item.book.title);
    }
  }
}
