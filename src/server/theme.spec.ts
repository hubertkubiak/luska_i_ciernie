import { withTheme } from './theme';

const page = (theme = 'night') =>
  new Response(`<!doctype html><html lang="pl" data-theme="${theme}" dir="ltr"><body>data-theme="night"</body></html>`, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'content-length': '999' },
  });

describe('withTheme', () => {
  it('fixes data-theme on <html> only — not other occurrences in the page', async () => {
    const html = await (await withTheme(page(), 'parchment')).text();
    expect(html).toContain('<html lang="pl" data-theme="parchment" dir="ltr">');
    expect(html).toContain('<body>data-theme="night"</body>');
  });

  it('drops the stale Content-Length (the body changed)', async () => {
    expect((await withTheme(page(), 'parchment')).headers.get('content-length')).toBeNull();
  });

  it('leaves the default theme and non-HTML responses untouched (no buffering)', async () => {
    const original = page();
    expect(await withTheme(original, 'night')).toBe(original);
    const json = new Response('{}', { headers: { 'content-type': 'application/json' } });
    expect(await withTheme(json, 'parchment')).toBe(json);
  });
});
