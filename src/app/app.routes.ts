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
    // Na razie łapie wszystkie nieistniejące linki z nawigacji. Status HTTP to wciąż 200 —
    // naprawimy to w etapie 4 przez RESPONSE_INIT.
    path: '**',
    title: 'Ścieżka zarosła cierniami',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
];
