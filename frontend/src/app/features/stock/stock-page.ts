import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, LowerCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toMessage } from '../../core/interceptors/error.interceptor';
import { StockItem, StockMovement, StockMovementReason } from '../../core/models/api.models';
import { ToastService } from '../../core/notifications/toast.service';
import { pageRequest } from '../../core/api/page-request';
import { createPagedQuery } from '../../shared/data/paged-query';
import { EmptyState } from '../../shared/ui/empty-state';
import { FieldError } from '../../shared/ui/field-error';
import { Icon } from '../../shared/ui/icon';
import { LoadingRows } from '../../shared/ui/loading-rows';
import { Paginator } from '../../shared/ui/paginator';
import { StockService } from './stock.service';

const REASONS: StockMovementReason[] = [
  'PURCHASE_RECEIVED',
  'MANUAL_ADJUSTMENT',
  'DAMAGE_WRITE_OFF',
  'STOCK_COUNT_CORRECTION',
];

@Component({
  selector: 'app-stock-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DatePipe,
    LowerCasePipe,
    ReactiveFormsModule,
    RouterLink,
    Paginator,
    EmptyState,
    LoadingRows,
    FieldError,
    Icon,
  ],
  template: `
    <div class="page">
      <header class="page__header">
        <div class="page__title">
          <h1>Stock</h1>
          <p class="muted">
            Products at or below their low-stock threshold. Every adjustment is recorded with a reason.
          </p>
        </div>
        <button type="button" class="btn" (click)="query.reload()">
          <app-icon name="refresh" [size]="14" />
          Refresh
        </button>
      </header>

      <div class="stock__split">
        <div class="card">
          <div class="card__header"><h2>Low stock</h2></div>

          @if (query.loading() && query.items().length === 0) {
            <app-loading-rows />
          } @else if (query.isEmpty()) {
            <app-empty-state
              icon="check"
              title="Everything is above threshold"
              hint="Nothing needs restocking right now."
            />
          } @else {
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th class="text-right">On hand</th>
                    <th class="text-right">Threshold</th>
                    <th class="text-right">Value</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of query.items(); track item.productId) {
                    <tr [class.row--selected]="selected()?.productId === item.productId">
                      <td>{{ item.productName }}</td>
                      <td class="mono">{{ item.sku }}</td>
                      <td class="text-right numeric">
                        {{ item.quantity }}
                        <span class="badge badge--warning">Low</span>
                      </td>
                      <td class="text-right numeric">{{ item.lowStockThreshold }}</td>
                      <td class="text-right numeric">{{ item.price * item.quantity | currency: 'USD' }}</td>
                      <td>
                        <div class="table__actions">
                          <button type="button" class="btn btn--sm" (click)="select(item)">
                            <app-icon name="edit" [size]="13" />
                            Adjust
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <app-paginator [page]="query.result()" (pageChange)="query.goToPage($event)" />
          }
        </div>

        <div class="card">
          @if (selected(); as item) {
            <div class="card__header">
              <h2>{{ item.productName }}</h2>
              <button
                type="button"
                class="btn btn--sm btn--icon btn--ghost"
                aria-label="Close adjustment panel"
                (click)="selected.set(null)"
              >
                <app-icon name="close" [size]="14" />
              </button>
            </div>

            <form class="card__body stack" [formGroup]="form" (ngSubmit)="adjust()">
              <p class="subtle">
                On hand <strong class="numeric">{{ item.quantity }}</strong> ·
                <a [routerLink]="['/products', item.productId, 'edit']">edit product</a>
              </p>

              <div class="field">
                <label class="field__label" for="delta">Change (negative removes stock)</label>
                <input id="delta" class="input numeric" type="number" formControlName="delta" />
                <app-field-error [control]="form.controls.delta" />
              </div>

              <div class="field">
                <label class="field__label" for="reason">Reason</label>
                <select id="reason" class="select" formControlName="reason">
                  @for (reason of reasons; track reason) {
                    <option [value]="reason">{{ reason.replaceAll('_', ' ') | lowercase }}</option>
                  }
                </select>
              </div>

              <div class="field">
                <label class="field__label" for="note">Note</label>
                <input id="note" class="input" formControlName="note" maxlength="255" />
              </div>

              @if (error(); as message) {
                <p class="alert alert--danger">
                  <app-icon name="warning" [size]="15" />
                  <span>{{ message }}</span>
                </p>
              }

              <button type="submit" class="btn btn--primary" [disabled]="submitting()">
                {{ submitting() ? 'Applying…' : 'Apply adjustment' }}
              </button>
            </form>

            <div class="card__header"><h3>Recent movements</h3></div>
            <div class="card__body">
              @if (movements().length === 0) {
                <p class="subtle">No movements recorded yet.</p>
              } @else {
                <ul class="movements">
                  @for (movement of movements(); track movement.id) {
                    <li class="movements__row">
                      <span class="movements__delta" [class.movements__delta--out]="movement.delta < 0">
                        {{ movement.delta > 0 ? '+' : '' }}{{ movement.delta }}
                      </span>
                      <div>
                        <div>{{ movement.reason.replaceAll('_', ' ') | lowercase }}</div>
                        <div class="subtle">
                          {{ movement.createdAt | date: 'short' }} · left {{ movement.resultingQuantity }}
                        </div>
                      </div>
                    </li>
                  }
                </ul>
              }
            </div>
          } @else {
            <app-empty-state
              icon="layers"
              title="Select a product"
              hint="Choose a row to adjust its stock and see its movement history."
            />
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    .stock__split { display: grid; grid-template-columns: 1.6fr 1fr; gap: var(--space-4); align-items: start; }
    .row--selected { background: var(--brand-soft); }
    .movements { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-3); }
    .movements__row { display: grid; grid-template-columns: 52px 1fr; gap: var(--space-3); align-items: center; }

    .movements__delta {
      font-variant-numeric: tabular-nums;
      font-weight: 650;
      text-align: right;
      color: var(--success);
    }

    .movements__delta--out { color: var(--danger); }

    @media (max-width: 980px) {
      .stock__split { grid-template-columns: 1fr; }
    }
  `,
})
export class StockPage {
  private readonly stock = inject(StockService);
  private readonly toast = inject(ToastService);

