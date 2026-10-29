// cy.request wysyła zwykłe żądanie HTTP (jak curl) — widzimy dokładnie to, co dostaje
// wyszukiwarka, zanim jakikolwiek JavaScript się wykona.
describe('Kody HTTP z SSR', () => {
  const status = (url: string) =>
    cy.request({ url, failOnStatusCode: false, followRedirect: false });

  it('200 dla istniejącej książki, autorki i tropu', () => {
    status('/ksiazka/fourth-wing').its('status').should('eq', 200);
    status('/autor/holly-black').its('status').should('eq', 200);
    status('/tropy').its('status').should('eq', 200);
    status('/szukaj?trop=slow-burn').its('status').should('eq', 200);
    status('/tropy/enemies-to-lovers').its('status').should('eq', 200);
  });

  it('404 dla nieistniejącej książki, autorki, tropu i nieznanej ścieżki', () => {
    status('/ksiazka/nie-ma-takiej-ksiazki').its('status').should('eq', 404);
    status('/autor/nikt-taki').its('status').should('eq', 404);
    status('/tropy/nie-ma-takiej-runy').its('status').should('eq', 404);
    status('/zarosla/sciezka').its('status').should('eq', 404);
  });

  it('301 ze starego sluga na adres kanoniczny', () => {
    status('/ksiazka/okrutny-ksiaze').then((res) => {
      expect(res.status).to.eq(301);
      expect(res.redirectedToUrl).to.match(/\/ksiazka\/the-cruel-prince$/);
    });
  });

  it('przeglądarka idzie za 301 i ląduje na adresie kanonicznym', () => {
    cy.visit('/ksiazka/okrutny-ksiaze');
    cy.location('pathname').should('eq', '/ksiazka/the-cruel-prince');
    cy.contains('h1', 'Okrutny książę');
  });
});
