// Needs a build with the language versions: npm run build:i18n. With a plain `npm run build`
// /en/ does not exist — the test is skipped then (a plain build = Polish only).
describe('Wersje językowe (build --localize)', () => {
  before(function () {
    cy.request({ url: '/en/', failOnStatusCode: false }).then((res) => {
      if (res.status !== 200) this.skip();
    });
  });

  it('każdy język ma własny HTML z serwera: lang, base href, przetłumaczony tekst', () => {
    cy.request('/en/tropy').then((res) => {
      expect(res.body).to.contain('<html lang="en"');
      expect(res.body).to.contain('<base href="/en/">');
      expect(res.body).to.contain('Book of runes');
    });
    cy.request('/en/tropy').its('body').should('match', /\d+ tomes/);
  });

  it('linki, formularz i przekierowania zostają w obrębie języka', () => {
    cy.request({ url: '/en/ksiazka/okrutny-ksiaze', followRedirect: false }).then((res) => {
      expect(res.status).to.eq(301);
      expect(res.redirectedToUrl).to.match(/\/en\/ksiazka\/the-cruel-prince$/);
    });
    cy.request('/en/szukaj?trop=slow-burn').its('body').should('contain', 'action="szukaj"');

    cy.visit('/en/');
    cy.contains('a.cta', 'Search the archive').click();
    cy.location('pathname').should('eq', '/en/szukaj');
  });

  it('tytuły książek pochodzą z wydań w danym języku', () => {
    cy.request('/ksiazka/the-cruel-prince').its('body').should('contain', 'Okrutny książę').and('contain', 'Tytuł oryginału');
    cy.request('/en/ksiazka/the-cruel-prince').its('body').should('contain', 'The Cruel Prince').and('not.contain', 'Original title');
  });

  it('przełącznik języka prowadzi na tę samą stronę w drugim języku, z parametrami', () => {
    cy.viewport(1400, 900); // wide: the header is a bar, not the collapsed menu
    cy.visit('/ksiazka/fourth-wing');
    cy.get('app-language-switch a')
      .should('have.attr', 'href', '/en/ksiazka/fourth-wing')
      .and('have.attr', 'hreflang', 'en')
      .click();
    cy.location('pathname').should('eq', '/en/ksiazka/fourth-wing');
    cy.get('html').should('have.attr', 'lang', 'en');

    // After client-side navigation the link follows the current page (and keeps the query string).
    cy.visit('/en/szukaj?trop=slow-burn');
    cy.get('app-language-switch a').should('have.attr', 'href', '/szukaj?trop=slow-burn');
    cy.visit('/en/');
    cy.get('app-language-switch a').should('have.attr', 'href', '/');
  });

  it('treści katalogu też są przetłumaczone: tropy, opisy, ostrzeżenia, biogramy', () => {
    cy.request('/en/ksiazka/fourth-wing')
      .its('body')
      .should('contain', 'A fragile girl')
      .and('contain', 'Dragon riders')
      .and('contain', 'sex scenes')
      .and('not.contain', 'Krucha dziewczyna');
    cy.request('/en/tropy').its('body').should('contain', 'Enemies to lovers').and('not.contain', 'Od wrogów do kochanków');
    cy.request('/en/autor/rebecca-yarros').its('body').should('contain', 'An American author');
    cy.request('/en/premiery').its('body').should('contain', 'A Court of Thorns and Roses, book 6');
  });

  it('polska odmiana działa w wersji polskiej', () => {
    cy.request('/tropy').its('body').should('match', /\d+ księgi/).and('match', /\d+ ksiąg/);
  });
});
