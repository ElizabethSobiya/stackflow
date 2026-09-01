import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthResponse } from '../models/api.models';
import { AuthService } from './auth.service';

const SESSION: AuthResponse = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiresInSeconds: 900,
  user: {
    id: 1,
    email: 'admin@stackflow.dev',
    fullName: 'Ada Admin',
    role: 'ADMIN',
    enabled: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
};

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  it('starts signed out', () => {
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.user()).toBeNull();
  });

  it('stores the session on a successful login', () => {
    auth.login({ email: 'admin@stackflow.dev', password: 'Password123!' }).subscribe();
    http.expectOne((request) => request.url.endsWith('/auth/login')).flush(SESSION);

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.isAdmin()).toBe(true);
    expect(auth.accessToken).toBe('access-1');
  });

  it('shares one refresh call between concurrent callers', () => {
    auth.login({ email: 'a@b.c', password: 'x' }).subscribe();
    http.expectOne((request) => request.url.endsWith('/auth/login')).flush(SESSION);

    auth.refresh().subscribe();
    auth.refresh().subscribe();

    // Two callers, one network round-trip — otherwise a burst of 401s logs the user out.
    const requests = http.match((request) => request.url.endsWith('/auth/refresh'));
    expect(requests.length).toBe(1);
    requests[0].flush({ ...SESSION, accessToken: 'access-2' });
    expect(auth.accessToken).toBe('access-2');
  });

  it('drops the session when refreshing fails', () => {
    auth.login({ email: 'a@b.c', password: 'x' }).subscribe();
    http.expectOne((request) => request.url.endsWith('/auth/login')).flush(SESSION);

    auth.refresh().subscribe({ error: () => undefined });
    http
      .expectOne((request) => request.url.endsWith('/auth/refresh'))
      .flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.accessToken).toBeNull();
  });

  it('refuses to refresh without a stored token', () => {
    let failed = false;
    auth.refresh().subscribe({ error: () => (failed = true) });
    expect(failed).toBe(true);
    http.expectNone((request) => request.url.endsWith('/auth/refresh'));
  });
});
