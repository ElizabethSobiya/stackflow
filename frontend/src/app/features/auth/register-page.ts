import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toMessage } from '../../core/interceptors/error.interceptor';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/notifications/toast.service';
import { FieldError } from '../../shared/ui/field-error';
import { Icon } from '../../shared/ui/icon';
import { BrandPanel } from './brand-panel';

@Component({
  selector: 'app-register-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, FieldError, Icon, BrandPanel],
  styleUrl: './auth-card.scss',
  template: `
    <app-brand-panel />

    <div class="form-panel">
      <div class="auth">
        <h1 class="auth__title">Create your account</h1>
        <p class="auth__subtitle">Takes a moment — no email confirmation needed.</p>

        <form class="stack" [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label class="field__label" for="fullName">Full name</label>
            <input id="fullName" class="input" formControlName="fullName" autocomplete="name" placeholder="Ada Lovelace" />
            <app-field-error [control]="form.controls.fullName" />
          </div>

          <div class="field">
            <label class="field__label" for="email">Email</label>
            <input id="email" type="email" class="input" formControlName="email" autocomplete="username" placeholder="you@company.com" />
            <app-field-error [control]="form.controls.email" />
          </div>

          <div class="field">
            <label class="field__label" for="password">Password</label>
            <input
              id="password"
              type="password"
              class="input"
              formControlName="password"
              autocomplete="new-password"
              placeholder="At least 8 characters"
            />
            <app-field-error [control]="form.controls.password" />
            <span class="field__hint">Use 8 characters or more.</span>
          </div>

          @if (error(); as message) {
            <p class="alert alert--danger">
              <app-icon name="warning" [size]="15" />
              <span>{{ message }}</span>
            </p>
          }

          <button type="submit" class="btn btn--primary auth__submit" [disabled]="submitting()">
            {{ submitting() ? 'Creating…' : 'Create account' }}
          </button>
        </form>

        <p class="auth__alt">Already registered? <a routerLink="/login">Sign in</a></p>

        <div class="auth__hint">
          <app-icon name="shield" [size]="15" />
          <span class="auth__hint-body">
            <span>The first account on a new deployment becomes the administrator.</span>
            <span>Later sign-ups get staff access until an admin promotes them.</span>
          </span>
        </div>
      </div>
    </div>
  `,
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
  });

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);

    this.auth.register(this.form.getRawValue()).subscribe({
      next: (session) => {
        this.toast.success(`Welcome, ${session.user.fullName}.`);
        void this.router.navigateByUrl('/dashboard');
      },
      error: (failure: unknown) => {
        this.submitting.set(false);
        this.error.set(toMessage(failure, 'Could not create the account.'));
      },
    });
  }
}
