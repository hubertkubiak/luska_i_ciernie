import { RenderMode, ServerRoute } from '@angular/ssr';

// Strategia renderowania per trasa (SPEC §3). Ścieżki muszą odpowiadać tym z app.routes.ts.
export const serverRoutes: ServerRoute[] = [
  // Landing: HTML generowany raz w `ng build` → plik dist/.../browser/index.html.
  { path: '', renderMode: RenderMode.Prerender },
  // Tysiące pozycji i zmienne dane → render na żądanie. 404/301 ustawia sama strona
  // (RESPONSE_INIT), bo zależą od odpowiedzi API.
  { path: 'ksiazka/:slug', renderMode: RenderMode.Server },
  { path: 'autor/:slug', renderMode: RenderMode.Server },
  // Wszystko, czego nie ma wyżej, to nieznany adres → status ustawiony statycznie w konfiguracji.
  // UWAGA: każda nowa trasa z app.routes.ts musi dostać tu własny wpis, inaczej odpowie 404.
  { path: '**', renderMode: RenderMode.Server, status: 404 },
];
