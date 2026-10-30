declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Simulates a browser with JavaScript DISABLED: strips every <script> from each HTML
       * document — including the inline event replay script (ng-event-dispatch-contract).
       *
       * Merely blocking .js files is a different scenario ("the JS failed to load"): the inline
       * script still intercepts router link clicks (preventDefault until hydration, which never
       * happens) and the links are dead.
       */
      disableJavaScript(): Chainable<null>;
    }
  }
}

Cypress.Commands.add('disableJavaScript', () => {
  cy.intercept({ method: 'GET', url: '**' }, (req) => {
    if (!String(req.headers['accept'] ?? '').includes('text/html')) return;
    req.on('response', (res) => {
      if (typeof res.body === 'string') res.body = res.body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    });
  });
});

export {};
