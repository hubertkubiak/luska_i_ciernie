// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// When a command from ./commands is ready to use, import with `import './commands'` syntax
import './commands';

// The cover consent banner (fixed in the corner) could cover elements other tests click. Every test
// starts as someone who has already answered "no"; covers.cy.ts clears this to test the banner itself.
beforeEach(() => cy.setCookie('covers', 'off'));
