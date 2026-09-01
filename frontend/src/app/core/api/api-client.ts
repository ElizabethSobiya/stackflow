import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Values a query string can carry; `undefined` and `null` are dropped rather than sent as "null". */
export type QueryValue = string | number | boolean | null | undefined;

/**
 * Thin typed wrapper over `HttpClient`.
 *
 * <p>Feature services depend on this rather than on `HttpClient` directly, so the base URL,
 * parameter serialisation and (later) things like request ids live in one place instead of being
 * repeated in every service.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  get<T>(path: string, query: Record<string, QueryValue> = {}): Observable<T> {
    return this.http.get<T>(this.url(path), { params: toParams(query) });
  }

  post<T>(path: string, body: unknown, query: Record<string, QueryValue> = {}): Observable<T> {
    return this.http.post<T>(this.url(path), body, { params: toParams(query) });
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.url(path), body);
  }

  patch<T>(path: string, body: unknown, query: Record<string, QueryValue> = {}): Observable<T> {
    return this.http.patch<T>(this.url(path), body, { params: toParams(query) });
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path));
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }
}

function toParams(query: Record<string, QueryValue>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}
