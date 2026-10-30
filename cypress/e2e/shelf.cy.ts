// Treasury: the shelf saved in the database, "Add to shelf" without JS, before and after hydration.
// Every test creates an account (registration limit: start the server with REGISTER_LIMIT_PER_HOUR=1000).
const signUp = () =>
  cy.request({
    method: 'POST',
    url: '/auth/rejestracja',
    form: true,
    body: { email: `shelf-${Date.now()}-${Cypress._.random(1e6)}@example.com`, password: 'smoczy-ogien-123', displayName: 'Violet' },
    followRedirect: false,
  });

describe('Skarbiec', () => {
  beforeEach(() => cy.viewport(1400, 900));

  it('anonim widzi zaproszenie do logowania z powrotem na stronę książki', () => {
    cy.visit('/ksiazka/fourth-wing');
    cy.get('app-shelf-control a').should('have.attr', 'href', '/logowanie?next=%2Fksiazka%2Ffourth-wing');
  });

  it('z JavaScriptem: zapis przez API, bez przeładowania strony', () => {
    signUp();
    cy.intercept('PUT', '/api/shelf/fourth-wing').as('save');
    cy.visit('/ksiazka/fourth-wing');
    // Hydrated (jsaction markers gone) — before that the click would be a native form POST.
    cy.get('app-shelf-control form').should(($f) => expect($f).not.to.have.attr('jsaction'));
    cy.window().then((w) => ((w as unknown as { bezPrzeladowania: boolean }).bezPrzeladowania = true));

    cy.contains('app-shelf-control button', 'Czytam').click();
    cy.wait('@save').its('request.body').should('deep.include', { status: 'reading' });
    cy.contains('app-shelf-control button', 'Czytam').should('have.attr', 'aria-pressed', 'true');
    cy.window().its('bezPrzeladowania').should('eq', true);
  });

  it('SSR zna stan półki: przycisk przychodzi wciśnięty w HTML i nie ma drugiego żądania po hydracji', () => {
    signUp();
    cy.request({
      method: 'PUT',
      url: '/api/shelf/iron-flame',
      body: { status: 'tbr' },
      headers: { Origin: Cypress.config('baseUrl')! },
    });
    cy.request('/ksiazka/iron-flame').its('body').should('match', /aria-pressed="true"[^>]*>\s*Do przeczytania/);

    cy.intercept('GET', '/api/shelf/**').as('shelfGet');
    cy.visit('/ksiazka/iron-flame');
    cy.contains('app-shelf-control button', 'Do przeczytania').should('have.attr', 'aria-pressed', 'true');
    cy.wait(800);
    cy.get('@shelfGet.all').should('have.length', 0); // transfer cache
  });

  it('książka spoza półki: 200 z null zamiast 404, więc też bez drugiego żądania', () => {
    signUp();
    cy.request('/api/shelf/onyx-storm').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.eq(null);
    });

    cy.intercept('GET', '/api/shelf/**').as('shelfGet');
    cy.visit('/ksiazka/onyx-storm');
    cy.contains('app-shelf-control button', 'Do przeczytania').should('have.attr', 'aria-pressed', 'false');
    cy.wait(800);
    cy.get('@shelfGet.all').should('have.length', 0);
  });

  it('bez JavaScriptu: zwykły formularz — Express zapisuje i odsyła na stronę książki', () => {
    signUp();
    cy.disableJavaScript();
    cy.visit('/ksiazka/onyx-storm');
    cy.contains('app-shelf-control button', 'Przeczytane').click();
    cy.location('pathname').should('eq', '/ksiazka/onyx-storm');
    cy.contains('app-shelf-control button', 'Przeczytane').should('have.attr', 'aria-pressed', 'true');
  });

  it('kliknięcie przed hydracją nie ginie', () => {
    signUp();
    cy.visit('/ksiazka/the-cruel-prince', {
      onBeforeLoad(win) {
        // The server HTML is there, the app has not started yet.
        win.document.addEventListener('DOMContentLoaded', () => {
          const button = [...win.document.querySelectorAll<HTMLButtonElement>('app-shelf-control button')].find(
            (b) => b.textContent?.trim() === 'Czytam',
          );
          button!.click();
        });
      },
    });
    cy.location('pathname').should('eq', '/ksiazka/the-cruel-prince');
    cy.contains('app-shelf-control button', 'Czytam').should('have.attr', 'aria-pressed', 'true');
    cy.request('/api/shelf/the-cruel-prince').its('body.status').should('eq', 'reading');
  });

  it('strona Skarbca: sekcje, ocena, notatka i usuwanie', () => {
    signUp();
    for (const [slug, status] of [
      ['fourth-wing', 'read'],
      ['iron-flame', 'reading'],
    ]) {
      cy.request({ method: 'PUT', url: `/api/shelf/${slug}`, body: { status }, headers: { Origin: Cypress.config('baseUrl')! } });
    }
    cy.intercept('PUT', '/api/shelf/*').as('save');
    cy.visit('/moja-polka');
    cy.contains('h2', 'Czytam').should('contain', '1');
    cy.contains('h2', 'Przeczytane').should('contain', '1');

    cy.contains('li.item', 'Fourth Wing').within(() => {
      cy.contains('label', 'Ocena').find('select').select('5/5');
      cy.wait('@save').its('request.body.rating').should('eq', 5);
      cy.get('textarea').type('Smoki i akademia.').blur();
      cy.wait('@save').its('request.body.note').should('eq', 'Smoki i akademia.');
    });
    cy.request('/api/shelf/fourth-wing').its('body').should('include', { rating: 5, note: 'Smoki i akademia.' });

    cy.contains('li.item', 'Iron Flame').contains('button', 'Zabierz z półki').click();
    cy.contains('li.item', 'Fourth Wing').contains('button', 'Zabierz z półki').click();
    cy.contains('Twój skarbiec jest pusty.');
  });
});
