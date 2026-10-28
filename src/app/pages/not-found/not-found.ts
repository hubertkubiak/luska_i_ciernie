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
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {
  readonly message = input('Nikt nie chodził tędy od stuleci.');
}
