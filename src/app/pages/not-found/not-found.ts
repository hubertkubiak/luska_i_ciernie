import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Seo } from '../../core/seo';

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
  readonly message = input($localize`:@@notFound.default:Nikt nie chodził tędy od stuleci.`);

  constructor() {
    // noindex: strona błędu nie powinna trafić do wyników wyszukiwania (status 404 to jedno,
    // ale meta robots chroni też przed indeksowaniem, gdyby status kiedyś się zgubił).
    inject(Seo).update({
      title: $localize`:@@title.notFound:Ścieżka zarosła cierniami`,
      description: $localize`:@@notFound.default:Nikt nie chodził tędy od stuleci.`,
      path: inject(Router).url,
      noindex: true,
    });
  }
}
