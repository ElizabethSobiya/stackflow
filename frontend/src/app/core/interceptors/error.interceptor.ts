import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../models/api.models';
import { ToastService } from '../notifications/toast.service';

/** Statuses a component is expected to render itself, so the toast would be noise. */
const SILENT_STATUSES = new Set([401, 422, 400]);

/**
 * Turns transport failures into one user-facing message.
 *
 * <p>The backend always answers with the same `ApiError` shape, so there is exactly one place that
 * needs to know how to read it. Errors are re-thrown afterwards: the toast is a side effect, not a
 * substitute for the component's own handling.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const toast = inject(ToastService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && !SILENT_STATUSES.has(error.status)) {
        toast.error(describe(error));
      }
      return throwError(() => error);
    }),
  );
};

export function describe(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'Cannot reach the server. Check that the API is running.';
  }
  const body = error.error as ApiError | null;
  if (body?.message) {
    return body.message;
  }
  return `Request failed (${error.status}).`;
}

/** Extracts a message a form can show next to its submit button. */
export function toMessage(error: unknown, fallback: string): string {
  return error instanceof HttpErrorResponse ? describe(error) : fallback;
}
