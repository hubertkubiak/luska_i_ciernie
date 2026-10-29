import { httpResource } from '@angular/common/http';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SHELF_STATUSES, type ShelfItem, type ShelfStatus } from '../../../shared/models';
import { Seo } from '../../core/seo';
import { Session } from '../../core/session';
import { STATUS_LABELS, ShelfService } from '../../core/shelf';
import { BookCard } from '../../ui/book-card/book-card';

/** Kolejność sekcji: najpierw to, co czytam teraz. */
const SECTIONS: ShelfStatus[] = ['reading', 'tbr', 'read'];

/**
 * /moja-polka — RenderMode.Client: serwer oddaje pustą „skorupę” aplikacji, a treść powstaje
 * dopiero w przeglądarce. Prywatna strona i tak nie ma wartości dla SEO, a nie musimy renderować
 * na serwerze niczego, co zależy od zalogowanej osoby. Dostęp pilnują dwie warstwy:
 * Express (302 przy wejściu z adresu) i authGuard (nawigacja routerem).
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
  /** Lokalna kopia listy — zmiany widać od razu, bez ponownego pobierania całej półki. */
  protected readonly items = linkedSignal<ShelfItem[]>(() => (this.remote.hasValue() ? this.remote.value() : []));
  protected readonly loading = this.remote.isLoading;
  /** Tytuł książki, której zmiany nie udało się zapisać. */
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
      // Zmiana statusu z „przeczytane” kasuje ocenę — tak samo pilnuje serwer (CHECK w bazie).
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
