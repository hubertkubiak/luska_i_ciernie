import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';

/**
 * "5 ksiąg" / "3 księgi" / "1 księga" — plural forms without ICU.
 *
 * Normally we would use ICU ({n, plural, …}) in the template, but in Angular 22.2 i18n hydration
 * breaks on ICU inside @for views (ASSERTION ERROR: expected matching nodeType 8 == 3).
 * So lists use this pipe: Intl.PluralRules picks the category for the current locale
 * (pl: one/few/many/other, en: one/other), and each variant is a separate message to translate.
 * The result is plain text — i18n hydration does not apply to it, and Node and the browser compute the same.
 */
@Pipe({ name: 'booksCount' })
export class BooksCountPipe implements PipeTransform {
  private readonly rules = new Intl.PluralRules(inject(LOCALE_ID));

  transform(count: number): string {
    switch (this.rules.select(count)) {
      case 'one':
        return $localize`:@@books.one:${count}:count: księga`;
      case 'few':
        return $localize`:@@books.few:${count}:count: księgi`;
      case 'many':
        return $localize`:@@books.many:${count}:count: ksiąg`;
      default:
        return $localize`:@@books.other:${count}:count: księgi`;
    }
  }
}
