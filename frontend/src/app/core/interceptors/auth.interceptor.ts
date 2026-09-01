import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

const AUTH_FREE_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

/**
 * Attaches the access token and transparently recovers from an expired one.
 *
 * <p>Access tokens are short-lived by design, so a 401 in the middle of a session is expected, not
 * exceptional: refresh once, replay the original request, and only fall back to signing the user
 * out if the refresh itself fails. Endpoints that mint tokens are skipped, otherwise a failed login
 * would trigger a refresh loop.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);

  if (AUTH_FREE_PATHS.some((path) => request.url.includes(path))) {
    return next(request);
  }

  const token = auth.accessToken;
  const authorised = token ? withBearer(request, token) : request;

  return next(authorised).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !token) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        switchMap((session) => next(withBearer(request, session.accessToken))),
        catchError((refreshError: unknown) => {
          auth.logout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};

function withBearer(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
