import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toMessage } from '../../core/interceptors/error.interceptor';
import { DashboardSummary, OrderStatus } from '../../core/models/api.models';
import { StatusBadge } from '../../shared/ui/status-badge';
import { EmptyState } from '../../shared/ui/empty-state';
import { Icon } from '../../shared/ui/icon';
import { DashboardService } from './dashboard.service';
import { MetricCard } from './metric-card';
import { RevenueChart } from './revenue-chart';

const STATUS_ORDER: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

/* Mixed down from the full status colour: at bar size a saturated fill shouts, and this
   panel is meant to be scanned, not stared at. */
const STATUS_TONE: Record<OrderStatus, string> = {
  PENDING: 'color-mix(in srgb, var(--warning) 62%, transparent)',
  CONFIRMED: 'color-mix(in srgb, var(--accent) 62%, transparent)',
  SHIPPED: 'color-mix(in srgb, var(--info) 62%, transparent)',
  DELIVERED: 'color-mix(in srgb, var(--success) 62%, transparent)',
  CANCELLED: 'color-mix(in srgb, var(--danger) 62%, transparent)',
};

@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe, DatePipe, DecimalPipe, RouterLink,
    MetricCard, RevenueChart, StatusBadge, EmptyState, Icon,
  ],
  template: `
    <div class="page">
      <header class="page__header">
        <div class="page__title">
          <h1>Dashboard</h1>
          <p class="muted">Operations at a glance.</p>
        </div>
        <button type="button" class="btn" [disabled]="loading()" (click)="load()">
          <app-icon name="refresh" [size]="14" />
          {{ loading() ? 'Refreshing…' : 'Refresh' }}
        </button>
      </header>

      @if (error(); as message) {
        <div class="card">
          <app-empty-state icon="warning" title="Could not load the dashboard" [hint]="message">
            <button type="button" class="btn" (click)="load()">Try again</button>
          </app-empty-state>
        </div>
      } @else if (summary(); as data) {
        <section class="grid grid--metrics">
          <app-metric-card label="Orders" [value]="data.totalOrders" icon="orders" tone="accent" hint="All time" />
          <app-metric-card
            label="Revenue · 7 days"
            [value]="data.revenueThisWeek | currency: 'USD' : 'symbol' : '1.0-0'"
            icon="money"
            tone="success"
            hint="Confirmed and beyond"
          />
          <app-metric-card
            label="Low stock"
            [value]="data.lowStockCount"
            icon="alert"
            [tone]="data.lowStockCount > 0 ? 'warning' : 'success'"
            [hint]="data.lowStockCount > 0 ? 'Needs restocking' : 'All above threshold'"
          />
          <app-metric-card
            label="Units on hand"
            [value]="data.unitsOnHand | number"
            icon="package"
            tone="info"
            [hint]="data.activeProducts + ' active products'"
          />
        </section>

        <section class="split">
          <div class="card">
            <div class="card__header">
              <div>
                <h2>Revenue</h2>
                <p class="subtle">Last 7 days, orders confirmed or beyond</p>
              </div>
              <app-icon name="trending" [size]="16" />
            </div>
            <div class="card__body">
              <app-revenue-chart [points]="data.revenueSeries" />
            </div>
          </div>

          <div class="card">
            <div class="card__header"><h2>Orders by status</h2></div>
            <div class="card__body stack">
              @for (row of statusRows(); track row.status) {
                <div class="status-row">
                  <app-status-badge [status]="row.status" />
                  <span class="status-row__track">
                    <span
                      class="status-row__fill"
                      [style.width.%]="row.percent"
                      [style.background]="row.colour"
                    ></span>
                  </span>
                  <span class="status-row__count numeric">{{ row.count }}</span>
                </div>
              }
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card__header">
            <h2>Recent orders</h2>
            <a class="link-row" routerLink="/orders">
              View all
              <app-icon name="arrowRight" [size]="13" />
            </a>
          </div>

          @if (data.recentOrders.length === 0) {
            <app-empty-state icon="inbox" title="No orders yet" hint="Create one to see it here.">
              <a class="btn btn--primary" routerLink="/orders/new">
                <app-icon name="plus" [size]="14" />
                New order
              </a>
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
                  </tr>
                </thead>
                <tbody>
                  @for (order of data.recentOrders; track order.id) {
                    <tr>
                      <td><a class="mono" [routerLink]="['/orders', order.id]">{{ order.orderNumber }}</a></td>
                      <td>{{ order.customerName }}</td>
                      <td><app-status-badge [status]="order.status" /></td>
                      <td class="text-right numeric">{{ order.totalUnits }}</td>
                      <td class="text-right numeric">{{ order.totalAmount | currency: 'USD' }}</td>
                      <td class="subtle">{{ order.createdAt | date: 'MMM d, HH:mm' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      } @else {
        <section class="grid grid--metrics">
          @for (placeholder of [1, 2, 3, 4]; track placeholder) {
            <div class="card skeleton skeleton--metric"></div>
          }
        </section>
        <div class="card skeleton skeleton--panel"></div>
      }
    </div>
  `,
  styles: `
    .split { display: grid; grid-template-columns: 1.65fr 1fr; gap: var(--space-4); align-items: start; }

    .status-row { display: grid; grid-template-columns: 96px 1fr 34px; align-items: center; gap: var(--space-3); }
    .status-row__track { height: 7px; border-radius: var(--radius-pill); background: var(--surface-sunken); overflow: hidden; }
    .status-row__fill { display: block; height: 100%; border-radius: var(--radius-pill); transition: width 260ms ease; }
    .status-row__count { text-align: right; font-size: 13px; color: var(--text-muted); }

    .link-row { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 500; }
    .skeleton--metric { height: 108px; border: none; }
    .skeleton--panel { height: 260px; border: none; }

    @media (max-width: 1000px) {
      .split { grid-template-columns: 1fr; }
    }
  `,
})
export class DashboardPage {
  private readonly dashboard = inject(DashboardService);

  protected readonly summary = signal<DashboardSummary | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly statusRows = computed(() => {
    const counts = this.summary()?.ordersByStatus;
    if (!counts) {
      return [];
    }
    const max = Math.max(1, ...STATUS_ORDER.map((status) => counts[status] ?? 0));
    return STATUS_ORDER.map((status) => ({
      status,
      count: counts[status] ?? 0,
      percent: ((counts[status] ?? 0) / max) * 100,
      colour: STATUS_TONE[status],
    }));
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.dashboard.summary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.loading.set(false);
        this.error.set(toMessage(failure, 'Could not load the dashboard.'));
      },
    });
  }
}
