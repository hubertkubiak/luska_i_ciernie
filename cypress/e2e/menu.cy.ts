describe('Menu „Mapa” na wąskim ekranie', () => {
  beforeEach(() => cy.viewport(390, 844));

  it('nawigacja jest schowana, a przycisk ją rozwija i zwija', () => {
    cy.visit('/');
    cy.contains('a', 'Tropy').should('not.be.visible');

    cy.contains('button', 'Mapa').click();
    cy.contains('a', 'Tropy').should('be.visible');

    cy.contains('button', 'Zwiń mapę').click();
    cy.contains('a', 'Tropy').should('not.be.visible');
  });

  it('działa bez JavaScriptu (Popover API przeglądarki)', () => {
    cy.disableJavaScript();
    cy.visit('/');
    cy.contains('button', 'Mapa').click();
    cy.contains('a', 'Tropy').should('be.visible').click();
    // Without JS it is a plain link — a full reload, a new page from the server.
    cy.location('pathname').should('eq', '/tropy');
    cy.contains('h1', 'Tropy');
  });

  it('z JavaScriptem zwija się sam po nawigacji routerem', () => {
    cy.visit('/');
    cy.contains('button', 'Mapa').click();
    cy.contains('a', 'Tropy').click();
    cy.location('pathname').should('eq', '/tropy');
    cy.get('#mapa-krain').should('not.match', ':popover-open');
  });

  it('panel otwarty przed hydracją nie zwija się sam, gdy aplikacja ożyje', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        // A click when the server HTML is there but the app has not started yet.
        win.document.addEventListener('DOMContentLoaded', () => {
          win.document.querySelector<HTMLButtonElement>('button[popovertarget="mapa-krain"]')!.click();
        });
      },
    });
    cy.get('.spark').should('exist'); // sparks = the app has hydrated
    cy.get('#mapa-krain').should('match', ':popover-open');
  });

  // Esc and clicking outside ("light dismiss") are native popover behaviour, but they react only to
  // real events (isTrusted). Cypress's synthetic events will not trigger them — check by hand.
});

describe('Menu na szerokim ekranie', () => {
  it('pokazuje pełną nawigację bez przycisku', () => {
    cy.viewport(1366, 800);
    cy.visit('/');
    cy.contains('button', 'Mapa').should('not.be.visible');
    cy.contains('a', 'Nadchodzące przepowiednie').should('be.visible');
  });
});

describe('Link „Przejdź do treści”', () => {
  it('prowadzi do treści bieżącej strony, a nie do strony głównej', () => {
    cy.request('/tropy').its('body').should('match', /class="skip" href="\/tropy#tresc"/);
  });
});
