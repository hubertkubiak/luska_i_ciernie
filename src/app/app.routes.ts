import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

// Bez `title` w trasach: tytuł (i resztę <head>) ustawia każda strona przez Seo.update().
// Router ustawiałby swój tytuł PO stronie (przy NavigationEnd) i nadpisywał ten z Seo.
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
    // Status 404 dla tej trasy ustawia app.routes.server.ts.
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
];
