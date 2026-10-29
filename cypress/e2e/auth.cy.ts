// Logowanie: formularze POST do Expressa, sesja w ciasteczku httpOnly, strażnik /moja-polka.
// Serwer ma limit rejestracji z jednego IP (domyślnie 5 na godzinę). Testy zakładają 2 konta na
// przebieg; przy częstych przebiegach uruchom serwer z REGISTER_LIMIT_PER_HOUR=1000.
const unique = () => `e2e-${Date.now()}-${Cypress._.random(1e6)}@example.com`;
const PASSWORD = 'smoczy-ogien-123';

/** Konto „od ręki” przez API formularza — szybciej niż klikanie, gdy test dotyczy czegoś innego. */
function register(email: string, displayName = 'Violet') {
  return cy.request({
    method: 'POST',
    url: '/auth/rejestracja',
    form: true,
    body: { email, password: PASSWORD, displayName },
    followRedirect: false,
  });
}

describe('Konta i sesja', () => {
  // Jedno wspólne konto dla testów, które nie sprawdzają samej rejestracji.
  const email = unique();
  before(() => {
    register(email, 'Xaden');
    cy.clearCookies();
  });
  beforeEach(() => cy.viewport(1400, 900));

  /** Zalogowanie bez klikania (żądanie formularza) — ciasteczko trafia do przeglądarki testu. */
  const login = () =>
    cy.request({ method: 'POST', url: '/auth/logowanie', form: true, body: { email, password: PASSWORD }, followRedirect: false });

  it('niezalogowana osoba dostaje 302 na logowanie już z serwera', () => {
    cy.request({ url: '/moja-polka', followRedirect: false }).then((res) => {
      expect(res.status).to.eq(302);
      expect(res.redirectedToUrl).to.match(/\/logowanie\?next=%2Fmoja-polka$/);
    });
    cy.request({ url: '/en/moja-polka', followRedirect: false }).its('redirectedToUrl').should('match', /\/en\/logowanie\?/);
  });

  it('rejestracja działa bez JavaScriptu i ustawia ciasteczko httpOnly', () => {
    cy.disableJavaScript();
    cy.visit('/rejestracja');
    cy.get('#displayName').type('Violet');
    cy.get('#email').type(unique());
    cy.get('#password').type(PASSWORD);
    cy.contains('button', 'Zawrzyj pakt').click();

    cy.location('pathname').should('eq', '/moja-polka');
    cy.getCookie('sid').should('exist').and('have.property', 'httpOnly', true);
    // HTML z SSR zna już zalogowaną osobę (REQUEST_CONTEXT) i nie może trafić do wspólnego cache.
    cy.request('/').then((res) => {
      expect(res.body).to.contain('Violet').and.contain('Opuść dwór');
      expect(res.headers['cache-control']).to.eq('private, no-store');
    });
  });

  it('logowanie formularzem prowadzi do Skarbca', () => {
    cy.visit('/logowanie');
    cy.get('#email').type(email);
    cy.get('#password').type(PASSWORD);
    cy.contains('button', 'Przekrocz próg').click();
    cy.location('pathname').should('eq', '/moja-polka');
    cy.contains('Witaj w skarbcu, Xaden.');
  });

  it('złe hasło: komunikat, e-mail zostaje, hasło nie', () => {
    cy.visit('/logowanie');
    cy.get('#email').type(email);
    cy.get('#password').type('zle-haslo-1');
    cy.contains('button', 'Przekrocz próg').click();
    cy.location('search').should('contain', 'blad=dane').and('not.contain', 'zle-haslo');
    cy.get('[role="alert"]').should('contain', 'Nieprawidłowy e-mail lub hasło.');
    cy.get('#email').should('have.value', email);
    cy.get('#password').should('have.value', '');
  });

  it('po zalogowaniu wraca na stronę, z której przyszła (?next=)', () => {
    cy.visit('/tropy/slow-burn');
    cy.contains('a', 'Przekrocz próg').click();
    cy.location('search').should('eq', '?next=%2Ftropy%2Fslow-burn');
    cy.get('#email').type(email);
    cy.get('#password').type(PASSWORD);
    cy.contains('button', 'Przekrocz próg').click();
    cy.location('pathname').should('eq', '/tropy/slow-burn');
  });

  it('strona z prerenderu nie zna sesji — nagłówek uzupełnia /api/me po hydracji', () => {
    login();
    cy.request('/tropy').its('body').should('not.contain', 'Xaden'); // ten sam plik HTML dla wszystkich
    cy.intercept('GET', '/api/me').as('me');
    cy.visit('/tropy');
    cy.wait('@me').its('response.statusCode').should('eq', 200);
    cy.get('app-account').should('contain', 'Xaden');
  });

  it('kliknięcie „Skarbiec” bez sesji zatrzymuje guard routera', () => {
    cy.visit('/');
    cy.contains('nav a', 'Skarbiec').click();
    cy.location('pathname').should('eq', '/logowanie');
    cy.location('search').should('eq', '?next=%2Fmoja-polka');
  });

  it('„Opuść dwór” kończy sesję po stronie serwera', () => {
    login();
    // Nagłówek z imieniem przychodzi z SSR, a przeglądarka bierze osobę z TransferState —
    // obie strony widzą to samo, więc hydracja przechodzi bez błędów.
    cy.visit('/', { onBeforeLoad: (win) => cy.spy(win.console, 'error').as('consoleError') });
    cy.get('.spark').should('exist');
    cy.get('@consoleError').should('not.have.been.called');
    cy.contains('button', 'Opuść dwór').click();
    cy.location('pathname').should('eq', '/');
    cy.getCookie('sid').should('not.exist');
    cy.request({ url: '/moja-polka', followRedirect: false }).its('status').should('eq', 302);
  });

  it('odrzuca POST z cudzej strony (Origin) i ogranicza liczbę prób', () => {
    cy.request({
      method: 'POST',
      url: '/auth/logowanie',
      form: true,
      body: { email: 'x@example.com', password: 'cokolwiek' },
      headers: { Origin: 'https://evil.example' },
      failOnStatusCode: false,
    }).its('status').should('eq', 403);

    const victim = unique(); // osobny adres: limit liczy się dla pary IP + e-mail
    const attempt = () =>
      cy.request({ method: 'POST', url: '/auth/logowanie', form: true, body: { email: victim, password: 'zle' }, followRedirect: false });
    Cypress._.times(10, attempt);
    attempt().its('redirectedToUrl').should('contain', 'blad=limit');
  });
});
