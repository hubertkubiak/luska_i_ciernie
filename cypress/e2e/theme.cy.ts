// Night / parchment theme in a cookie — no flash on reload (SPEC §6, pitfall #3).
describe('Motyw', () => {
  beforeEach(() => cy.viewport(1400, 900));

  it('bez JavaScriptu: formularz ustawia ciasteczko i wraca na tę samą stronę w nowym motywie', () => {
    cy.disableJavaScript();
    cy.visit('/tropy');
    cy.get('app-theme-toggle button').click();
    cy.location('pathname').should('eq', '/tropy');
    cy.get('html').should('have.attr', 'data-theme', 'parchment');
    cy.getCookie('theme').should('have.property', 'value', 'parchment');
  });

  it('z JavaScriptem: zmiana od razu, bez przeładowania', () => {
    cy.visit('/');
    cy.get('.spark').should('exist');
    cy.window().then((w) => ((w as unknown as { bezPrzeladowania: boolean }).bezPrzeladowania = true));
    cy.get('app-theme-toggle button').click();
    cy.get('html').should('have.attr', 'data-theme', 'parchment');
    cy.getCookie('theme').should('have.property', 'value', 'parchment');
    cy.get('app-theme-toggle button').click();
    cy.get('html').should('have.attr', 'data-theme', 'night');
    cy.window().its('bezPrzeladowania').should('eq', true);
  });

  // Most important: the theme is in the HTML before any script runs — no flash.
  for (const [page, kind] of [
    ['/', 'SSR (REQUEST w Angularze)'],
    ['/tropy', 'prerender (poprawka w Expressie)'],
    ['/logowanie', 'SSR formularza'],
  ] as const) {
    it(`pergamin już w pierwszym HTML: ${page} — ${kind}`, () => {
      cy.setCookie('theme', 'parchment');
      let beforeScripts: string | null = null;
      cy.visit(page, {
        onBeforeLoad(win) {
          win.document.addEventListener('readystatechange', () => {
            if (win.document.readyState === 'interactive') beforeScripts = win.document.documentElement.getAttribute('data-theme');
          });
        },
      });
      cy.get('html').should('have.attr', 'data-theme', 'parchment');
      cy.then(() => expect(beforeScripts, 'data-theme zanim ruszył JS').to.eq('parchment'));
    });
  }

  it('złe wartości ciasteczka nie trafiają do HTML-a', () => {
    cy.setCookie('theme', '"><script>alert(1)</script>');
    cy.request('/tropy').its('body').should('contain', 'data-theme="night"').and('not.contain', 'alert(1)');
  });
});
