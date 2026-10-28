// Pułapka hydracji #1 (SPEC §6). Angular 22 NIE zgłasza błędu, gdy tekst z serwera różni się
// od tego z klienta — po cichu go podmienia. Dlatego test sam porównuje to, co przyszło w HTML,
// z tym, co jest po hydracji, i sprawdza, że to te same węzły DOM.
describe('Trop dnia i hydracja landingu', () => {
  it('po hydracji pokazuje ten sam trop co HTML z serwera, w tych samych węzłach', () => {
    const fromServer: { card?: Element | null; name?: string | null; sparks?: number } = {};

    cy.visit('/', {
      onBeforeLoad(win) {
        cy.spy(win.console, 'error').as('consoleError');
        // „interactive” = HTML sparsowany, skrypty aplikacji jeszcze nie ruszyły → czysty wynik SSR.
        win.document.addEventListener('readystatechange', () => {
          if (win.document.readyState !== 'interactive') return;
          fromServer.card = win.document.querySelector('app-trope-of-the-day a');
          fromServer.name = fromServer.card?.querySelector('.name')?.textContent;
          fromServer.sparks = win.document.querySelectorAll('.spark').length;
        });
      },
    });

    // Iskry pojawiają się dopiero w afterNextRender — znak, że aplikacja już ożyła.
    cy.get('.spark').should('have.length.greaterThan', 0);
    cy.get('app-trope-of-the-day a').then(($card) => {
      expect(fromServer.name, 'trop w HTML z serwera').to.be.a('string').and.not.be.empty;
      expect($card.find('.name').text()).to.eq(fromServer.name);
      expect($card[0], 'ten sam węzeł DOM (hydracja, nie ponowny render)').to.eq(fromServer.card);
      expect(fromServer.sparks, 'serwer nie renderuje iskier').to.eq(0);
    });
    cy.get('@consoleError').should('not.have.been.called');
  });

  it('dzień renderu jedzie do przeglądarki w TransferState', () => {
    cy.request('/').its('body').should('match', /"dzien-renderu":"\d{4}-\d{2}-\d{2}"/);
  });

  it('landing jest renderowany na żądanie, nie z buildu', () => {
    cy.request('/').its('body').should('contain', 'ng-server-context="ssr"');
  });
});
