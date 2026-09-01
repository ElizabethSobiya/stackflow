import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toMessage } from '../../core/interceptors/error.interceptor';
import { AuthService } from '../../core/auth/auth.service';
import { FieldError } from '../../shared/ui/field-error';

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, FieldError],
  styleUrl: './auth-card.scss',
  template: `
    <div class="auth">
      <div class="auth__brand">
        <span class="auth__mark">SF</span>
        <strong>StackFlow</strong>
      </div>

      <div class="card">
        <div class="card__body">
          <h1 class="auth__title">Sign in</h1>
          <p class="auth__subtitle">Inventory and order management</p>

          <form class="stack" [formGroup]="form" (ngSubmit)="submit()">
            <div class="field">
              <label class="field__label" for="email">Email</label>
              <input
                id="email"
                type="email"
                class="input"
                formControlName="email"
                autocomplete="username"
                [class.is-invalid]="form.controls.email.touched && form.controls.email.invalid"
              />
              <app-field-error [control]="form.controls.email" />
            </div>

            <div class="field">
              <label class="field__label" for="password">Password</label>
              <input
                id="password"
                type="password"
                class="input"
                formControlName="password"
                autocomplete="current-password"
                [class.is-invalid]="form.controls.password.touched && form.controls.password.invalid"
              />
              <app-field-error [control]="form.controls.password" />
            </div>

            @if (error(); as message) {
              <p class="auth__error">{{ message }}</p>
            }

            <button type="submit" class="btn btn--primary auth__submit" [disabled]="submitting()">
              {{ submitting() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>

          <p class="auth__alt subtle">
            No account yet? <a routerLink="/register">Create one</a>
          </p>

          <p class="auth__hint">
            Demo data: <strong>admin&#64;stackflow.dev</strong> / <strong>Password123!</strong>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
        void this.router.navigateByUrl(returnUrl);
      },
      error: (failure: unknown) => {
        this.submitting.set(false);
        this.error.set(toMessage(failure, 'Could not sign in. Please try again.'));
      },
    });
  }
}
