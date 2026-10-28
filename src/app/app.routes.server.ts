import { RenderMode, ServerRoute } from '@angular/ssr';

// Strategia renderowania per trasa (SPEC §3). Ścieżki muszą odpowiadać tym z app.routes.ts.
export const serverRoutes: ServerRoute[] = [
  // Landing: HTML generowany raz w `ng build` → plik dist/.../browser/index.html.
  { path: '', renderMode: RenderMode.Prerender },
  // Tysiące pozycji i zmienne dane → render na żądanie. Wpis jest jawny (choć '**' i tak
  // by go objął), żeby mapa tras była czytelna.
  { path: 'ksiazka/:slug', renderMode: RenderMode.Server },
  // Wszystko inne renderowane na żądanie przez server.ts (AngularNodeAppEngine).
  { path: '**', renderMode: RenderMode.Server },
];
