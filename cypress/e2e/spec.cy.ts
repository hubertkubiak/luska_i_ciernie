describe('Strona główna', () => {
  it('pokazuje hero i nawigację', () => {
    cy.visit('/');
    cy.contains('h1', 'Łuska i Ciernie');
    cy.contains('nav', 'Przeszukaj archiwum');
  });

  it('prowadzi do strony książki', () => {
    cy.visit('/');
    cy.contains('a', 'Fourth Wing').click();
    cy.location('pathname').should('eq', '/ksiazka/fourth-wing');
    cy.contains('h1', 'Fourth Wing');
  });
});
