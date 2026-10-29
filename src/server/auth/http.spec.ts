import type { Request } from 'express';
import { RateLimiter, isSameOrigin, readCookie, safeNext } from './http';

const req = (headers: Record<string, string>) =>
  ({ headers, protocol: 'http', get: (name: string) => headers[name.toLowerCase()] }) as unknown as Request;

describe('auth http helpers', () => {
  it('safeNext keeps local paths and drops everything that leaves the site', () => {
    expect(safeNext('/tropy/slow-burn')).toBe('/tropy/slow-burn');
    for (const evil of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', '', undefined, 42]) {
      expect(safeNext(evil)).toBe('/moja-polka');
    }
  });

  it('readCookie finds a cookie among others', () => {
    expect(readCookie(req({ cookie: 'theme=night; sid=abc%3D; x=1' }), 'sid')).toBe('abc=');
    expect(readCookie(req({}), 'sid')).toBeUndefined();
  });

  it('isSameOrigin rejects a foreign Origin and allows a missing one', () => {
    expect(isSameOrigin(req({ host: 'localhost:4000', origin: 'http://localhost:4000' }))).toBe(true);
    expect(isSameOrigin(req({ host: 'localhost:4000', origin: 'https://evil.example' }))).toBe(false);
    expect(isSameOrigin(req({ host: 'localhost:4000' }))).toBe(true);
  });

  it('RateLimiter allows N attempts per window, then blocks until it resets', () => {
    const limit = new RateLimiter(2, 1000);
    expect([limit.take('k', 0), limit.take('k', 1), limit.take('k', 2)]).toEqual([true, true, false]);
    expect(limit.take('inny', 2)).toBe(true);
    expect(limit.take('k', 1001)).toBe(true);
  });
});
