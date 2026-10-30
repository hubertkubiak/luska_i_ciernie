import type { Request, Response } from 'express';
import { PRERENDER_ORIGIN } from '../shared/models';
import { allowedHosts, isDemo, publicOrigin, securityHeaders, trustProxy, withPublicOrigin } from './production';

describe('production config', () => {
  it('trustProxy: hop count, true, or off for anything unexpected', () => {
    expect(trustProxy(undefined)).toBe(false);
    expect(trustProxy('')).toBe(false);
    expect(trustProxy('1')).toBe(1);
    expect(trustProxy('true')).toBe(true);
    expect(trustProxy('yes')).toBe(false);
    expect(trustProxy('-1')).toBe(false);
  });

  it('allowedHosts merges NG_ALLOWED_HOSTS with the Render hostname', () => {
    expect(allowedHosts({})).toBeUndefined();
    expect(allowedHosts({ NG_ALLOWED_HOSTS: 'a.example, b.example' })).toEqual(['a.example', 'b.example']);
    expect(allowedHosts({ NG_ALLOWED_HOSTS: 'a.example', RENDER_EXTERNAL_HOSTNAME: 'luska.onrender.com' })).toEqual([
      'a.example',
      'luska.onrender.com',
    ]);
  });

  it('publicOrigin prefers PUBLIC_ORIGIN, falls back to the Render URL, drops a trailing slash', () => {
    expect(publicOrigin({})).toBeUndefined();
    expect(publicOrigin({ RENDER_EXTERNAL_URL: 'https://luska.onrender.com/' })).toBe('https://luska.onrender.com');
    expect(publicOrigin({ PUBLIC_ORIGIN: 'https://luska.pl', RENDER_EXTERNAL_URL: 'https://x.onrender.com' })).toBe(
      'https://luska.pl',
    );
  });

  it('isDemo only for an explicit "true"', () => {
    expect(isDemo('true')).toBe(true);
    expect(isDemo('1')).toBe(false);
    expect(isDemo(undefined)).toBe(false);
  });

  it('securityHeaders: always the basics, HSTS only over HTTPS', () => {
    const run = (secure: boolean) => {
      const headers: Record<string, string> = {};
      const res = {
        set(name: string | Record<string, string>, value?: string) {
          Object.assign(headers, typeof name === 'string' ? { [name]: value } : name);
          return this;
        },
      } as unknown as Response;
      let called = false;
      securityHeaders()({ secure } as Request, res, () => (called = true));
      expect(called).toBe(true);
      return headers;
    };

    const plain = run(false);
    expect(plain['X-Content-Type-Options']).toBe('nosniff');
    expect(plain['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(plain['Strict-Transport-Security']).toBeUndefined();
    expect(run(true)['Strict-Transport-Security']).toContain('max-age=');
  });

  it('withPublicOrigin puts the real origin into prerendered HTML and leaves other responses alone', async () => {
    const html = `<link rel="canonical" href="${PRERENDER_ORIGIN}/tropy"><meta property="og:url" content="${PRERENDER_ORIGIN}/en/tropy">`;
    const page = new Response(html, { headers: { 'content-type': 'text/html', 'content-length': String(html.length) } });
    const out = await withPublicOrigin(page, 'https://luska.onrender.com');
    const text = await out.text();
    expect(text).toContain('href="https://luska.onrender.com/tropy"');
    expect(text).toContain('content="https://luska.onrender.com/en/tropy"');
    expect(text).not.toContain(PRERENDER_ORIGIN);
    expect(out.headers.get('content-length')).toBeNull();

    const json = new Response('{}', { headers: { 'content-type': 'application/json' } });
    expect(await withPublicOrigin(json, 'https://x')).toBe(json);
  });
});
