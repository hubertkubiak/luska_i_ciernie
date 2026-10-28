describe('Tropy (prerender)', () => {
  it('/tropy to plik z buildu: kontekst „ssg” i gotowa lista w HTML', () => {
    cy.request('/tropy').then((res) => {
      expect(res.status).to.eq(200);
      // ng-server-context mówi, jak powstał HTML: ssg = prerender w buildzie, ssr = na żądanie.
      expect(res.body).to.contain('ng-server-context="ssg"');
      expect(res.body).to.contain('Enemies to lovers');
    });
  });

  it('każdy znany trop ma własną stronę z buildu, nieznany renderuje się na żądanie z 404', () => {
    cy.request('/tropy/fated-mates').its('body').should('contain', 'ng-server-context="ssg"');

    cy.request({ url: '/tropy/nie-ma-takiej-runy', failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(404);
      expect(res.body).to.contain('ng-server-context="ssr"');
    });
  });

  it('runa w HTML wskazuje symbol ze sprite’a', () => {
    cy.visit('/tropy/fated-mates');
    cy.contains('h1', 'Fated mates');
    cy.get('#rune-fated-mates').should('exist');
    cy.get('app-rune use').first().should('have.attr', 'href', '#rune-fated-mates');
  });

  it('z listy tropów przechodzi do tropu i dalej do książki', () => {
    cy.visit('/tropy');
    cy.contains('a', 'Jeźdźcy smoków').click();
    cy.location('pathname').should('eq', '/tropy/jezdzcy-smokow');
    cy.contains('a', 'Fourth Wing').click();
    cy.contains('h1', 'Fourth Wing');
  });
});
