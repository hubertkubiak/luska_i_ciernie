import { DOCUMENT } from '@angular/common';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Seo, jsonLdText, summary } from './seo';

describe('Seo', () => {
  function setup(locale: string) {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: locale }] });
    return { seo: TestBed.inject(Seo), doc: TestBed.inject(DOCUMENT) };
  }
  const attr = (doc: Document, selector: string, name: string) => doc.head.querySelector(selector)?.getAttribute(name);

  it('sets canonical, hreflang alternates and Open Graph', () => {
    const { seo, doc } = setup('en');
    seo.update({ title: 'Fourth Wing', description: 'Dragons.', path: '/ksiazka/fourth-wing' });
    const origin = doc.location.origin;

    expect(doc.title).toBe('Fourth Wing | Łuska i Ciernie');
    expect(attr(doc, 'link[rel="canonical"]', 'href')).toBe(`${origin}/en/ksiazka/fourth-wing`);
    expect(attr(doc, 'link[hreflang="pl"]', 'href')).toBe(`${origin}/ksiazka/fourth-wing`);
    expect(attr(doc, 'link[hreflang="x-default"]', 'href')).toBe(`${origin}/ksiazka/fourth-wing`);
    expect(attr(doc, 'meta[property="og:locale"]', 'content')).toBe('en_US');
    expect(attr(doc, 'meta[property="og:image"]', 'content')).toBe(`${origin}/en/og-default.png`);
  });

  it('replaces data of the previous page instead of piling it up', () => {
    const { seo, doc } = setup('pl');
    seo.update({ title: 'A', description: 'a', path: '/a', jsonLd: { '@type': 'Book', name: 'A' } });
    seo.update({ title: 'B', description: 'b', path: '/b' });
    expect(doc.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(doc.head.querySelector('script#ld-json')).toBeNull();
  });

  it('noindex pages get robots meta and no canonical', () => {
    const { seo, doc } = setup('pl');
    seo.update({ title: '404', description: 'x', path: '/nie-ma', noindex: true });
    expect(attr(doc, 'meta[name="robots"]', 'content')).toBe('noindex, follow');
    expect(doc.head.querySelector('link[rel="canonical"]')).toBeNull();
  });
});

describe('seo helpers', () => {
  it('jsonLdText cannot close the <script> tag', () => {
    const text = jsonLdText({ name: '</script><script>alert(1)</script>' });
    expect(text).not.toContain('</script>');
    expect(JSON.parse(text).name).toBe('</script><script>alert(1)</script>');
  });

  it('summary cuts on a word boundary', () => {
    const long = 'słowo '.repeat(50).trim();
    const s = summary(long);
    expect(s.length).toBeLessThanOrEqual(160);
    expect(s.endsWith('…')).toBe(true);
    expect(s).not.toMatch(/ …$/);
    expect(summary('krótko')).toBe('krótko');
  });
});
