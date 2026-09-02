import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../core/dialog/confirm.service';
import { toMessage } from '../../core/interceptors/error.interceptor';
import { Order, OrderStatus } from '../../core/models/api.models';
import { ToastService } from '../../core/notifications/toast.service';
import { EmptyState } from '../../shared/ui/empty-state';
import { Icon } from '../../shared/ui/icon';
import { StatusBadge } from '../../shared/ui/status-badge';
import { OrdersService } from './orders.service';

@Component({
  selector: 'app-order-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DatePipe, LowerCasePipe, RouterLink, StatusBadge, EmptyState, Icon],
  template: `
    <div class="page">
      @if (error(); as message) {
        <div class="card">
          <app-empty-state icon="warning" title="Could not load this order" [hint]="message">
            <a class="btn" routerLink="/orders">Back to orders</a>
          </app-empty-state>
        </div>
      } @else if (order(); as data) {
        <header class="page__header">
          <div class="page__title">
            <a class="back" routerLink="/orders">
              <app-icon name="arrowLeft" [size]="13" />
              Orders
            </a>
            <div class="row">
              <h1 class="mono order__number">{{ data.orderNumber }}</h1>
              <app-status-badge [status]="data.status" />
            </div>
            <p class="muted">
              {{ data.customerName }}
              @if (data.customerEmail) {
                · <a href="mailto:{{ data.customerEmail }}">{{ data.customerEmail }}</a>
              }
              · placed {{ data.createdAt | date: 'MMM d, y, HH:mm' }}
            </p>
          </div>

          @if (auth.isAdmin() && data.allowedTransitions.length > 0) {
            <div class="row row--wrap">
              @for (next of data.allowedTransitions; track next) {
                <button
                  type="button"
                  class="btn"
                  [class.btn--primary]="next !== 'CANCELLED'"
                  [class.btn--danger]="next === 'CANCELLED'"
                  [disabled]="busy()"
                  (click)="transition(next)"
                >
                  {{ next === 'CANCELLED' ? 'Cancel order' : 'Mark ' + (next | lowercase) }}
                </button>
              }
            </div>
          }
        </header>

        @if (data.allowedTransitions.length === 0) {
          <p class="alert alert--info">
            <app-icon name="info" [size]="15" />
            <span>This order is in a final state — no further transitions are possible.</span>
          </p>
        }

        <section class="split">
          <div class="stack">
            <div class="card">
              <div class="card__header">
                <h2>Items</h2>
                <span class="subtle">{{ data.items.length }} line(s)</span>
              </div>
              <div class="table-wrap">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th class="text-right">Qty</th>
                      <th class="text-right">Unit price</th>
                      <th class="text-right">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of data.items; track item.id) {
                      <tr>
                        <td>{{ item.productName }}</td>
                        <td class="mono">{{ item.sku }}</td>
                        <td class="text-right numeric">{{ item.quantity }}</td>
                        <td class="text-right numeric">{{ item.unitPrice | currency: 'USD' }}</td>
                        <td class="text-right numeric">{{ item.lineTotal | currency: 'USD' }}</td>
                      </tr>
                    }
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="4" class="text-right">Total</td>
                      <td class="text-right numeric order__total">{{ data.totalAmount | currency: 'USD' }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            @if (data.notes) {
              <div class="card">
                <div class="card__header"><h2>Notes</h2></div>
                <div class="card__body"><p class="muted">{{ data.notes }}</p></div>
              </div>
            }
          </div>

          <div class="card">
            <div class="card__header">
              <h2>History</h2>
              <app-icon name="history" [size]="15" />
            </div>
            <div class="card__body">
              <ol class="timeline">
                @for (entry of data.statusHistory; track entry.id) {
                  <li class="timeline__item">
                    <span class="timeline__dot"></span>
                    <div class="timeline__body">
                      <span class="timeline__title">
                        @if (entry.fromStatus) {
                          {{ entry.fromStatus | lowercase }}
                          <app-icon name="arrowRight" [size]="11" />
                        }
                        {{ entry.toStatus | lowercase }}
                      </span>
                      <span class="subtle">
                        {{ entry.changedAt | date: 'MMM d, HH:mm' }}
                        @if (entry.changedBy) {
                          · user #{{ entry.changedBy }}
                        }
                      </span>
                      @if (entry.note) {
                        <span class="timeline__note">{{ entry.note }}</span>
                      }
                    </div>
                  </li>
                }
              </ol>
            </div>
          </div>
        </section>
      } @else {
        <div class="card skeleton skeleton--detail"></div>
      }
    </div>
  `,
  styles: `
    .back {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12.5px;
      color: var(--text-muted);
      margin-bottom: 2px;
    }

    .back:hover { color: var(--accent); }
    .order__number { font-size: 19px; }
    .order__total { font-weight: 650; }
    .split { display: grid; grid-template-columns: 1.7fr 1fr; gap: var(--space-4); align-items: start; }
    .skeleton--detail { height: 280px; border: none; }

    .timeline { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-4); }
    .timeline__item { position: relative; display: grid; grid-template-columns: 12px 1fr; gap: var(--space-3); }

    .timeline__dot {
      width: 9px;
      height: 9px;
      margin-top: 5px;
      border-radius: 50%;
      background: var(--surface-card);
      border: 2px solid var(--accent);
    }

    .timeline__item:not(:last-child)::before {
      content: '';
      position: absolute;
      left: 4px;
      top: 17px;
      bottom: -18px;
      width: 1px;
      background: var(--border-strong);
    }

    .timeline__body { display: flex; flex-direction: column; gap: 1px; }

    .timeline__title {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-weight: 550;
      text-transform: capitalize;
    }

    .timeline__note { font-size: 12.5px; color: var(--text-muted); margin-top: 2px; }

    @media (max-width: 1000px) {
      .split { grid-template-columns: 1fr; }
    }
  `,
})
export class OrderDetailPage {
  readonly id = input.required<number, string>({ transform: (value) => Number(value) });

  private readonly orders = inject(OrdersService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly auth = inject(AuthService);
  protected readonly order = signal<Order | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => this.load(this.id()));
  }

  protected async transition(status: OrderStatus): Promise<void> {
    const current = this.order();
    if (!current) {
      return;
    }

    if (status === 'CANCELLED' || status === 'CONFIRMED') {
      const confirmed = await this.confirm.ask({
        title: status === 'CANCELLED' ? 'Cancel this order?' : 'Confirm this order?',
        message:
          status === 'CANCELLED'
            ? 'Any stock committed to this order is returned to inventory. This cannot be undone.'
            : 'Stock for every line is deducted from inventory when the order is confirmed.',
        confirmLabel: status === 'CANCELLED' ? 'Cancel order' : 'Confirm order',
        cancelLabel: 'Not now',
        danger: status === 'CANCELLED',
      });
      if (!confirmed) {
        return;
      }
    }

    this.busy.set(true);
    this.orders.changeStatus(current.id, status).subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.busy.set(false);
        this.toast.success(`Order is now ${status.toLowerCase()}.`);
      },
      error: () => this.busy.set(false),
    });
  }

  private load(id: number): void {
    this.error.set(null);
    this.orders.get(id).subscribe({
      next: (order) => this.order.set(order),
      error: (failure: unknown) => this.error.set(toMessage(failure, 'Could not load this order.')),
    });
  }
}
