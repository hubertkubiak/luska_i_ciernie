import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

// No `title` on routes: every page sets the title (and the rest of <head>) via Seo.update().
// The router would set its title AFTER the page (on NavigationEnd) and overwrite the one from Seo.
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'ksiazka/:slug',
    loadComponent: () => import('./pages/book/book').then((m) => m.BookPage),
  },
  {
    path: 'autor/:slug',
    loadComponent: () => import('./pages/author/author').then((m) => m.AuthorPage),
  },
  {
    path: 'szukaj',
    loadComponent: () => import('./pages/search/search').then((m) => m.SearchPage),
  },
  {
    path: 'tropy',
    loadComponent: () => import('./pages/tropes/tropes').then((m) => m.TropesPage),
  },
  {
    path: 'tropy/:slug',
    loadComponent: () => import('./pages/trope/trope').then((m) => m.TropePage),
  },
  {
    path: 'premiery',
    loadComponent: () => import('./pages/releases/releases').then((m) => m.ReleasesPage),
  },
  {
    path: 'wyrocznia',
    loadComponent: () => import('./pages/oracle/oracle').then((m) => m.OraclePage),
  },
  {
    path: 'logowanie',
    data: { mode: 'login' },
    loadComponent: () => import('./pages/auth/auth').then((m) => m.AuthPage),
  },
  {
    path: 'rejestracja',
    data: { mode: 'register' },
    loadComponent: () => import('./pages/auth/auth').then((m) => m.AuthPage),
  },
  {
    path: 'moja-polka',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/shelf/shelf').then((m) => m.ShelfPage),
  },
  {
    // The 404 status for this route is set by app.routes.server.ts.
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
];
