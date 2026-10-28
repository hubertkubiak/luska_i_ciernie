import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';
import { firstValueFrom } from 'rxjs';
import type { Trope } from '../shared/models';

// Strategia renderowania per trasa (SPEC §3). Ścieżki muszą odpowiadać tym z app.routes.ts.
export const serverRoutes: ServerRoute[] = [
  // Landing: render na żądanie, choć SPEC §3 proponuje Prerender. Powód: Trop dnia. W prerenderze
  // „dzisiaj” = dzień `ng build`, zapisany w TransferState pliku index.html — strona byłaby spójna
  // przy hydracji, ale codziennie nieaktualna. (Cache do północy UTC dołożymy w etapie 12.)
  { path: '', renderMode: RenderMode.Server },
  // Lista tropów zmienia się rzadko → też plik z buildu (dist/.../browser/tropy/index.html).
  { path: 'tropy', renderMode: RenderMode.Prerender },
  {
    path: 'tropy/:slug',
    renderMode: RenderMode.Prerender,
    // Wołane w `ng build`, w kontekście wstrzykiwania aplikacji serwerowej — działa inject().
    // Zwraca listę parametrów; każdy element = jeden wygenerowany plik HTML.
    async getPrerenderParams() {
      const tropes = await firstValueFrom(inject(HttpClient).get<Trope[]>('/api/tropes'));
      return tropes.map((t) => ({ slug: t.slug }));
    },
    // Slug spoza listy z buildu → render na żądanie (domyślne zachowanie, tu jawnie).
    fallback: PrerenderFallback.Server,
  },
  // Tysiące pozycji i zmienne dane → render na żądanie. 404/301 ustawia sama strona
  // (RESPONSE_INIT), bo zależą od odpowiedzi API.
  { path: 'ksiazka/:slug', renderMode: RenderMode.Server },
  { path: 'autor/:slug', renderMode: RenderMode.Server },
  // Wszystko, czego nie ma wyżej, to nieznany adres → status ustawiony statycznie w konfiguracji.
  // UWAGA: każda nowa trasa z app.routes.ts musi dostać tu własny wpis, inaczej odpowie 404.
  { path: '**', renderMode: RenderMode.Server, status: 404 },
];
