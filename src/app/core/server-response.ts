import { Injectable, RESPONSE_INIT, inject } from '@angular/core';

/**
 * Jedyne miejsce w aplikacji, które dotyka RESPONSE_INIT.
 *
 * RESPONSE_INIT to zwykły obiekt `ResponseInit` (status + nagłówki), który AngularNodeAppEngine
 * zamienia w odpowiedź HTTP po zakończeniu renderu. Istnieje tylko w trybie RenderMode.Server —
 * w przeglądarce (i przy prerenderze) wstrzykniemy null, więc metody są wtedy no-opami.
 *
 * Kiedy status „zdąży”? Silnik czeka na `ApplicationRef.whenStable()` — czyli także na
 * zakończone requesty HTTP i efekty — zanim zbuduje Response. Status ustawiony w efekcie
 * po odpowiedzi API jest więc jeszcze brany pod uwagę.
 */
@Injectable({ providedIn: 'root' })
export class ServerResponse {
  private readonly init = inject(RESPONSE_INIT, { optional: true });

  setStatus(status: number): void {
    if (this.init) this.init.status = status;
  }
}
