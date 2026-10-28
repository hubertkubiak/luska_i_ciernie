describe('Strona książki (SSR + transfer cache)', () => {
  it('renderuje treść i po hydracji nie pyta API ponownie', () => {
    // Przechwytujemy wszystkie wywołania /api z przeglądarki. Request wykonany podczas SSR
    // dzieje się w Node, więc Cypress go nie widzi — i dobrze, o to chodzi.
    cy.intercept('/api/**').as('api');

    cy.visit('/ksiazka/fourth-wing');
    cy.contains('h1', 'Fourth Wing');
    cy.contains('Tom I z 5 · seria w trakcie');

    // Dajemy hydracji czas; transfer cache powinien obsłużyć httpResource bez sieci.
    cy.wait(1000);
    cy.get('@api.all').should('have.length', 0);
  });

  it('nawigacja po kliknięciu w kolejny tom idzie już przez API z przeglądarki', () => {
    cy.intercept('GET', '/api/books/iron-flame').as('ironFlame');

    cy.visit('/ksiazka/fourth-wing');
    cy.contains('a', 'Iron Flame').click();

    cy.wait('@ironFlame');
    cy.location('pathname').should('eq', '/ksiazka/iron-flame');
    cy.contains('h1', 'Iron Flame');
  });

  it('pokazuje komunikat dla nieistniejącej księgi', () => {
    // Od etapu 4 strona odpowiada 404, a cy.visit domyślnie traktuje to jako błąd.
    cy.visit('/ksiazka/nie-ma-takiej-ksiazki', { failOnStatusCode: false });
    cy.contains('Ta ścieżka zarosła cierniami.');
  });
});
