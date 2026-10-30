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

  it('polska odmiana działa w wersji polskiej', () => {
    cy.request('/tropy').its('body').should('match', /\d+ księgi/).and('match', /\d+ ksiąg/);
  });
});
