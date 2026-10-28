import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Widok „zarosła cierniami”. Sam NIE ustawia statusu HTTP — robią to:
 * - dla nieznanych adresów: `status: 404` przy trasie '**' w app.routes.server.ts (statycznie),
 * - dla nieistniejących książek/autorów: strona przez ServerResponse (dynamicznie, po odpowiedzi API).
 */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <section class="nf">
      <h1>Ta ścieżka zarosła cierniami.</h1>
      <p>{{ message() }}</p>
      <p class="label">Błąd 404 · strona nie istnieje</p>
      <a routerLink="/">Wróć na trakt</a>
    </section>
  `,
  styles: `
    .nf {
      padding: 6rem 1rem;
      text-align: center;
    }
  `,
})
export class NotFound {
  readonly message = input('Nikt nie chodził tędy od stuleci.');
}
