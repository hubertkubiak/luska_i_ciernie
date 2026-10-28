import { httpResource } from '@angular/common/http';
import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Trope } from '../../../shared/models';
import { Rune } from '../../ui/rune/rune';
import { REALMS } from '../../ui/realm';

/**
 * /tropy — prerenderowana w `ng build` (app.routes.server.ts). Skąd dane, skoro nikt nie
 * uruchomił serwera? Build sam ładuje `reqHandler` eksportowany z src/server.ts, stawia go na
 * losowym porcie i kieruje tam względne żądania — więc /api/tropes trafia do naszego Expressa.
 */
@Component({
  selector: 'app-tropes-page',
  imports: [RouterLink, Rune],
  template: `
    <section class="tropes">
      <p class="label">Księga run</p>
      <h1>Tropy</h1>
      <p class="lead">
        Każdy trop to ścieżka, którą prowadzi opowieść. Wybierz runę, a kronikarka pokaże księgi, które nią
        podążają.
      </p>

      @for (group of groups(); track group.id) {
        <section class="realm" [attr.data-realm]="group.id">
          <h2>{{ group.name }}</h2>
          <ul>
            @for (t of group.tropes; track t.slug) {
              <li>
                <a [routerLink]="['/tropy', t.slug]">
                  <app-rune [trope]="t.slug" />
                  <span class="name">{{ t.name }}</span>
                  <span class="label">{{ t.bookCount }} {{ t.bookCount === 1 ? 'księga' : 'ksiąg' }}</span>
                </a>
              </li>
            }
          </ul>
        </section>
      } @empty {
        <p class="state" role="status">Smok przeszukuje skarbiec…</p>
      }
    </section>
  `,
  styles: `
    .tropes {
      max-width: 64rem;
      margin: 0 auto;
      padding: 3rem clamp(1rem, 4vw, 3rem);
    }
    h1 {
      margin: 0.25rem 0 1rem;
      font-size: clamp(2rem, 5vw, 3rem);
      color: var(--gilt);
    }
    .lead {
      max-width: 42rem;
    }
    .realm {
      --accent: var(--gilt);
      margin-top: 2.5rem;

      &[data-realm='turnie'] {
        --accent: var(--ember);
      }
      &[data-realm='mgly'] {
        --accent: var(--fae);
      }
    }
    h2 {
      color: var(--accent);
    }
    ul {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
      gap: 0.75rem;
      padding: 0;
      list-style: none;
    }
    a {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: 0.25rem 0.75rem;
      padding: 0.9rem 1rem;
      border: 1px solid var(--velvet);
      border-radius: 0.5rem;
      background: var(--surface);
      color: var(--text);
      text-decoration: none;
      transition:
        border-color var(--dur) var(--ease),
        transform var(--dur) var(--ease);

      &:hover,
      &:focus-visible {
        border-color: var(--accent);
        transform: translateY(-2px);
      }
    }
    app-rune {
      grid-row: span 2;
      font-size: 2rem;
      color: var(--accent);
    }
    .name {
      font-family: var(--font-heading);
      font-size: 1.2rem;
      font-weight: 700;
    }
    .state {
      padding: 6rem 1rem;
      text-align: center;
    }
  `,
})
export class TropesPage {
  protected readonly tropes = httpResource<Trope[]>(() => '/api/tropes', { defaultValue: [] });

  protected readonly groups = computed(() =>
    REALMS.map((realm) => ({
      ...realm,
      tropes: this.tropes.value().filter((t) => t.realm === realm.id),
    })).filter((g) => g.tropes.length > 0),
  );
}
