import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { toMessage } from '../../core/interceptors/error.interceptor';
import { Order, OrderStatus } from '../../core/models/api.models';
import { ToastService } from '../../core/notifications/toast.service';
import { StatusBadge } from '../../shared/ui/status-badge';
import { OrdersService } from './orders.service';

@Component({
  selector: 'app-order-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DatePipe, RouterLink, StatusBadge],
  template: `
    <div class="page">
      @if (error(); as message) {
        <div class="card"><div class="card__body">{{ message }}</div></div>
      } @else if (order(); as data) {
        <header class="page__header">
          <div>
            <div class="row">
              <h1 class="mono order__number">{{ data.orderNumber }}</h1>
              <app-status-badge [status]="data.status" />
            </div>
            <p class="muted">
              {{ data.customerName }}
              @if (data.customerEmail) {
                · {{ data.customerEmail }}
              }
              · placed {{ data.createdAt | date: 'medium' }}
            </p>
          </div>
          <div class="row">
            <a class="btn" routerLink="/orders">Back to orders</a>
            @if (auth.isAdmin()) {
              @for (next of data.allowedTransitions; track next) {
                <button
                  type="button"
                  class="btn"
                  [class.btn--primary]="next !== 'CANCELLED'"
                  [class.btn--danger]="next === 'CANCELLED'"
                  [disabled]="busy()"
                  (click)="transition(next)"
                >
                  {{ next === 'CANCELLED' ? 'Cancel order' : 'Mark ' + next.toLowerCase() }}
                </button>
              }
            }
          </div>
        </header>

        @if (data.allowedTransitions.length === 0) {
          <p class="subtle">This order has reached a final state; no further transitions are possible.</p>
        }

        <section class="order__split">
          <div class="card">
            <div class="card__header"><h2>Items</h2></div>
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
                    <td colspan="4" class="text-right"><strong>Total</strong></td>
                    <td class="text-right numeric">
                      <strong>{{ data.totalAmount | currency: 'USD' }}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            @if (data.notes) {
              <div class="card__body order__notes">
                <span class="field__label">Notes</span>
                <p class="muted">{{ data.notes }}</p>
              </div>
            }
          </div>

          <div class="card">
            <div class="card__header"><h2>History</h2></div>
            <div class="card__body">
              <ol class="timeline">
                @for (entry of data.statusHistory; track entry.id) {
                  <li class="timeline__item">
                    <span class="timeline__dot"></span>
                    <div>
                      <div class="timeline__title">
                        {{ entry.fromStatus ? entry.fromStatus + ' → ' + entry.toStatus : entry.toStatus }}
                      </div>
                      <div class="subtle">
                        {{ entry.changedAt | date: 'medium' }}
                        @if (entry.changedBy) {
                          · by user #{{ entry.changedBy }}
                        }
                      </div>
                      @if (entry.note) {
                        <div class="muted timeline__note">{{ entry.note }}</div>
                      }
                    </div>
                  </li>
                }
              </ol>
            </div>
          </div>
        </section>
      } @else {
        <div class="card"><div class="card__body skeleton order__loading"></div></div>
      }
    </div>
  `,
  styles: `
    .order__number { font-size: 20px; }
    .order__split { display: grid; grid-template-columns: 1.7fr 1fr; gap: var(--space-4); align-items: start; }
    .order__notes { border-top: 1px solid var(--border); }
    .order__loading { height: 240px; }

    .timeline { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-4); }
    .timeline__item { display: grid; grid-template-columns: 14px 1fr; gap: var(--space-3); position: relative; }

    .timeline__dot {
      width: 9px;
      height: 9px;
      margin-top: 5px;
      border-radius: 50%;
      background: var(--brand);
    }

    .timeline__item:not(:last-child)::before {
      content: '';
      position: absolute;
      left: 4px;
      top: 16px;
      bottom: -18px;
      width: 1px;
      background: var(--border-strong);
    }

    .timeline__title { font-weight: 550; }
    .timeline__note { font-size: 13px; }

    @media (max-width: 980px) {
      .order__split { grid-template-columns: 1fr; }
    }
  `,
})
export class OrderDetailPage {
  readonly id = input.required<number, string>({ transform: (value) => Number(value) });

  private readonly orders = inject(OrdersService);
  private readonly toast = inject(ToastService);

  protected readonly auth = inject(AuthService);
  protected readonly order = signal<Order | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => this.load(this.id()));
  }

  protected transition(status: OrderStatus): void {
    const current = this.order();
    if (!current) {
      return;
    }
    this.busy.set(true);
    this.orders.changeStatus(current.id, status).subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.busy.set(false);
        this.toast.success(`Order is now ${status}.`);
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
