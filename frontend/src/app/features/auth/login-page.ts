import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toMessage } from '../../core/interceptors/error.interceptor';
import { AuthService } from '../../core/auth/auth.service';
import { FieldError } from '../../shared/ui/field-error';
import { Icon } from '../../shared/ui/icon';
import { BrandPanel } from './brand-panel';

const DEMO = { email: 'admin@stackflow.dev', password: 'Password123!' };

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, FieldError, Icon, BrandPanel],
  styleUrl: './auth-card.scss',
  template: `
    <app-brand-panel />

    <div class="form-panel">
      <div class="auth">
        <h1 class="auth__title">Welcome back</h1>
        <p class="auth__subtitle">Sign in to manage your catalog, stock and orders.</p>

        <form class="stack" [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label class="field__label" for="email">Email</label>
            <input
              id="email"
              type="email"
              class="input"
              formControlName="email"
              autocomplete="username"
              placeholder="you@company.com"
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
              placeholder="••••••••"
              [class.is-invalid]="form.controls.password.touched && form.controls.password.invalid"
            />
            <app-field-error [control]="form.controls.password" />
          </div>

          @if (error(); as message) {
            <p class="alert alert--danger">
              <app-icon name="warning" [size]="15" />
              <span>{{ message }}</span>
            </p>
          }

          <button type="submit" class="btn btn--primary auth__submit" [disabled]="submitting()">
            {{ submitting() ? 'Signing in…' : 'Sign in' }}
            @if (!submitting()) {
              <app-icon name="arrowRight" [size]="15" />
            }
          </button>
        </form>

        <p class="auth__alt">No account yet? <a routerLink="/register">Create one</a></p>

        <div class="auth__hint">
          <app-icon name="info" [size]="15" />
          <span class="auth__hint-body">
            <span>Demo account</span>
            <code>{{ demo.email }} · {{ demo.password }}</code>
          </span>
          <button type="button" class="btn btn--sm" (click)="fillDemo()">Use</button>
        </div>
      </div>
    </div>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly demo = DEMO;
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  /** One click to a working session — the demo credentials are seeded, not privileged. */
  protected fillDemo(): void {
    this.form.setValue(DEMO);
  }

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
