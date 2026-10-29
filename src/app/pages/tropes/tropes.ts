import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import type { Trope } from '../../../shared/models';
import { Seo } from '../../core/seo';
import { REALMS } from '../../ui/realm';
import { TropeTile } from './trope-tile/trope-tile';

/**
 * /tropy — prerenderowana w `ng build` (app.routes.server.ts). Skąd dane, skoro nikt nie
 * uruchomił serwera? Build sam ładuje `reqHandler` eksportowany z src/server.ts, stawia go na
 * losowym porcie i kieruje tam względne żądania — więc /api/tropes trafia do naszego Expressa.
 */
@Component({
  selector: 'app-tropes-page',
  imports: [TropeTile],
  templateUrl: './tropes.html',
  styleUrl: './tropes.scss',
})
export class TropesPage {
  protected readonly tropes = httpResource<Trope[]>(() => '/api/tropes', { defaultValue: [] });

  protected readonly groups = computed(() =>
    REALMS.map((realm) => ({
      ...realm,
      tropes: this.tropes.value().filter((t) => t.realm === realm.id),
    })).filter((g) => g.tropes.length > 0),
  );

  constructor() {
    inject(Seo).update({
      title: $localize`:@@title.tropes:Tropy — Łuska i Ciernie`,
      description: $localize`:@@seo.tropesDescription:Katalog tropów romantasy — od więzi przeznaczenia po dwory fae. Każda runa prowadzi do ksiąg, które nią podążają.`,
      path: '/tropy',
    });
  }
}
