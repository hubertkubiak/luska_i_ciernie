import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';

/**
 * „5 ksiąg” / „3 księgi” / „1 księga” — odmiana bez ICU.
 *
 * Normalnie użylibyśmy ICU ({n, plural, …}) w szablonie, ale w Angularze 22.2 hydracja i18n
 * wywraca się na ICU wewnątrz widoków @for (ASSERTION ERROR: expected matching nodeType 8 == 3).
 * W listach używamy więc tego pipe'a: Intl.PluralRules wybiera kategorię dla bieżącego locale
 * (pl: one/few/many/other, en/de: one/other), a każdy wariant to osobny komunikat do tłumaczenia.
 * Wynik to zwykły tekst — hydracja i18n go nie dotyczy, a Node i przeglądarka liczą to samo.
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
