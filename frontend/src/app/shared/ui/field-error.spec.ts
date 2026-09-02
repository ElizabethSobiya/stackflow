import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { FieldError } from './field-error';

/**
 * Mirrors how the product and order forms use the component: an OnPush parent whose submit
 * handler marks the controls touched. The app is zoneless, so nothing re-renders unless the
 * component itself reacts to the control changing.
 */
@Component({
  selector: 'app-host',
  imports: [ReactiveFormsModule, FieldError],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <input formControlName="name" />
      <app-field-error [control]="form.controls.name" />
      <button type="submit">Save</button>
    </form>
  `,
})
class Host {
  readonly form = new FormBuilder().nonNullable.group({
    name: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
    }
  }
}

describe('FieldError', () => {
  it('shows the message once the form is submitted with an invalid control', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('required');

    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('This field is required');
  });
});
