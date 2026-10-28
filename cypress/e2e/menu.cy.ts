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
    // Bez JS to zwykły link — pełne przeładowanie, nowa strona z serwera.
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

  // Esc i klik obok („light dismiss”) to natywne zachowanie popovera, ale reaguje tylko na
  // prawdziwe zdarzenia (isTrusted). Syntetyczne zdarzenia Cypressa go nie uruchomią — sprawdź ręcznie.
});

describe('Menu na szerokim ekranie', () => {
  it('pokazuje pełną nawigację bez przycisku', () => {
    cy.viewport(1280, 800);
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
