// Wymaga buildu z wersjami językowymi: npm run build:i18n. Przy zwykłym `npm run build`
// /en/ i /de/ nie istnieją — wtedy test się pomija (zwykły build = tylko polski).
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
    cy.request('/de/tropy').its('body').should('match', /\d+ Bände/);
  });

  it('linki, formularz i przekierowania zostają w obrębie języka', () => {
    cy.request({ url: '/de/ksiazka/okrutny-ksiaze', followRedirect: false }).then((res) => {
      expect(res.status).to.eq(301);
      expect(res.redirectedToUrl).to.match(/\/de\/ksiazka\/the-cruel-prince$/);
    });
    cy.request('/en/szukaj?trop=slow-burn').its('body').should('contain', 'action="szukaj"');

    cy.visit('/en/');
    cy.contains('a.cta', 'Search the archive').click();
    cy.location('pathname').should('eq', '/en/szukaj');
  });

  it('polska odmiana działa w wersji polskiej', () => {
    cy.request('/tropy').its('body').should('match', /\d+ księgi/).and('match', /\d+ ksiąg/);
  });
});
