import { parseCoverDecision } from './cover-consent';

describe('parseCoverDecision', () => {
  it('reads covers=on / covers=off, anything else is "not asked yet"', () => {
    expect(parseCoverDecision('covers=on')).toBe('on');
    expect(parseCoverDecision('theme=parchment; covers=off; sid=x')).toBe('off');
    expect(parseCoverDecision('')).toBeNull();
    expect(parseCoverDecision('covers=onion')).toBeNull();
    expect(parseCoverDecision('nocovers=on')).toBeNull();
  });
});
