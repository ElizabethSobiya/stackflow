import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../models/api.models';
import { AuthService } from './auth.service';
import { ToastService } from '../notifications/toast.service';

/**
 * Route-level role check.
 *
 * <p>Purely a UX affordance: the server enforces the same rule with `@PreAuthorize`, so bypassing
 * this guard in the browser buys an attacker a 403, not access.
 */
export function roleGuard(...roles: Role[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const toast = inject(ToastService);

    if (auth.hasRole(...roles)) {
      return true;
    }
    toast.error('You do not have permission to open that page.');
    return router.createUrlTree(['/dashboard']);
  };
}
