// Real covers only after consent (docs/PRAWNE.md §2). Needs a server with COVER_SOURCE=openlibrary (the default).
// Accounts: start the server with REGISTER_LIMIT_PER_HOUR=1000 (see shelf.cy.ts).
const password = 'smoczy-ogien-123';
const newEmail = () => `covers-${Date.now()}-${Cypress._.random(1e6)}@example.com`;

const register = (email: string, consent: boolean) =>
  cy.request({
    method: 'POST',
    url: '/auth/rejestracja',
    form: true,
    body: { email, password, displayName: 'Violet', ...(consent && { okladki: 'tak' }) },
    followRedirect: false,
  });
const login = (email: string) =>
  cy.request({ method: 'POST', url: '/auth/logowanie', form: true, body: { email, password }, followRedirect: false });

describe('Zgoda na okładki', () => {
  beforeEach(() => {
    cy.clearCookie('covers'); // undo the global "already answered" from support/e2e.ts
    // We check the src attribute only — the test must not depend on Open Library being reachable.
    cy.intercept('GET', 'https://covers.openlibrary.org/**', { statusCode: 204 }).as('openLibrary');
  });

  // The URL itself may sit in the transfer-state JSON (that is just data) — what matters is that no
  // element would make the browser fetch it: no <img>, no <link rel="preload">.
  const fetchesCover = /<(img|link)\b[^>]*covers\.openlibrary\.org/;
  const bookForm = '.book .cover app-cover-consent-form';

  it('bez zgody serwer rysuje własne okładki, a przeglądarka nie łączy się z Open Library', () => {
    cy.request('/ksiazka/fourth-wing').its('body').should('not.match', fetchesCover);
    cy.visit('/ksiazka/fourth-wing');
    cy.get('.book .cover app-cover .generated').should('exist');
    cy.get('.book .cover app-cover img').should('not.exist');
    cy.wait(500);
    cy.get('@openLibrary.all').should('have.length', 0);
  });

  it('zgoda pokazuje prawdziwe okładki od razu w HTML z serwera, a cofnięcie je chowa', () => {
    cy.visit('/ksiazka/fourth-wing');
    cy.contains(`${bookForm} button`, 'Pokaż prawdziwe okładki').click();
    cy.location('pathname').should('eq', '/ksiazka/fourth-wing');
    cy.getCookie('covers').should('have.property', 'value', 'on');
    cy.get('.book .cover app-cover img').should('have.attr', 'src').and('contain', 'covers.openlibrary.org');
    // Straight from the server, before any JS: the HTML already contains the real cover and its preload.
    cy.request({ url: '/ksiazka/fourth-wing', headers: { Cookie: 'covers=on' } })
      .its('body')
      .should('match', fetchesCover);

    cy.contains(`${bookForm} button`, 'Cofnij zgodę na prawdziwe okładki').click();
    cy.getCookie('covers').should('have.property', 'value', 'off');
    cy.get('.book .cover app-cover .generated').should('exist');
  });

  it('pasek pyta niezalogowaną tylko raz — odmowa też jest zapamiętana', () => {
    cy.visit('/tropy');
    cy.get('app-cover-consent-banner .banner').should('not.exist'); // prerendered: no server context
    cy.visit('/');
    cy.get('app-cover-consent-banner .banner').should('be.visible').and('contain', 'adres IP');
    cy.contains('app-cover-consent-banner button', 'Nie, dziękuję').click();
    cy.location('pathname').should('eq', '/');
    cy.getCookie('covers').should('have.property', 'value', 'off');
    cy.get('app-cover-consent-banner .banner').should('not.exist');
    cy.visit('/ksiazka/fourth-wing');
    cy.get('app-cover-consent-banner .banner').should('not.exist');
    cy.get('.book .cover app-cover .generated').should('exist');
  });

  it('pasek: zgoda włącza okładki na stronie, z której przyszła', () => {
    cy.visit('/ksiazka/fourth-wing');
    cy.contains('app-cover-consent-banner button', 'Pokaż prawdziwe okładki').click();
    cy.location('pathname').should('eq', '/ksiazka/fourth-wing');
    cy.get('.book .cover app-cover img').should('exist');
    cy.get('app-cover-consent-banner .banner').should('not.exist');
  });

  it('zgoda przy rejestracji jest zapisana przy koncie i wraca po zalogowaniu na innym urządzeniu', () => {
    cy.visit('/rejestracja');
    cy.get('input[type=checkbox][name=okladki]').should('not.be.checked');

    const email = newEmail();
    register(email, true);
    cy.getCookie('covers').should('have.property', 'value', 'on');
    cy.visit('/');
    cy.get('app-cover-consent-banner .banner').should('not.exist');

    // "Another device": no cookies at all, then sign in.
    cy.clearCookies();
    login(email);
    cy.getCookie('covers').should('have.property', 'value', 'on');

    // Withdrawn on /prywatnosc → saved on the account: the next sign-in elsewhere brings no consent.
    cy.visit('/prywatnosc');
    cy.contains('app-privacy-page button', 'Cofnij zgodę na prawdziwe okładki').click();
    cy.getCookie('covers').should('have.property', 'value', 'off');
    cy.clearCookies();
    login(email);
    cy.getCookie('covers').should('be.null');
  });

  it('rejestracja bez zaznaczenia: konto działa, okładek nie ma, pasek nie pyta', () => {
    register(newEmail(), false).its('status').should('eq', 303);
    cy.getCookie('covers').should('have.property', 'value', 'off');
    cy.visit('/ksiazka/fourth-wing');
    cy.get('.book .cover app-cover .generated').should('exist');
  });

  it('prerenderowana strona tropu dogania zgodę po hydracji', () => {
    cy.setCookie('covers', 'on');
    cy.visit('/tropy/enemies-to-lovers');
    cy.get('app-book-card app-cover img').should('exist');
  });

  it('stopka prowadzi do strony prywatności z formularzem zgody', () => {
    cy.setCookie('covers', 'off'); // the banner would offer the same buttons
    cy.visit('/');
    cy.get('app-footer a.privacy').click();
    cy.location('pathname').should('eq', '/prywatnosc');
    cy.get('h1').should('contain', 'Prywatność');
    cy.contains('app-privacy-page button', 'Pokaż prawdziwe okładki').click();
    cy.location('pathname').should('eq', '/prywatnosc');
    cy.contains('app-privacy-page button', 'Cofnij zgodę na prawdziwe okładki').should('exist');
  });

  it('formularz z innej strony jest odrzucany', () => {
    cy.request({
      method: 'POST',
      url: '/okladki',
      form: true,
      body: { zgoda: 'tak', next: '/' },
      headers: { Origin: 'https://evil.example' },
      failOnStatusCode: false,
    }).its('status').should('eq', 403);
  });
});
