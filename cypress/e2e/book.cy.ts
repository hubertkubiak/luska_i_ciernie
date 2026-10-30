describe('Strona książki (SSR + transfer cache)', () => {
  it('renderuje treść i po hydracji nie pyta API ponownie', () => {
    // Intercept every /api call from the browser. The request made during SSR
    // happens in Node, so Cypress does not see it — and that is the point.
    cy.intercept('/api/**').as('api');

    cy.visit('/ksiazka/fourth-wing');
    cy.contains('h1', 'Fourth Wing');
    cy.contains('Tom I z 5 · seria w trakcie');

    // Give hydration time; the transfer cache should serve httpResource without the network.
    cy.wait(1000);
    cy.get('@api.all').should('have.length', 0);
  });

  it('nawigacja po kliknięciu w kolejny tom idzie już przez API z przeglądarki', () => {
    cy.intercept('GET', '/api/books/iron-flame').as('ironFlame');

    cy.visit('/ksiazka/fourth-wing');
    // Wait for hydration (Angular drops the jsaction markers): a click before it is a plain link —
    // a full page load from the server, which is fine, but not what this test checks.
    cy.contains('a', 'Iron Flame')
      .should(($a) => expect($a).not.to.have.attr('jsaction'))
      .click();

    cy.wait('@ironFlame');
    cy.location('pathname').should('eq', '/ksiazka/iron-flame');
    cy.contains('h1', 'Iron Flame');
  });

  it('pokazuje komunikat dla nieistniejącej księgi', () => {
    // Since stage 4 the page answers 404, and cy.visit treats that as an error by default.
    cy.visit('/ksiazka/nie-ma-takiej-ksiazki', { failOnStatusCode: false });
    cy.contains('Ta ścieżka zarosła cierniami.');
  });
});
