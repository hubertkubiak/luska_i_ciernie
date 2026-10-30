import { REQUEST_CONTEXT, TransferState, inject, makeStateKey } from '@angular/core';
import type { RequestContext } from '../../shared/models';

const DEMO_KEY = makeStateKey<boolean>('demo');

/**
 * Is this a public demo with ephemeral storage (DEMO_MODE=true on the server)?
 * Same pattern as Session: the server reads REQUEST_CONTEXT and writes the answer to TransferState,
 * the browser reads it back — so the hydrated page shows exactly what the server rendered.
 * TransferState lives for the whole browser session, so client-side navigation knows it too.
 * Prerendered pages have no request context → no entry → false.
 */
export function injectDemoMode(): boolean {
  const state = inject(TransferState);
  const context = inject(REQUEST_CONTEXT, { optional: true }) as RequestContext | null;
  if (context) state.set(DEMO_KEY, !!context.demo);
  return state.get(DEMO_KEY, false);
}
