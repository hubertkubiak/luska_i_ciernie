import { DOCUMENT, isPlatformServer } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  REQUEST,
  REQUEST_CONTEXT,
  TransferState,
  afterNextRender,
  computed,
  inject,
  makeStateKey,
  signal,
} from '@angular/core';
import { COVERS_COOKIE, type RequestContext } from '../../shared/models';

/** 'on' = consent, 'off' = declined or withdrawn, null = not asked yet. */
export type CoverDecision = 'on' | 'off' | null;

const DECISION_KEY = makeStateKey<CoverDecision>('coverDecision');
const AVAILABLE_KEY = makeStateKey<boolean>('coversAvailable');

/**
 * Has the reader agreed to real covers from Open Library? Until they do, <app-cover> draws our own
 * covers and the browser makes no request to a third-party server (docs/PRAWNE.md §2).
 *
 * The decision lives in a cookie (like the theme), so the server renders the right covers straight away:
 * - SSR: the cookie from REQUEST → TransferState, so the browser hydrates the same branch;
 * - prerendered pages were built without any cookie (null) — the browser catches up after hydration;
 * - Client-mode pages have no TransferState entry — the browser reads the cookie itself.
 *
 * Changing the decision is a form POST to /okladki (src/server/covers.ts), followed by a full reload.
 */
@Injectable({ providedIn: 'root' })
export class CoverConsent {
  private readonly decision = signal<CoverDecision>(null);

  readonly granted = computed(() => this.decision() === 'on');
  /** Asked already (either answer) — the banner does not come back. */
  readonly decided = computed(() => this.decision() !== null);
  /**
   * Does the server have real covers at all (COVER_SOURCE ≠ none)? If not, there is nothing to consent to
   * and the form hides. Same REQUEST_CONTEXT → TransferState pattern as injectDemoMode().
   */
  readonly available: boolean;

  constructor() {
    const state = inject(TransferState);
    const context = inject(REQUEST_CONTEXT, { optional: true }) as RequestContext | null;
    if (context) state.set(AVAILABLE_KEY, !!context.covers);
    this.available = state.get(AVAILABLE_KEY, false);

    if (isPlatformServer(inject(PLATFORM_ID))) {
      this.decision.set(parseCoverDecision(inject(REQUEST, { optional: true })?.headers.get('cookie') ?? ''));
      state.set(DECISION_KEY, this.decision());
      return;
    }
    const fromCookie = parseCoverDecision(inject(DOCUMENT).cookie);
    if (!state.hasKey(DECISION_KEY)) {
      this.decision.set(fromCookie);
      return;
    }
    // First match the server HTML (hydration), then switch if the prerendered page was built without the cookie.
    this.decision.set(state.get(DECISION_KEY, null));
    if (fromCookie !== this.decision()) afterNextRender(() => this.decision.set(fromCookie));
  }
}

export function parseCoverDecision(cookieHeader: string): CoverDecision {
  const value = new RegExp(`(?:^|;\\s*)${COVERS_COOKIE}=([^;]*)`).exec(cookieHeader)?.[1];
  return value === 'on' || value === 'off' ? value : null;
}
