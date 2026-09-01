import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { OrderStatus, OrderSummary } from '../../core/models/api.models';
import { ToastService } from '../../core/notifications/toast.service';
import { createPagedQuery } from '../../shared/data/paged-query';
import { EmptyState } from '../../shared/ui/empty-state';
import { LoadingRows } from '../../shared/ui/loading-rows';
import { Paginator } from '../../shared/ui/paginator';
import { StatusBadge } from '../../shared/ui/status-badge';
import { EMPTY_ORDER_CRITERIA, OrdersService } from './orders.service';

const STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

@Component({
  selector: 'app-order-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DatePipe, RouterLink, StatusBadge, Paginator, EmptyState, LoadingRows],
  template: `
    <div class="page">
      <header class="page__header">
        <div>
          <h1>Orders</h1>
          <p class="muted">{{ query.result()?.totalElements ?? 0 }} orders.</p>
        </div>
        <a class="btn btn--primary" routerLink="/orders/new">New order</a>
      </header>

      <div class="card">
        <div class="card__header filters">
          <input
            class="input filters__search"
            type="search"
            placeholder="Search order number or customer…"
            [value]="query.criteria().search"
            (input)="query.setCriteria({ search: value($event) })"
          />
          <select
            class="select filters__select"
            [value]="query.criteria().status"
            (change)="query.setCriteria({ status: asStatus(value($event)) })"
          >
            <option value="">All statuses</option>
            @for (status of statuses; track status) {
              <option [value]="status">{{ status }}</option>
            }
          </select>
          <button type="button" class="btn btn--ghost btn--sm" (click)="query.resetCriteria()">Clear</button>
        </div>

        @if (query.loading() && query.items().length === 0) {
          <app-loading-rows />
        } @else if (query.error(); as message) {
          <app-empty-state title="Could not load orders" [hint]="message">
            <button type="button" class="btn" (click)="query.reload()">Try again</button>
          </app-empty-state>
        } @else if (query.isEmpty()) {
          <app-empty-state title="No orders match" hint="Try a different filter, or create an order." />
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
                    <td class="subtle">{{ order.createdAt | date: 'short' }}</td>
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
                        <a class="btn btn--sm btn--ghost" [routerLink]="['/orders', order.id]">Open</a>
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
    .filters { flex-wrap: wrap; }
    .filters__search { flex: 1 1 260px; }
    .filters__select { flex: 0 1 180px; }
  `,
})
export class OrderListPage {
  private readonly orders = inject(OrdersService);
  private readonly toast = inject(ToastService);

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

  protected asStatus(value: string): '' | OrderStatus {
    return STATUSES.includes(value as OrderStatus) ? (value as OrderStatus) : '';
  }

  protected label(status: OrderStatus): string {
    return status === 'CANCELLED' ? 'Cancel' : `Mark ${status.toLowerCase()}`;
  }

  protected transition(order: OrderSummary, status: OrderStatus): void {
    this.busyId.set(order.id);
    this.orders.changeStatus(order.id, status).subscribe({
      next: () => {
        this.toast.success(`${order.orderNumber} is now ${status}.`);
        this.busyId.set(null);
        this.query.reload();
      },
      error: () => this.busyId.set(null),
    });
  }
}
