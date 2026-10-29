describe('Strona główna', () => {
  it('pokazuje hero i nawigację', () => {
    cy.visit('/');
    cy.contains('h1', 'Łuska i Ciernie');
    cy.contains('nav', 'Przeszukaj archiwum');
  });

  it('Trop dnia prowadzi do strony tropu', () => {
    cy.visit('/');
    cy.get('app-trope-of-the-day a').click();
    cy.location('pathname').should('match', /^\/tropy\/[a-z-]+$/);
    cy.get('h1').should('not.be.empty');
  });

  // Typowe rozmiary okna przeglądarki (po odjęciu paska zadań Windows i interfejsu Chrome):
  // laptop 15" Full HD przy domyślnej skali 125%, starszy laptop 1366×768, monitor Full HD.
  for (const [w, h] of [
    [1536, 730],
    [1366, 625],
    [1280, 650],
    [1920, 950],
  ] as const) {
    it(`mieści się bez przewijania w oknie ${w}×${h}`, () => {
      cy.viewport(w, h);
      cy.visit('/');
      cy.get('app-trope-of-the-day a');
      cy.document().then((d) => {
        expect(d.documentElement.scrollHeight, 'wysokość strony').to.be.at.most(d.documentElement.clientHeight);
        expect(d.documentElement.scrollWidth, 'szerokość strony').to.be.at.most(d.documentElement.clientWidth);
      });
    });
  }
});
