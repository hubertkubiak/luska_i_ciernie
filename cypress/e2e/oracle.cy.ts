// Etap 16: Wyrocznia — RenderMode.Client, stan quizu w sygnałach, wynik w adresie.
describe('Wyrocznia (RenderMode.Client)', () => {
  it('serwer odsyła pustą skorupę — treść quizu powstaje dopiero w przeglądarce', () => {
    cy.request('/wyrocznia').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).not.to.contain('Którędy wchodzisz');
      // Brak znacznika SSR: ten HTML nie powstał w Angularze na serwerze.
      expect(res.body).not.to.contain('ng-server-context');
    });
    cy.visit('/wyrocznia');
    cy.contains('h2', 'Którędy wchodzisz do opowieści?');
  });

  it('pięć odpowiedzi → trop i księgi; wynik siedzi w adresie i przeżywa przeładowanie', () => {
    cy.visit('/wyrocznia');
    cy.contains('Pytanie 1 z 5');
    cy.contains('button', 'Nocą, przez okno').click();
    cy.contains('Pytanie 2 z 5');
    // Fokus przechodzi na nowe pytanie (czytnik ekranu je odczyta).
    cy.focused().should('have.prop', 'tagName', 'H2');
    cy.contains('button', 'Kimś mrocznym').click();
    cy.contains('button', 'Klątwę').click();
    cy.contains('button', 'W krypcie').click();
    cy.contains('h2', 'Jak gorący ma być smoczy ogień?');
    cy.contains('button', 'Wystarczy iskra').click();

    cy.location('search').should('eq', '?wynik=wampiry&ogien=1');
    cy.contains('Wyrocznia przemówiła');
    cy.contains('h2', 'Wampiry');
    cy.get('.result app-book-card').should('have.length.greaterThan', 0);

    cy.reload();
    cy.contains('h2', 'Wampiry');

    cy.contains('a', 'Zapytaj Wyrocznię jeszcze raz').click();
    cy.location('search').should('eq', '');
    cy.contains('Pytanie 1 z 5');
  });

  it('„Poprzednie pytanie” cofa o krok', () => {
    cy.visit('/wyrocznia');
    cy.contains('button', 'Przez bibliotekę').click();
    cy.contains('Pytanie 2 z 5');
    cy.contains('button', 'Poprzednie pytanie').click();
    cy.contains('Pytanie 1 z 5');
    cy.contains('button', 'Poprzednie pytanie').should('not.exist');
  });

  it('nieznany trop w adresie: komunikat zamiast wyniku', () => {
    cy.visit('/wyrocznia?wynik=nie-ma-takiej&ogien=3');
    cy.contains('Wyrocznia nie zna takiej ścieżki.');
  });

  it('wersja angielska', () => {
    cy.visit('/en/wyrocznia');
    cy.contains('h1', 'Which trope is yours?');
    cy.contains('Question 1 of 5');
  });
});
