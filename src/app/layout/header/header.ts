import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  path: string;
  /** Klimatyczna nazwa (SPEC §2.6)… */
  label: string;
  /** …zawsze w parze z jasnym znaczeniem. */
  meaning: string;
}

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  // Większość tych tras jeszcze nie istnieje — trafią na stronę „zarosła cierniami”.
  protected readonly nav: NavItem[] = [
    { path: '/szukaj', label: 'Przeszukaj archiwum', meaning: 'Szukaj książek' },
    { path: '/tropy', label: 'Tropy', meaning: 'Katalog tropów' },
    { path: '/premiery', label: 'Nadchodzące przepowiednie', meaning: 'Kalendarz premier' },
    { path: '/wyrocznia', label: 'Wyrocznia', meaning: 'Quiz rekomendacji' },
    { path: '/moja-polka', label: 'Skarbiec', meaning: 'Twoje książki' },
  ];
}
