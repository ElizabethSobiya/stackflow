import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';

const MESSAGES: Record<string, (error: never) => string> = {
  required: () => 'This field is required',
  email: () => 'Enter a valid email address',
  min: (error: { min: number }) => `Must be at least ${error.min}`,
  max: (error: { max: number }) => `Must be at most ${error.max}`,
  minlength: (error: { requiredLength: number }) => `Use at least ${error.requiredLength} characters`,
  maxlength: (error: { requiredLength: number }) => `Use at most ${error.requiredLength} characters`,
  pattern: () => 'Use letters, digits, dot, dash or underscore only',
  positiveNumber: () => 'Enter a number greater than zero',
};

/**
 * Renders the first validation error of a control, but only once the user has touched it.
 *
 * <p>Centralising the wording means a validator's message is written once rather than duplicated in
 * every template that uses it.
 */
@Component({
  selector: 'app-field-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message(); as text) {
      <span class="field__error">{{ text }}</span>
    }
  `,
})
export class FieldError {
  readonly control = input.required<AbstractControl>();

  /**
   * `AbstractControl` exposes plain properties rather than signals, and the app is zoneless, so
   * marking a control touched notifies nothing: this component is OnPush and its input keeps the
   * same reference, so it is skipped on the parent's next check and the error never appears. Its
   * event stream supplies the notification the properties do not.
   */
  private readonly revision = signal(0);

  constructor() {
    effect((onCleanup) => {
      const subscription = this.control().events.subscribe(() => this.revision.update((n) => n + 1));
      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected readonly message = computed<string | null>(() => {
    this.revision();
    const control = this.control();
    if (!control.errors || (!control.touched && !control.dirty)) {
      return null;
    }
    const [key, value] = Object.entries(control.errors)[0];
    const factory = MESSAGES[key];
    return factory ? factory(value as never) : 'This value is not valid';
  });
}
