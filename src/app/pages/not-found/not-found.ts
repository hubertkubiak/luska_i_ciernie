import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <section class="nf">
      <h1>Ta ścieżka zarosła cierniami.</h1>
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
export class NotFound {}
