import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, shareReplay, tap, throwError } from 'rxjs';
import { ApiClient } from '../api/api-client';
import { AuthResponse, Role, User } from '../models/api.models';
import { TokenStorage } from './token-storage';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload extends LoginPayload {
  fullName: string;
}

/**
 * Session state and the token lifecycle.
 *
 * <p>The current user is a signal, so guards, the shell and any component read the same value with
 * no subscription bookkeeping. Refresh is single-flight: several requests failing with 401 at once
 * share one refresh call instead of racing each other into a logout.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);
  private readonly storage = inject(TokenStorage);
  private readonly router = inject(Router);

  private readonly currentUser = signal<User | null>(this.storage.user);
  private refreshInFlight: Observable<AuthResponse> | null = null;

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');

  get accessToken(): string | null {
    return this.storage.accessToken;
  }

  hasRole(...roles: Role[]): boolean {
    const role = this.currentUser()?.role;
    return role !== undefined && roles.includes(role);
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.api
      .post<AuthResponse>('/auth/login', payload)
      .pipe(tap((session) => this.startSession(session)));
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.api
      .post<AuthResponse>('/auth/register', payload)
      .pipe(tap((session) => this.startSession(session)));
  }

  /**
   * Exchanges the refresh token for a new pair.
   *
   * <p>Concurrent callers get the same in-flight request, so one expired access token produces one
   * refresh, not one per queued request.
   */
  refresh(): Observable<AuthResponse> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }
    const refreshToken = this.storage.refreshToken;
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    this.refreshInFlight = this.api.post<AuthResponse>('/auth/refresh', { refreshToken }).pipe(
      tap((session) => this.startSession(session)),
      catchError((error: unknown) => {
        this.endSession();
        return throwError(() => error);
      }),
      finalize(() => (this.refreshInFlight = null)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    return this.refreshInFlight;
  }

  /** Revokes server-side refresh tokens, then clears the local session either way. */
  logout(redirectTo = '/login'): void {
    const finish = () => {
      this.endSession();
      void this.router.navigate([redirectTo]);
    };
    if (!this.storage.accessToken) {
      finish();
      return;
    }
    this.api.post<void>('/auth/logout', {}).subscribe({ next: finish, error: finish });
  }

  /** Clears the session without a server call — used when a token turns out to be unusable. */
  endSession(): void {
    this.storage.clear();
    this.currentUser.set(null);
  }

  private startSession(session: AuthResponse): void {
    this.storage.save(session);
    this.currentUser.set(session.user);
  }
}
