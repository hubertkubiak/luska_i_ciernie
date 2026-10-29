import { DOCUMENT } from '@angular/common';
import { Injectable, LOCALE_ID, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { LANG_PREFIX, LANGS, type Lang } from '../../shared/models';

export const SITE_NAME = 'Łuska i Ciernie';

const OG_LOCALE: Record<Lang, string> = { pl: 'pl_PL', en: 'en_US' };

export interface PageMeta {
  /** Tytuł strony bez nazwy serwisu (ta dochodzi sama), chyba że już ją zawiera. */
  title: string;
  description: string;
  /** Ścieżka aplikacji BEZ prefiksu języka, z query stringiem, np. "/szukaj?trop=slow-burn". */
  path: string;
  /** Obraz do podglądu linku (absolutny URL). Brak = domyślny obraz serwisu. */
  image?: string | null;
  type?: 'website' | 'book' | 'profile';
  /** Dane strukturalne schema.org — trafiają do <script type="application/ld+json">. */
  jsonLd?: object;
  /** Strony, których nie chcemy w wynikach wyszukiwania (np. 404). */
  noindex?: boolean;
  /** Kanał RSS strony — czytniki kanałów wykrywają go po <link rel="alternate">. */
  feed?: { title: string; path: string };
}

/**
 * Cały <head> pod SEO w jednym miejscu: tytuł, opis, canonical, hreflang, Open Graph, robots
 * i JSON-LD. Strony wołają update(), gdy mają już dane — na serwerze dzieje się to przed
 * zakończeniem renderu (whenStable), więc wszystko jest w HTML-u, który widzi wyszukiwarka
 * i podgląd linku w komunikatorze (te nie wykonują JavaScriptu).
 */
@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly doc = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly lang = currentLang(inject(LOCALE_ID));

  update(page: PageMeta): void {
    const fullTitle = page.title.includes(SITE_NAME) ? page.title : `${page.title} | ${SITE_NAME}`;
    const url = this.link(page.path);
    const image = page.image ?? this.link('/og-default.png');

    this.title.setTitle(fullTitle);
    this.setMeta('name', 'description', page.description);
    this.setMeta('name', 'robots', page.noindex ? 'noindex, follow' : 'index, follow');

    // Adres kanoniczny i odpowiedniki w innych językach. Strona noindex nie ma ani jednego, ani drugiego.
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
    // Okładki są pionowe → mała karta; domyślny obraz jest panoramiczny (1200×630) → duża.
    this.setMeta('name', 'twitter:card', page.image ? 'summary' : 'summary_large_image');

    this.removeLinks('link[rel="alternate"][type="application/rss+xml"]');
    if (page.feed) {
      this.addLink({ rel: 'alternate', type: 'application/rss+xml', title: page.feed.title, href: this.link(page.feed.path) });
    }

    this.setJsonLd(page.jsonLd);
  }

  /** Absolutny adres ścieżki w bieżącej wersji językowej. */
  link(path: string): string {
    return this.url(this.lang, path);
  }

  /** Absolutny adres ścieżki w danej wersji językowej. Origin = adres z żądania (allowedHosts). */
  url(lang: Lang, path: string): string {
    return this.doc.location.origin + LANG_PREFIX[lang] + path;
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

/** JSON do <script>: „<” zamieniamy na <, żeby „</script>” w danych nie zamknęło skryptu. */
export function jsonLdText(data: object): string {
  return JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(/</g, '\\u003c');
}

/** Opis do meta description: pierwsze zdania, które mieszczą się w ~160 znakach. */
export function summary(text: string, max = 160): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:—–-]+$/, '') + '…';
}

function currentLang(localeId: string): Lang {
  const lang = localeId.slice(0, 2) as Lang;
  return LANGS.includes(lang) ? lang : LANGS[0];
}
