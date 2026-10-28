describe('Wyszukiwarka /szukaj', () => {
  it('serwer renderuje wyniki z query params i kanoniczny adres', () => {
    cy.request('/szukaj?tryb=wszystkie&trop=enemies-to-lovers&trop=jezdzcy-smokow').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.match(/Znaleziono [1-9]\d* ksi/);
      expect(res.body).to.contain('Fourth Wing');
      // Inna kolejność + domyślny tryb w adresie → ten sam adres kanoniczny.
      expect(res.body).to.match(/<link rel="canonical" href="[^"]+\/szukaj\?trop=enemies-to-lovers&amp;trop=jezdzcy-smokow">/);
    });
  });

  it('formularz działa bez JavaScriptu (zwykły GET)', () => {
    // Blokujemy wszystkie skrypty z naszego originu — zostaje sam HTML z serwera.
    cy.intercept({ method: 'GET', url: /\/[^/]+\.js$/ }, { forceNetworkError: true });
    cy.visit('/szukaj');

    cy.get('input[name="trop"][value="wampiry"]').check({ force: true });
    cy.get('select[name="pikanteria"]').select('3/5');
    cy.contains('button', 'Szukaj').click();

    cy.location('search').should('contain', 'trop=wampiry').and('contain', 'pikanteria=3');
    cy.contains(/Znaleziono \d+ ksi/);
    // Po przeładowaniu stan formularza odtworzył serwer: atrybuty checked/selected w HTML.
    cy.get('input[name="trop"][value="wampiry"]').should('be.checked');
    cy.get('select[name="pikanteria"]').should('have.value', '3');
  });

  it('z JavaScriptem filtruje bez przeładowania strony', () => {
    cy.visit('/szukaj');
    cy.window().then((win) => ((win as unknown as { bezPrzeladowania: boolean }).bezPrzeladowania = true));

    cy.contains('label.pill', 'Jeźdźcy smoków').click();
    cy.location('search').should('eq', '?trop=jezdzcy-smokow');
    cy.contains('a', 'Fourth Wing');

    cy.get('select[name="status"]').select('pojedynczy tom');
    cy.location('search').should('eq', '?trop=jezdzcy-smokow&status=pojedyncza');

    cy.window().its('bezPrzeladowania').should('eq', true);
  });

  it('„Wyczyść filtry” odznacza też to, co kliknęła czytelniczka', () => {
    cy.visit('/szukaj');
    cy.contains('label.pill', 'Slow burn').click();
    cy.location('search').should('eq', '?trop=slow-burn');

    cy.contains('a', 'Wyczyść filtry').click();
    cy.location('search').should('eq', '');
    cy.get('input[name="trop"]:checked').should('have.length', 0);
  });

  it('kliknięcie przed hydracją nie ginie', () => {
    // Klik w chwili, gdy jest już HTML z serwera, a aplikacja jeszcze nie wystartowała.
    // Z bindingiem właściwości [checked] hydracja ustawiłaby checked=false i kliknięcie by przepadło.
    cy.visit('/szukaj', {
      onBeforeLoad(win) {
        win.document.addEventListener('DOMContentLoaded', () => {
          win.document.querySelector('input[value="slow-burn"]')!.closest('label')!.click();
        });
      },
    });
    // Event replay odtworzył „change” po hydracji → nawigacja z zaznaczonym tropem.
    cy.location('search').should('eq', '?trop=slow-burn');
    cy.get('input[value="slow-burn"]').should('be.checked');
  });

  it('przycisk Wstecz przywraca formularz do stanu z adresu', () => {
    cy.visit('/szukaj');
    cy.contains('label.pill', 'Wampiry').click();
    cy.location('search').should('eq', '?trop=wampiry');
    cy.go('back');
    cy.location('search').should('eq', '');
    cy.get('input[value="wampiry"]').should('not.be.checked');
  });

  it('pusty wynik ma komunikat w klimacie', () => {
    cy.visit('/szukaj?q=nie-ma-takiej-frazy');
    cy.contains('Archiwum milczy. Spróbuj innych run.');
  });
});
