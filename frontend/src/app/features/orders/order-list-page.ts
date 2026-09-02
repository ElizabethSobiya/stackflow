import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../core/dialog/confirm.service';
import { OrderStatus, OrderSummary } from '../../core/models/api.models';
import { ToastService } from '../../core/notifications/toast.service';
import { createPagedQuery } from '../../shared/data/paged-query';
import { EmptyState } from '../../shared/ui/empty-state';
import { Icon } from '../../shared/ui/icon';
import { LoadingRows } from '../../shared/ui/loading-rows';
import { Paginator } from '../../shared/ui/paginator';
import { StatusBadge } from '../../shared/ui/status-badge';
import { EMPTY_ORDER_CRITERIA, OrdersService } from './orders.service';

const STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

@Component({
  selector: 'app-order-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe, DatePipe, LowerCasePipe, RouterLink,
    StatusBadge, Paginator, EmptyState, LoadingRows, Icon,
  ],
  template: `
    <div class="page">
      <header class="page__header">
        <div class="page__title">
          <h1>Orders</h1>
          <p class="muted">{{ query.result()?.totalElements ?? 0 }} orders.</p>
        </div>
        <a class="btn btn--primary" routerLink="/orders/new">
          <app-icon name="plus" [size]="14" />
          New order
        </a>
      </header>

      <div class="card">
        <div class="card__header filters">
          <div class="input-group filters__search">
            <span class="input-group__icon"><app-icon name="search" [size]="15" /></span>
            <input
              class="input"
              type="search"
              placeholder="Search order number or customer…"
              aria-label="Search orders"
              [value]="query.criteria().search"
              (input)="query.setCriteria({ search: value($event) })"
            />
          </div>

          <div class="chips" role="group" aria-label="Filter by status">
            <button
              type="button"
              class="chip"
              [class.chip--active]="query.criteria().status === ''"
              (click)="query.setCriteria({ status: '' })"
            >
              All
            </button>
            @for (status of statuses; track status) {
              <button
                type="button"
                class="chip"
                [class.chip--active]="query.criteria().status === status"
                (click)="query.setCriteria({ status })"
              >
                {{ status | lowercase }}
              </button>
            }
          </div>
        </div>

        @if (query.loading() && query.items().length === 0) {
          <app-loading-rows />
        } @else if (query.error(); as message) {
          <app-empty-state icon="warning" title="Could not load orders" [hint]="message">
            <button type="button" class="btn" (click)="query.reload()">Try again</button>
          </app-empty-state>
        } @else if (query.isEmpty()) {
          <app-empty-state icon="orders" title="No orders match" hint="Try a different filter, or create an order.">
            <a class="btn btn--primary" routerLink="/orders/new">New order</a>
          </app-empty-state>
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th class="text-right">Units</th>
                  <th class="text-right">Total</th>
                  <th>Placed</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (order of query.items(); track order.id) {
                  <tr>
                    <td><a class="mono" [routerLink]="['/orders', order.id]">{{ order.orderNumber }}</a></td>
                    <td>{{ order.customerName }}</td>
                    <td><app-status-badge [status]="order.status" /></td>
                    <td class="text-right numeric">{{ order.totalUnits }}</td>
                    <td class="text-right numeric">{{ order.totalAmount | currency: 'USD' }}</td>
                    <td class="subtle">{{ order.createdAt | date: 'MMM d, HH:mm' }}</td>
                    <td>
                      <div class="table__actions">
                        @if (auth.isAdmin()) {
                          @for (next of order.allowedTransitions; track next) {
                            <button
                              type="button"
                              class="btn btn--sm"
                              [class.btn--danger]="next === 'CANCELLED'"
                              [disabled]="busyId() === order.id"
                              (click)="transition(order, next)"
                            >
                              {{ label(next) }}
                            </button>
                          }
                        }
                        <a
                          class="btn btn--sm btn--icon btn--ghost"
                          [routerLink]="['/orders', order.id]"
                          [attr.aria-label]="'Open ' + order.orderNumber"
                          title="Open order"
                        >
                          <app-icon name="chevronRight" [size]="15" />
                        </a>
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
    </div>
  `,
  styles: `
    .filters { flex-wrap: wrap; gap: var(--space-3); }
    .filters__search { flex: 1 1 240px; }
    .chips { display: flex; flex-wrap: wrap; gap: 4px; }

    .chip {
      padding: 4px 11px;
      font: inherit;
      font-size: 12.5px;
      font-weight: 500;
      text-transform: capitalize;
      color: var(--text-muted);
      background: var(--surface-sunken);
      border: 1px solid transparent;
      border-radius: var(--radius-pill);
      cursor: pointer;
      transition: background var(--transition), color var(--transition), border-color var(--transition);
    }

    .chip:hover { color: var(--text); }
    .chip--active { background: var(--accent-soft); color: var(--accent); border-color: var(--accent-border); }
  `,
})
export class OrderListPage {
  private readonly orders = inject(OrdersService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly auth = inject(AuthService);
  protected readonly statuses = STATUSES;
  protected readonly busyId = signal<number | null>(null);

  protected readonly query = createPagedQuery(
    (criteria, page) => this.orders.search(criteria, page),
    { criteria: EMPTY_ORDER_CRITERIA, page: { sort: 'createdAt', direction: 'desc' } },
  );

  protected value(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected label(status: OrderStatus): string {
    return status === 'CANCELLED' ? 'Cancel' : `Mark ${status.toLowerCase()}`;
  }

  protected async transition(order: OrderSummary, status: OrderStatus): Promise<void> {
    // Confirming commits stock and cancelling releases it — both deserve a beat of thought.
    if (status === 'CANCELLED' || status === 'CONFIRMED') {
      const confirmed = await this.confirm.ask({
        title: status === 'CANCELLED' ? `Cancel ${order.orderNumber}?` : `Confirm ${order.orderNumber}?`,
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

    this.busyId.set(order.id);
    this.orders.changeStatus(order.id, status).subscribe({
      next: () => {
        this.toast.success(`${order.orderNumber} is now ${status.toLowerCase()}.`);
        this.busyId.set(null);
        this.query.reload();
      },
      error: () => this.busyId.set(null),
    });
  }
}
