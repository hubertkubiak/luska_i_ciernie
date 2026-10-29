import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE_NAME, Seo } from '../../core/seo';
import { Sparks } from '../../ui/sparks/sparks';
import { TropeOfTheDay } from './trope-of-the-day/trope-of-the-day';

@Component({
  selector: 'app-home',
  imports: [RouterLink, Sparks, TropeOfTheDay],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  constructor() {
    const seo = inject(Seo);
    const home = seo.link('/');
    seo.update({
      title: $localize`:@@title.home:Łuska i Ciernie — romantasy po tropach`,
      description: $localize`:@@seo.homeDescription:Archiwum romantasy czytane po tropach: od enemies to lovers po jeźdźców smoków. Szukaj książek po tropach, pikanterii i statusie serii.`,
      path: '/',
      jsonLd: {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: home,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${home}szukaj?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    });
  }
}
