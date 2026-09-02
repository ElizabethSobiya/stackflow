import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toMessage } from '../../core/interceptors/error.interceptor';
import { Product } from '../../core/models/api.models';
import { ToastService } from '../../core/notifications/toast.service';
import { createPagedQuery } from '../../shared/data/paged-query';
import { EmptyState } from '../../shared/ui/empty-state';
import { FieldError } from '../../shared/ui/field-error';
import { Icon } from '../../shared/ui/icon';
import { EMPTY_PRODUCT_CRITERIA, ProductsService } from '../products/products.service';
import { OrdersService } from './orders.service';

interface Line {
  product: Product;
  quantity: number;
}

/**
 * Order builder: search the catalog on the left, assemble lines on the right.
 *
 * <p>The basket is local state only — nothing is reserved until the order is created, and stock is
 * not committed until an admin confirms it. Quantities are checked against the stock the server
 * reported, but the authoritative check happens on confirmation, where it cannot be raced.
 */
@Component({
  selector: 'app-order-create-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink, EmptyState, FieldError, Icon],
  template: `
    <div class="page">
      <header class="page__header">
        <div>
          <h1>New order</h1>
          <p class="muted">Pick products, then place the order. It starts as PENDING.</p>
        </div>
        <a class="btn" routerLink="/orders">Cancel</a>
      </header>

      <div class="order-create">
        <section class="card">
          <div class="card__header">
            <div class="input-group picker__search">
              <span class="input-group__icon"><app-icon name="search" [size]="15" /></span>
              <input
                class="input"
                type="search"
                placeholder="Search the catalog…"
                aria-label="Search the catalog"
                [value]="catalog.criteria().search"
                (input)="catalog.setCriteria({ search: value($event) })"
              />
            </div>
          </div>

          @if (catalog.isEmpty()) {
            <app-empty-state icon="search" title="No products found" hint="Try another search term." />
          } @else {
            <ul class="picker">
              @for (product of catalog.items(); track product.id) {
                <li class="picker__row">
                  <div>
                    <div class="picker__name">{{ product.name }}</div>
                    <div class="subtle">
                      <span class="mono">{{ product.sku }}</span>
                      · {{ product.price | currency: 'USD' }}
                      · {{ product.quantity ?? 0 }} in stock
                    </div>
                  </div>
                  <button
                    type="button"
                    class="btn btn--sm"
                    [disabled]="(product.quantity ?? 0) === 0"
                    [attr.aria-label]="'Add ' + product.name + ' to the order'"
                    (click)="addLine(product)"
                  >
                    <app-icon name="plus" [size]="13" />
                    Add
                  </button>
                </li>
              }
            </ul>
          }
        </section>

        <form class="card" [formGroup]="form" (ngSubmit)="submit()">
          <div class="card__header"><h2>Order</h2></div>

          <div class="card__body stack">
            <div class="field">
              <label class="field__label" for="customerName">Customer</label>
              <input id="customerName" class="input" formControlName="customerName" />
              <app-field-error [control]="form.controls.customerName" />
            </div>

            <div class="field">
              <label class="field__label" for="customerEmail">Customer email</label>
              <input id="customerEmail" class="input" type="email" formControlName="customerEmail" />
              <app-field-error [control]="form.controls.customerEmail" />
            </div>

            <div class="field">
              <label class="field__label" for="notes">Notes</label>
              <textarea id="notes" class="textarea" formControlName="notes"></textarea>
            </div>

            @if (lines().length === 0) {
              <p class="basket-empty subtle">
                <app-icon name="inbox" [size]="15" />
                No items yet — add products from the catalog.
              </p>
            } @else {
              <ul class="lines">
                @for (line of lines(); track line.product.id) {
                  <li class="lines__row">
                    <div>
                      <div class="picker__name">{{ line.product.name }}</div>
                      <div class="subtle">{{ line.product.price | currency: 'USD' }} each</div>
                    </div>
                    <input
                      class="input lines__qty numeric"
                      type="number"
                      min="1"
                      [max]="line.product.quantity ?? 9999"
                      [value]="line.quantity"
                      (input)="setQuantity(line, value($event))"
                    />
                    <span class="numeric">{{ line.product.price * line.quantity | currency: 'USD' }}</span>
                    <button
                      type="button"
                      class="btn btn--sm btn--icon btn--ghost"
                      [attr.aria-label]="'Remove ' + line.product.name"
                      (click)="removeLine(line)"
                    >
                      <app-icon name="close" [size]="14" />
                    </button>
                  </li>
                }
              </ul>

              <div class="row lines__total">
                <span class="spacer"></span>
                <strong>Total {{ total() | currency: 'USD' }}</strong>
              </div>
            }

            @if (error(); as message) {
              <p class="alert alert--danger">
                <app-icon name="warning" [size]="15" />
                <span>{{ message }}</span>
              </p>
            }
          </div>

          <div class="card__header form__footer">
            <span class="subtle">{{ totalUnits() }} unit(s)</span>
            <button
              type="submit"
              class="btn btn--primary"
              [disabled]="submitting() || lines().length === 0"
            >
              {{ submitting() ? 'Placing…' : 'Place order' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: `
    .order-create { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); align-items: start; }
    .picker__search { width: 100%; }

    .basket-empty {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: var(--space-4);
      border: 1px dashed var(--border-strong);
      border-radius: var(--radius-sm);
      background: var(--surface-inset);
    }
    .picker, .lines { list-style: none; margin: 0; padding: 0; }

    .picker__row, .lines__row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-5);
      border-bottom: 1px solid var(--border);
    }

    .picker__row > div:first-child, .lines__row > div:first-child { flex: 1; min-width: 0; }
    .picker__row:last-child { border-bottom: none; }
    .picker__name { font-weight: 550; }
    .lines__row { padding-inline: 0; }
    .lines__qty { width: 78px; }
    .lines__total { padding-top: var(--space-2); }
    .form__footer { border-bottom: none; border-top: 1px solid var(--border); }


    @media (max-width: 980px) {
      .order-create { grid-template-columns: 1fr; }
    }
  `,
})
export class OrderCreatePage {
  private readonly products = inject(ProductsService);
  private readonly orders = inject(OrdersService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly lines = signal<Line[]>([]);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly total = computed(() =>
    this.lines().reduce((sum, line) => sum + line.product.price * line.quantity, 0),
  );
  protected readonly totalUnits = computed(() =>
    this.lines().reduce((sum, line) => sum + line.quantity, 0),
  );

  protected readonly catalog = createPagedQuery(
    (criteria, page) => this.products.search(criteria, page),
    { criteria: { ...EMPTY_PRODUCT_CRITERIA, active: 'true' as const }, page: { size: 8, sort: 'name', direction: 'asc' } },
  );

  protected readonly form = inject(FormBuilder).nonNullable.group({
    customerName: ['', [Validators.required, Validators.maxLength(160)]],
    customerEmail: ['', [Validators.email]],
    notes: ['', [Validators.maxLength(500)]],
  });

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected addLine(product: Product): void {
    this.lines.update((lines) => {
      const existing = lines.find((line) => line.product.id === product.id);
      if (!existing) {
        return [...lines, { product, quantity: 1 }];
      }
      return lines.map((line) =>
        line.product.id === product.id
          ? { ...line, quantity: Math.min(line.quantity + 1, product.quantity ?? line.quantity + 1) }
          : line,
      );
    });
  }

  protected setQuantity(line: Line, raw: string): void {
    const quantity = Math.max(1, Number(raw) || 1);
    this.lines.update((lines) =>
      lines.map((current) => (current.product.id === line.product.id ? { ...current, quantity } : current)),
    );
  }

  protected removeLine(line: Line): void {
    this.lines.update((lines) => lines.filter((current) => current.product.id !== line.product.id));
  }

  protected submit(): void {
    if (this.form.invalid || this.lines().length === 0 || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    this.orders
      .create({
        customerName: raw.customerName,
        customerEmail: raw.customerEmail || null,
        notes: raw.notes || null,
        items: this.lines().map((line) => ({ productId: line.product.id, quantity: line.quantity })),
      })
      .subscribe({
        next: (order) => {
          this.toast.success(`Order ${order.orderNumber} created.`);
          void this.router.navigate(['/orders', order.id]);
        },
        error: (failure: unknown) => {
          this.submitting.set(false);
          this.error.set(toMessage(failure, 'Could not place the order.'));
        },
      });
  }
}
