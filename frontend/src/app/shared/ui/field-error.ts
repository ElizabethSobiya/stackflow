import { ChangeDetectionStrategy, Component, input } from '@angular/core';
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
   * A method rather than a `computed`: `AbstractControl` exposes plain properties, not signals, so a
   * computed would cache the first result and never see the control become invalid.
   */
  protected message(): string | null {
    const control = this.control();
    if (!control.errors || (!control.touched && !control.dirty)) {
      return null;
    }
    const [key, value] = Object.entries(control.errors)[0];
    const factory = MESSAGES[key];
    return factory ? factory(value as never) : 'This value is not valid';
  }
}