  protected readonly reasons = REASONS;
  protected readonly selected = signal<StockItem | null>(null);
  protected readonly movements = signal<StockMovement[]>([]);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly query = createPagedQuery<Record<string, never>, StockItem>(
    (_criteria, page) => this.stock.lowStock(page),
    { criteria: {}, page: { sort: 'quantity', direction: 'asc' }, debounceMs: 0 },
  );

  protected readonly form = inject(FormBuilder).nonNullable.group({
    delta: [1, [Validators.required]],
    reason: ['PURCHASE_RECEIVED' as StockMovementReason, [Validators.required]],
    note: ['', [Validators.maxLength(255)]],
  });

  protected select(item: StockItem): void {
    this.selected.set(item);
    this.error.set(null);
    this.form.patchValue({ delta: Math.max(1, item.lowStockThreshold * 2 - item.quantity) });
    this.loadMovements(item.productId);
  }

  protected adjust(): void {
    const item = this.selected();
    const raw = this.form.getRawValue();
    if (!item || this.submitting()) {
      return;
    }
    if (!raw.delta) {
      this.error.set('Enter a non-zero change.');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.stock.adjust(item.productId, { delta: Number(raw.delta), reason: raw.reason, note: raw.note || null }).subscribe({
      next: (view) => {
        this.submitting.set(false);
        this.toast.success(`${item.productName}: now ${view.quantity} in stock.`);
        this.selected.set({ ...item, quantity: view.quantity, lowStock: view.lowStock });
        this.loadMovements(item.productId);
        this.query.reload();
      },
      error: (failure: unknown) => {
        this.submitting.set(false);
        this.error.set(toMessage(failure, 'Could not adjust the stock.'));
      },
    });
  }

  private loadMovements(productId: number): void {
    this.stock
      .movements(productId, pageRequest({ size: 8, sort: 'createdAt', direction: 'desc' }))
      .subscribe((page) => this.movements.set(page.content));
  }
}
