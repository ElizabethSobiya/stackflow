import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthResponse } from '../models/api.models';
import { AuthService } from '../auth/auth.service';
import { TokenStorage } from '../auth/token-storage';
import { authInterceptor } from './auth.interceptor';

const SESSION: AuthResponse = {
  accessToken: 'expired-token',
  refreshToken: 'refresh-1',
  expiresInSeconds: 900,
  user: {
    id: 1,
    email: 'staff@stackflow.dev',
    fullName: 'Sam Staff',
    role: 'STAFF',
    enabled: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
};

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    TestBed.inject(TokenStorage).save(SESSION);
    TestBed.inject(AuthService);
  });

  it('attaches the access token', () => {
    http.get('/api/products').subscribe();
    const request = backend.expectOne('/api/products');
    expect(request.request.headers.get('Authorization')).toBe('Bearer expired-token');
    request.flush({});
  });

  it('never sends a token to the login endpoint', () => {
    http.post('/api/auth/login', {}).subscribe();
    const request = backend.expectOne('/api/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('refreshes once on 401 and replays the original request', () => {
    let body: unknown = null;
    http.get('/api/orders').subscribe((response) => (body = response));

    backend.expectOne('/api/orders').flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    backend
      .expectOne((request) => request.url.endsWith('/auth/refresh'))
      .flush({ ...SESSION, accessToken: 'fresh-token' });

    const retried = backend.expectOne('/api/orders');
    expect(retried.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    retried.flush({ ok: true });

    expect(body).toEqual({ ok: true });
  });

  it('does not retry errors other than 401', () => {
    let status = 0;
    http.get('/api/orders').subscribe({ error: (error: { status: number }) => (status = error.status) });

    backend.expectOne('/api/orders').flush({ message: 'nope' }, { status: 403, statusText: 'Forbidden' });

    expect(status).toBe(403);
    backend.expectNone((request) => request.url.endsWith('/auth/refresh'));
  });
});
