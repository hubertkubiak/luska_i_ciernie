describe('Premiery', () => {
  it('HTML z serwera: odliczanie w dniach, kanał RSS i cache dla CDN', () => {
    cy.request('/premiery').then((res) => {
      expect(res.headers['cache-control']).to.contain('s-maxage=3600');
      expect(res.body).to.contain('application/rss+xml');
      expect(res.body).to.match(/class="badge"[^>]*>\s*(za \d+ dni|jutro|dziś premiera|już w księgarniach|termin przybliżony)/);
    });
  });

  it('po hydracji liczba dni się nie zmienia (wspólny dzień renderu z TransferState)', () => {
    let fromServer: string[] = [];
    cy.visit('/premiery', {
      onBeforeLoad(win) {
        cy.spy(win.console, 'error').as('consoleError');
        win.document.addEventListener('readystatechange', () => {
          if (win.document.readyState === 'interactive') {
            fromServer = [...win.document.querySelectorAll('.badge')].map((b) => b.textContent!.trim());
          }
        });
      },
    });
    cy.get('.badge').should('have.length.greaterThan', 0);
    cy.get('.badge').then(($b) => expect([...$b].map((b) => b.textContent!.trim())).to.deep.eq(fromServer));
    cy.get('@consoleError').should('not.have.been.called');
  });

  it('termin przybliżony: miesiąc lub kwartał zamiast dnia, bez odliczania', () => {
    cy.visit('/premiery');
    cy.get('li.approximate').should('have.length.greaterThan', 0);
    cy.get('li.approximate').each(($li) => {
      expect($li.find('time').attr('datetime')).to.match(/^\d{4}(-\d{2})?$/);
      expect($li.find('time').text()).to.match(/^(\p{L}+ \d{4}|[IV]+ kw\. \d{4})$/u);
      expect($li.find('.badge').text().trim()).to.eq('termin przybliżony');
    });
    // The featured "nearest prophecy" is always one with a known day.
    cy.get('.featured .author').invoke('text').should('match', /\d{1,2} \p{L}+ \d{4}/u);
  });

  it('RSS to poprawny XML z pozycjami', () => {
    cy.request('/rss/premiery').then((res) => {
      expect(res.headers['content-type']).to.contain('application/rss+xml');
      const xml = new DOMParser().parseFromString(res.body, 'application/xml');
      expect(xml.querySelector('parsererror')).to.eq(null);
      expect(xml.querySelectorAll('item').length).to.be.greaterThan(0);
    });
  });
});
