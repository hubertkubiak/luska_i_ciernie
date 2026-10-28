import { RenderMode, ServerRoute } from '@angular/ssr';

// Strategia renderowania per trasa (SPEC §3). Ścieżki muszą odpowiadać tym z app.routes.ts.
export const serverRoutes: ServerRoute[] = [
  // Landing: HTML generowany raz w `ng build` → plik dist/.../browser/index.html.
  { path: '', renderMode: RenderMode.Prerender },
  // Wszystko inne renderowane na żądanie przez server.ts (AngularNodeAppEngine).
  { path: '**', renderMode: RenderMode.Server },
];
