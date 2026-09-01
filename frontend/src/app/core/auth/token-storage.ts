import { Injectable } from '@angular/core';
import { AuthResponse, User } from '../models/api.models';

const ACCESS_TOKEN_KEY = 'stackflow.accessToken';
const REFRESH_TOKEN_KEY = 'stackflow.refreshToken';
const USER_KEY = 'stackflow.user';

/**
 * Isolates every `localStorage` touch behind one class.
 *
 * <p>Local storage is a deliberate trade-off: it survives a reload (so a refresh does not log you
 * out) but is readable by any script on the origin. The production-grade alternative — refresh
 * token in an httpOnly, SameSite cookie — needs a cookie-issuing endpoint and CSRF protection on
 * the API. Confining storage here means that change touches this file and nothing else.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  get accessToken(): string | null {
    return this.read(ACCESS_TOKEN_KEY);
  }

  get refreshToken(): string | null {
    return this.read(REFRESH_TOKEN_KEY);
  }

  get user(): User | null {
    const raw = this.read(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as User;
    } catch {
      this.clear();
      return null;
    }
  }

  save(session: AuthResponse): void {
    this.write(ACCESS_TOKEN_KEY, session.accessToken);
    this.write(REFRESH_TOKEN_KEY, session.refreshToken);
    this.write(USER_KEY, JSON.stringify(session.user));
  }

  clear(): void {
    [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY].forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* storage unavailable (private mode); the session simply does not persist */
      }
    });
  }

  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore: the app still works for the lifetime of the tab */
    }
  }
}
