// SEO is checked on the raw HTML (cy.request) — that is how search engines and link previews see the page,
// since they do not run JavaScript.
describe('SEO', () => {
  const head = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const attr = (selector: string, name: string) => doc.querySelector(selector)?.getAttribute(name);
    return { doc, attr };
  };

  it('strona książki ma meta, hreflang, Open Graph i JSON-LD Book już w HTML z serwera', () => {
    cy.request('/ksiazka/the-cruel-prince').then((res) => {
      const { doc, attr } = head(res.body);
      expect(doc.title).to.eq('Okrutny książę – Holly Black | Łuska i Ciernie');
      expect(attr('meta[name="description"]', 'content')).to.have.length.within(20, 160);
      expect(attr('link[rel="canonical"]', 'href')).to.match(/\/ksiazka\/the-cruel-prince$/);
      expect(attr('link[hreflang="en"]', 'href')).to.match(/\/en\/ksiazka\/the-cruel-prince$/);
      expect(attr('meta[property="og:type"]', 'content')).to.eq('book');
      expect(attr('meta[property="og:image"]', 'content')).to.match(/^https?:\/\//);

      const ld = JSON.parse(doc.querySelector('script#ld-json')!.textContent!);
      expect(ld['@type']).to.eq('Book');
      expect(ld.isbn).to.match(/^97[89]\d{10}$/);
      expect(ld.alternateName).to.eq('The Cruel Prince');
      expect(ld.author.name).to.eq('Holly Black');
    });
  });

  it('po nawigacji kliknięciem <head> opisuje nową stronę, bez resztek poprzedniej', () => {
    cy.visit('/ksiazka/fourth-wing');
    cy.contains('a', 'Iron Flame').click();
    cy.title().should('contain', 'Iron Flame');
    cy.get('head link[rel="canonical"]').should('have.length', 1).and('have.attr', 'href').and('match', /\/ksiazka\/iron-flame$/);
    cy.get('head script#ld-json').should('have.length', 1).invoke('text').should('contain', 'Iron Flame');

    // A page without JSON-LD (the trope list) removes the book's structured data.
    cy.visit('/ksiazka/fourth-wing');
    cy.contains('a', 'Jeźdźcy smoków').click();
    cy.location('pathname').should('eq', '/tropy/jezdzcy-smokow');
    cy.get('head script#ld-json').invoke('text').should('contain', '"ItemList"').and('not.contain', '"Book"');
  });

  it('strona 404 ma noindex i nie ma adresu kanonicznego', () => {
    cy.request({ url: '/zarosla/sciezka', failOnStatusCode: false }).then((res) => {
      const { doc, attr } = head(res.body);
      expect(attr('meta[name="robots"]', 'content')).to.eq('noindex, follow');
      expect(doc.querySelector('link[rel="canonical"]')).to.eq(null);
      expect(doc.title).to.contain('Łuska i Ciernie');
    });
  });

  it('robots.txt i sitemap.xml z obiema wersjami językowymi', () => {
    cy.request('/robots.txt').then((res) => {
      expect(res.headers['content-type']).to.contain('text/plain');
      expect(res.body).to.contain('Disallow: /api/').and.match(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
    });
    cy.request('/sitemap.xml').then((res) => {
      expect(res.headers['content-type']).to.contain('xml');
      const xml = new DOMParser().parseFromString(res.body, 'application/xml');
      expect(xml.querySelector('parsererror'), 'poprawny XML').to.eq(null);
      const locs = [...xml.querySelectorAll('loc')].map((l) => l.textContent!);
      expect(locs.some((l) => l.endsWith('/ksiazka/fourth-wing'))).to.eq(true);
      expect(locs.some((l) => l.endsWith('/en/ksiazka/fourth-wing'))).to.eq(true);
    });
  });
});
