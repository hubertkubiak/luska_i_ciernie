import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { forwardSessionInterceptor } from './forward-session';

function setup(request: Request | null) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([forwardSessionInterceptor])),
      provideHttpClientTesting(),
      ...(request ? [{ provide: REQUEST, useValue: request }] : []),
    ],
  });
  return { http: TestBed.inject(HttpClient), ctrl: TestBed.inject(HttpTestingController) };
}

const incoming = new Request('http://localhost/ksiazka/x', { headers: { cookie: 'theme=parchment; sid=SEKRET; _ga=1' } });

describe('forwardSessionInterceptor', () => {
  it('SSR: forwards ONLY the session cookie, and only to /api/shelf', () => {
    const { http, ctrl } = setup(incoming);
    http.get('/api/shelf/x').subscribe();
    expect(ctrl.expectOne('/api/shelf/x').request.headers.get('Cookie')).toBe('sid=SEKRET');
  });

  it('never sends the session to the catalog or to another server', () => {
    const { http, ctrl } = setup(incoming);
    http.get('/api/books/x').subscribe();
    http.get('https://evil.example/api/shelf').subscribe();
    expect(ctrl.expectOne('/api/books/x').request.headers.has('Cookie')).toBe(false);
    expect(ctrl.expectOne('https://evil.example/api/shelf').request.headers.has('Cookie')).toBe(false);
  });

  it('does nothing in the browser (no REQUEST) — the browser attaches cookies itself', () => {
    const { http, ctrl } = setup(null);
    http.get('/api/shelf/x').subscribe();
    expect(ctrl.expectOne('/api/shelf/x').request.headers.has('Cookie')).toBe(false);
  });
});
