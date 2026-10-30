import { EventPhase } from '@angular/core/primitives/event-dispatch';

/**
 * Is this an event replayed by event replay (did it happen BEFORE hydration)?
 *
 * Event replay records events from before the app started and calls our handlers for them after
 * hydration. But the browser has already performed its default action by itself — a POST form
 * was submitted natively and the page is navigating to the server's response. In the handler
 * of such an event you must not call preventDefault() (Angular throws) nor do the same thing
 * a second time (e.g. a second save through the API).
 */
export function isReplayed(event: Event): boolean {
  return event.eventPhase === EventPhase.REPLAY;
}
