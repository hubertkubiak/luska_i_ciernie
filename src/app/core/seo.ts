import { DOCUMENT, isPlatformServer } from '@angular/common';
import { Injectable, LOCALE_ID, PLATFORM_ID, REQUEST_CONTEXT, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { LANG_PREFIX, LANGS, PRERENDER_ORIGIN, type Lang } from '../../shared/models';

export const SITE_NAME = 'Łuska i Ciernie';

const OG_LOCALE: Record<Lang, string> = { pl: 'pl_PL', en: 'en_US' };

export interface PageMeta {
  /** Page title without the site name (added automatically), unless it already contains it. */
  title: string;
  description: string;
  /** App path WITHOUT the language prefix, with the query string, e.g. "/szukaj?trop=slow-burn". */
  path: string;
  /** Link preview image (absolute URL). Missing = the site's default image. */
  image?: string | null;
  type?: 'website' | 'book' | 'profile';
  /** schema.org structured data — goes into <script type="application/ld+json">. */
  jsonLd?: object;
  /** Pages we do not want in search results (e.g. 404). */
  noindex?: boolean;
  /** The page's RSS feed — feed readers discover it via <link rel="alternate">. */
  feed?: { title: string; path: string };
}

/**
 * The whole SEO <head> in one place: title, description, canonical, hreflang, Open Graph, robots
 * and JSON-LD. Pages call update() once they have data — on the server that happens before
 * rendering finishes (whenStable), so everything is in the HTML seen by search engines
 * and messenger link previews (which do not run JavaScript).
 */
@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly doc = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly lang = currentLang(inject(LOCALE_ID));
  /** On the server without a request (prerendering in `ng build`) the real address is unknown. */
  private readonly origin =
    isPlatformServer(inject(PLATFORM_ID)) && !inject(REQUEST_CONTEXT, { optional: true })
      ? PRERENDER_ORIGIN
      : this.doc.location.origin;

  update(page: PageMeta): void {
    const fullTitle = page.title.includes(SITE_NAME) ? page.title : `${page.title} | ${SITE_NAME}`;
    const url = this.link(page.path);
    const image = page.image ?? this.link('/og-default.png');

    this.title.setTitle(fullTitle);
    this.setMeta('name', 'description', page.description);
    this.setMeta('name', 'robots', page.noindex ? 'noindex, follow' : 'index, follow');

    // Canonical URL and its equivalents in other languages. A noindex page has neither.
    this.removeLinks('link[rel="canonical"], link[rel="alternate"][hreflang]');
    if (!page.noindex) {
      this.addLink({ rel: 'canonical', href: url });
      for (const lang of LANGS) this.addLink({ rel: 'alternate', hreflang: lang, href: this.url(lang, page.path) });
      this.addLink({ rel: 'alternate', hreflang: 'x-default', href: this.url(LANGS[0], page.path) });
    }

    this.setMeta('property', 'og:site_name', SITE_NAME);
    this.setMeta('property', 'og:title', page.title);
    this.setMeta('property', 'og:description', page.description);
    this.setMeta('property', 'og:type', page.type ?? 'website');
    this.setMeta('property', 'og:url', url);
    this.setMeta('property', 'og:image', image);
    this.setMeta('property', 'og:locale', OG_LOCALE[this.lang]);
    this.meta.getTags('property="og:locale:alternate"').forEach((t) => this.meta.removeTagElement(t));
    for (const lang of LANGS) {
      if (lang !== this.lang) this.meta.addTag({ property: 'og:locale:alternate', content: OG_LOCALE[lang] });
    }
    // Covers are portrait → small card; the default image is wide (1200×630) → large card.
    this.setMeta('name', 'twitter:card', page.image ? 'summary' : 'summary_large_image');

    this.removeLinks('link[rel="alternate"][type="application/rss+xml"]');
    if (page.feed) {
      this.addLink({ rel: 'alternate', type: 'application/rss+xml', title: page.feed.title, href: this.link(page.feed.path) });
    }

    this.setJsonLd(page.jsonLd);
  }

  /** Absolute URL of a path in the current language version. */
  link(path: string): string {
    return this.url(this.lang, path);
  }

  /**
   * Absolute URL of a path in a given language. Origin = the request's address (validated by
   * allowedHosts), or PRERENDER_ORIGIN in prerendered pages — Express replaces it (withPublicOrigin).
   */
  url(lang: Lang, path: string): string {
    return this.origin + LANG_PREFIX[lang] + path;
  }

  private setMeta(attr: 'name' | 'property', key: string, content: string): void {
    this.meta.updateTag({ [attr]: key, content }, `${attr}="${key}"`);
  }

  private addLink(attrs: Record<string, string>): void {
    const link = this.doc.createElement('link');
    for (const [k, v] of Object.entries(attrs)) link.setAttribute(k, v);
    this.doc.head.appendChild(link);
  }

  private removeLinks(selector: string): void {
    this.doc.head.querySelectorAll(selector).forEach((el) => el.remove());
  }

  private setJsonLd(data: object | undefined): void {
    this.doc.head.querySelector('script#ld-json')?.remove();
    if (!data) return;
    const script = this.doc.createElement('script');
    script.id = 'ld-json';
    script.setAttribute('type', 'application/ld+json');
    script.textContent = jsonLdText(data);
    this.doc.head.appendChild(script);
  }
}

/** JSON for <script>: "<" becomes \u003c, so a "</script>" in the data cannot close the script. */
export function jsonLdText(data: object): string {
  return JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(/</g, '\\u003c');
}

/** Text for meta description: the first sentences that fit in ~160 characters. */
export function summary(text: string, max = 160): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:—–-]+$/, '') + '…';
}

export function currentLang(localeId: string): Lang {
  const lang = localeId.slice(0, 2) as Lang;
  return LANGS.includes(lang) ? lang : LANGS[0];
}
