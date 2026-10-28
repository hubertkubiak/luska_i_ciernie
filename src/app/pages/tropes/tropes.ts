import { httpResource } from '@angular/common/http';
import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Trope } from '../../../shared/models';
import { Rune } from '../../ui/rune/rune';
import { REALMS } from '../../ui/realm';
import { books } from '../../ui/plural';

/**
 * /tropy — prerenderowana w `ng build` (app.routes.server.ts). Skąd dane, skoro nikt nie
 * uruchomił serwera? Build sam ładuje `reqHandler` eksportowany z src/server.ts, stawia go na
 * losowym porcie i kieruje tam względne żądania — więc /api/tropes trafia do naszego Expressa.
 */
@Component({
  selector: 'app-tropes-page',
  imports: [RouterLink, Rune],
  templateUrl: './tropes.html',
  styleUrl: './tropes.scss',
})
export class TropesPage {
  protected readonly booksWord = books;

  protected readonly tropes = httpResource<Trope[]>(() => '/api/tropes', { defaultValue: [] });

  protected readonly groups = computed(() =>
    REALMS.map((realm) => ({
      ...realm,
      tropes: this.tropes.value().filter((t) => t.realm === realm.id),
    })).filter((g) => g.tropes.length > 0),
  );
}
