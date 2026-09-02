import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toMessage } from '../../core/interceptors/error.interceptor';
import { ProductPayload } from '../../core/models/api.models';
import { ToastService } from '../../core/notifications/toast.service';
import { FieldError } from '../../shared/ui/field-error';
import { Icon } from '../../shared/ui/icon';
import { ProductsService } from './products.service';

const SKU_PATTERN = /^[A-Za-z0-9._-]+$/;

/**
 * Create and edit share one form.
 *
 * <p>The route parameter arrives as a signal input (`withComponentInputBinding`), so the mode is
 * derived from `id()` instead of being passed around as a flag — one component, two routes, no
 * duplicated validation.
 */
@Component({
  selector: 'app-product-form-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, FieldError, Icon],
  template: `
    <div class="page page--narrow">
      <header class="page__header">
        <div class="page__title">
          <h1>{{ id() ? 'Edit product' : 'New product' }}</h1>
          <p class="muted">
            {{ id() ? 'Changing the price does not alter orders already placed.' : 'Stock is created together with the product.' }}
          </p>
        </div>
        <a class="btn" routerLink="/products">
          <app-icon name="arrowLeft" [size]="14" />
          Back to catalog
        </a>
      </header>

      <form class="card" [formGroup]="form" (ngSubmit)="submit()">
        <div class="card__body stack">
          <div class="grid grid--form">
            <div class="field">
              <label class="field__label" for="name">Name</label>
              <input id="name" class="input" formControlName="name" />
              <app-field-error [control]="form.controls.name" />
            </div>

            <div class="field">
              <label class="field__label" for="sku">SKU</label>
              <input id="sku" class="input mono" formControlName="sku" placeholder="ELEC-LAP-001" />
              <app-field-error [control]="form.controls.sku" />
            </div>

            <div class="field">
              <label class="field__label" for="category">Category</label>
              <input id="category" class="input" formControlName="category" list="known-categories" />
              <datalist id="known-categories">
                @for (category of categories(); track category) {
                  <option [value]="category"></option>
                }
              </datalist>
              <app-field-error [control]="form.controls.category" />
            </div>

            <div class="field">
              <label class="field__label" for="price">Unit price</label>
              <input id="price" class="input" type="number" step="0.01" min="0.01" formControlName="price" />
              <app-field-error [control]="form.controls.price" />
            </div>

            @if (!id()) {
              <div class="field">
                <label class="field__label" for="initialQuantity">Opening stock</label>
                <input
                  id="initialQuantity"
                  class="input"
                  type="number"
                  min="0"
                  formControlName="initialQuantity"
                />
                <app-field-error [control]="form.controls.initialQuantity" />
              </div>
            }

            <div class="field">
              <label class="field__label" for="lowStockThreshold">Low-stock threshold</label>
              <input
                id="lowStockThreshold"
                class="input"
                type="number"
                min="0"
                formControlName="lowStockThreshold"
              />
              <app-field-error [control]="form.controls.lowStockThreshold" />
            </div>
          </div>

          <div class="field">
            <label class="field__label" for="description">Description</label>
            <textarea id="description" class="textarea" formControlName="description"></textarea>
            <app-field-error [control]="form.controls.description" />
          </div>

          @if (error(); as message) {
            <p class="alert alert--danger">
              <app-icon name="warning" [size]="15" />
              <span>{{ message }}</span>
            </p>
          }
        </div>

        <div class="card__header form__footer">
          <span class="subtle">{{ id() ? 'Editing product #' + id() : 'New catalog entry' }}</span>
          <div class="row">
            <a class="btn" routerLink="/products">Cancel</a>
            <button type="submit" class="btn btn--primary" [disabled]="submitting() || loading()">
              {{ submitting() ? 'Saving…' : 'Save product' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: `
    .page--narrow { max-width: 860px; }
    .form__footer { border-bottom: none; border-top: 1px solid var(--border); }

  `,
})
export class ProductFormPage {
  /** Route parameter; absent when creating. */
  readonly id = input<number | undefined, string | undefined>(undefined, {
    transform: (value) => (value === undefined ? undefined : Number(value)),
  });

  private readonly products = inject(ProductsService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly categories = signal<string[]>([]);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(160)]],
    sku: ['', [Validators.required, Validators.maxLength(64), Validators.pattern(SKU_PATTERN)]],
    category: ['', [Validators.required, Validators.maxLength(80)]],
    price: [0, [Validators.required, Validators.min(0.01)]],
    initialQuantity: [0, [Validators.min(0)]],
    lowStockThreshold: [5, [Validators.min(0)]],
    description: ['', [Validators.maxLength(1000)]],
  });

  constructor() {
    this.products.categories().subscribe((categories) => this.categories.set(categories));

    // Reacts to the route input rather than reading a snapshot, so /products/1/edit -> /products/2/edit
    // reloads correctly even though Angular reuses the component instance.
    effect(() => {
      const productId = this.id();
      if (productId === undefined || Number.isNaN(productId)) {
        return;
      }
      this.loading.set(true);
      this.products.get(productId).subscribe({
        next: (product) => {
          this.form.patchValue({
            name: product.name,
            sku: product.sku,
            category: product.category,
            price: product.price,
            lowStockThreshold: product.lowStockThreshold ?? 5,
            description: product.description ?? '',
          });
          this.loading.set(false);
        },
        error: (failure: unknown) => {
          this.loading.set(false);
          this.error.set(toMessage(failure, 'Could not load this product.'));
        },
      });
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const payload: ProductPayload = {
      name: raw.name,
      sku: raw.sku,
      category: raw.category,
      price: Number(raw.price),
      description: raw.description || null,
      lowStockThreshold: Number(raw.lowStockThreshold),
      initialQuantity: this.id() ? null : Number(raw.initialQuantity),
    };

    const productId = this.id();
    const request = productId ? this.products.update(productId, payload) : this.products.create(payload);

    request.subscribe({
      next: (product) => {
        this.toast.success(`${product.name} saved.`);
        void this.router.navigate(['/products']);
      },
      error: (failure: unknown) => {
        this.submitting.set(false);
        this.error.set(toMessage(failure, 'Could not save the product.'));
      },
    });
  }
}
