// Etap 15: incremental hydration (@defer z wyzwalaczami hydrate) i View Transitions.
describe('Hydracja przyrostowa', () => {
  it('„Podobne ścieżki” są w HTML-u z serwera, choć ich kod ładuje się później', () => {
    cy.request('/ksiazka/fourth-wing').then((res) => {
      expect(res.body).to.contain('Podobne ścieżki');
      // Pełne karty, nie placeholder — roboty i czytelniczka bez JS widzą linki.
      expect(res.body).to.match(/<app-similar-books[^>]*>[\s\S]*?<app-book-card/);
      // ngb = identyfikator odwodnionego bloku na elementach, które mają zdarzenia (linki).
      expect(res.body).to.match(/<a [^>]*ngb="d\d+"/);
    });
  });

  it('blok czeka na przewinięcie (hydrate on viewport), potem karty działają jak linki routera', () => {
    cy.intercept('GET', '/api/books/*').as('book');
    cy.visit('/ksiazka/fourth-wing');
    cy.contains('h1', 'Fourth Wing');

    // Po hydracji reszty strony blok nadal jest odwodniony: atrybuty ngb wciąż na miejscu.
    cy.wait(1000);
    cy.get('app-similar-books a[ngb]').should('have.length.greaterThan', 0);

    // Wjazd w ekran → Angular pobiera chunk similar-books i hydratuje blok (zdejmuje ngb).
    cy.get('app-similar-books').scrollIntoView();
    cy.get('app-similar-books a[ngb]').should('not.exist');

    // Nawigacja w przeglądarce (bez przeładowania): nowa książka przychodzi z API.
    cy.get('app-similar-books app-book-card a').first().then(($a) => {
      const href = $a.attr('href')!;
      cy.wrap($a).click();
      cy.wait('@book');
      cy.location('pathname').should('eq', href);
    });
  });

  it('bez hydracji nic nie zgrzyta: brak błędów w konsoli, stopka (hydrate never) na miejscu', () => {
    cy.visit('/ksiazka/fourth-wing', {
      onBeforeLoad(win) {
        cy.spy(win.console, 'error').as('consoleError');
      },
    });
    cy.contains('h1', 'Fourth Wing');
    cy.wait(1000);
    cy.get('app-similar-books').scrollIntoView();
    cy.get('app-similar-books a[ngb]').should('not.exist');
    cy.contains('footer', 'archiwum romantasy');
    cy.get('@consoleError').should('not.have.been.called');
  });
});

describe('View Transitions', () => {
  it('okładka ma tę samą nazwę na karcie i na stronie książki', () => {
    cy.visit('/tropy/jezdzcy-smokow');
    cy.get('app-book-card a[href="/ksiazka/fourth-wing"] app-cover').should(
      'have.attr',
      'style',
      'view-transition-name: cover-fourth-wing;',
    );

    cy.window().then((win) => {
      // Spy, nie stub: przejście ma się naprawdę wykonać.
      if (win.document.startViewTransition) cy.spy(win.document, 'startViewTransition').as('vt');
    });
    cy.get('app-book-card a[href="/ksiazka/fourth-wing"]').click();
    cy.contains('h1', 'Fourth Wing');
    cy.get('.book .cover app-cover').should('have.attr', 'style', 'view-transition-name: cover-fourth-wing;');
    cy.window().then((win) => {
      if (win.document.startViewTransition) cy.get('@vt').should('have.been.calledOnce');
    });
  });
});
