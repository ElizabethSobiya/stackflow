import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toMessage } from '../../core/interceptors/error.interceptor';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/notifications/toast.service';
import { FieldError } from '../../shared/ui/field-error';

@Component({
  selector: 'app-register-page',
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
          <h1 class="auth__title">Create your account</h1>
          <p class="auth__subtitle">The first account on a new deployment becomes the administrator.</p>

          <form class="stack" [formGroup]="form" (ngSubmit)="submit()">
            <div class="field">
              <label class="field__label" for="fullName">Full name</label>
              <input id="fullName" class="input" formControlName="fullName" autocomplete="name" />
              <app-field-error [control]="form.controls.fullName" />
            </div>

            <div class="field">
              <label class="field__label" for="email">Email</label>
              <input id="email" type="email" class="input" formControlName="email" autocomplete="username" />
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
              />
              <app-field-error [control]="form.controls.password" />
            </div>

            @if (error(); as message) {
              <p class="auth__error">{{ message }}</p>
            }

            <button type="submit" class="btn btn--primary auth__submit" [disabled]="submitting()">
              {{ submitting() ? 'Creating…' : 'Create account' }}
            </button>
          </form>

          <p class="auth__alt subtle">Already registered? <a routerLink="/login">Sign in</a></p>
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
