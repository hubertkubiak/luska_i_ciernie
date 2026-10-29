import { EventPhase } from '@angular/core/primitives/event-dispatch';

/**
 * Czy to zdarzenie odtworzone przez event replay (wydarzyło się PRZED hydracją)?
 *
 * Event replay zapamiętuje zdarzenia sprzed startu aplikacji i po hydracji wywołuje dla nich
 * nasze handlery. Ale przeglądarka swoją domyślną akcję wykonała już wtedy sama — formularz
 * POST został wysłany natywnie i strona właśnie przechodzi na odpowiedź serwera. W handlerze
 * takiego zdarzenia nie wolno więc wołać preventDefault() (Angular rzuci błąd) ani robić tego
 * samego drugi raz (np. drugi zapis przez API).
 */
export function isReplayed(event: Event): boolean {
  return event.eventPhase === EventPhase.REPLAY;
}
