// Stage 15: incremental hydration (@defer with hydrate triggers) and View Transitions.
describe('Hydracja przyrostowa', () => {
  it('„Podobne ścieżki” są w HTML-u z serwera, choć ich kod ładuje się później', () => {
    cy.request('/ksiazka/fourth-wing').then((res) => {
      expect(res.body).to.contain('Podobne ścieżki');
      // Full cards, not a placeholder — crawlers and readers without JS see the links.
      expect(res.body).to.match(/<app-similar-books[^>]*>[\s\S]*?<app-book-card/);
      // ngb = the dehydrated block's id, on elements that have events (links).
      expect(res.body).to.match(/<a [^>]*ngb="d\d+"/);
    });
  });

  it('blok czeka na przewinięcie (hydrate on viewport), potem karty działają jak linki routera', () => {
    cy.intercept('GET', '/api/books/*').as('book');
    cy.visit('/ksiazka/fourth-wing');
    cy.contains('h1', 'Fourth Wing');

    // After the rest of the page has hydrated the block is still dehydrated: the ngb attributes remain.
    cy.wait(1000);
    cy.get('app-similar-books a[ngb]').should('have.length.greaterThan', 0);

    // Scrolling into view → Angular loads the similar-books chunk and hydrates the block (removes ngb).
    cy.get('app-similar-books').scrollIntoView();
    cy.get('app-similar-books a[ngb]').should('not.exist');

    // Navigation in the browser (no reload): the new book comes from the API.
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
      // A spy, not a stub: the transition must really run.
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
