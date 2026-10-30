import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import type { Trope } from '../../../shared/models';
import { Seo } from '../../core/seo';
import { REALMS } from '../../ui/realm';
import { TropeTile } from './trope-tile/trope-tile';

/**
 * /tropy — prerendered in `ng build` (app.routes.server.ts). Where does the data come from if nobody
 * started the server? The build loads the `reqHandler` exported from src/server.ts, runs it on a
 * random port and sends relative requests there — so /api/tropes reaches our Express.
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
