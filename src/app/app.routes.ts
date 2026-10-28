import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Łuska i Ciernie — romantasy po tropach',
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
    // Status 404 dla tej trasy ustawia app.routes.server.ts.
    path: '**',
    title: 'Ścieżka zarosła cierniami',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
];
