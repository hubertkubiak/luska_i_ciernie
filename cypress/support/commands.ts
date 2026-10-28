declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Symuluje przeglądarkę z WYŁĄCZONYM JavaScriptem: z każdego dokumentu HTML wycina
       * wszystkie <script> — także wbudowany skrypt event replay (ng-event-dispatch-contract).
       *
       * Samo blokowanie plików .js to inny scenariusz („JS się nie załadował”): wtedy wbudowany
       * skrypt nadal przechwytuje kliknięcia linków routera (preventDefault do czasu hydracji,
       * która nigdy nie nastąpi) i linki są martwe.
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
