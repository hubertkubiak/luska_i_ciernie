import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ShelfEntry, ShelfItem, ShelfStatus } from '../../shared/models';

/** Saving the shelf from the browser (JSON API). Components read it via httpResource. */
@Injectable({ providedIn: 'root' })
export class ShelfService {
  private readonly http = inject(HttpClient);

  save(slug: string, entry: ShelfEntry): Promise<ShelfItem> {
    return firstValueFrom(this.http.put<ShelfItem>(`/api/shelf/${slug}`, entry));
  }

  remove(slug: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/shelf/${slug}`));
  }
}

export const STATUS_LABELS: Record<ShelfStatus, string> = {
  tbr: $localize`:@@shelf.tbr:Do przeczytania`,
  reading: $localize`:@@shelf.reading:Czytam`,
  read: $localize`:@@shelf.read:Przeczytane`,
};
