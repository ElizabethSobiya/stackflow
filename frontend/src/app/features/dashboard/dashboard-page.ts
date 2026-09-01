import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toMessage } from '../../core/interceptors/error.interceptor';
import { DashboardSummary, OrderStatus } from '../../core/models/api.models';
import { StatusBadge } from '../../shared/ui/status-badge';
import { EmptyState } from '../../shared/ui/empty-state';
import { DashboardService } from './dashboard.service';
import { MetricCard } from './metric-card';
import { RevenueChart } from './revenue-chart';

const STATUS_ORDER: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink, MetricCard, RevenueChart, StatusBadge, EmptyState],
  template: `
    <div class="page">
      <header class="page__header">
        <div>
          <h1>Dashboard</h1>
          <p class="muted">Operations at a glance.</p>
        </div>
        <button type="button" class="btn" [disabled]="loading()" (click)="load()">
          {{ loading() ? 'Refreshing…' : 'Refresh' }}
        </button>
      </header>

      @if (error(); as message) {
        <div class="card"><div class="card__body">{{ message }}</div></div>
      } @else if (summary(); as data) {
        <section class="grid grid--metrics">
          <app-metric-card label="Orders" [value]="data.totalOrders" hint="All time" />
          <app-metric-card
            label="Revenue (7 days)"
            [value]="data.revenueThisWeek | currency: 'USD' : 'symbol' : '1.0-0'"
            hint="Confirmed and beyond"
          />
          <app-metric-card label="Low stock" [value]="data.lowStockCount" hint="At or below threshold" />
          <app-metric-card
            label="Units on hand"
            [value]="data.unitsOnHand | number"
            [hint]="data.activeProducts + ' active products'"
          />
        </section>

        <section class="dashboard__split">
          <div class="card">
            <div class="card__header"><h2>Revenue, last 7 days</h2></div>
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
                  <div class="status-row__bar">
                    <div class="status-row__fill" [style.width.%]="row.percent"></div>
                  </div>
                  <span class="numeric">{{ row.count }}</span>
                </div>
              }
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card__header">
            <h2>Recent orders</h2>
            <a routerLink="/orders">View all</a>
          </div>
          @if (data.recentOrders.length === 0) {
            <app-empty-state title="No orders yet" hint="Create one to see it here." />
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
                      <td class="subtle">{{ order.createdAt | date: 'medium' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      } @else {
        <div class="card"><div class="card__body skeleton dashboard__loading"></div></div>
      }
    </div>
  `,
  styles: `
    .dashboard__split {
      display: grid;
      gap: var(--space-4);
      grid-template-columns: 1.6fr 1fr;
    }

    .status-row { display: grid; grid-template-columns: 110px 1fr 40px; align-items: center; gap: var(--space-3); }
    .status-row__bar { height: 8px; border-radius: 999px; background: var(--surface-sunken); overflow: hidden; }
    .status-row__fill { height: 100%; background: var(--brand); border-radius: 999px; }
    .status-row span { text-align: right; }
    .dashboard__loading { height: 220px; }

    @media (max-width: 980px) {
      .dashboard__split { grid-template-columns: 1fr; }
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
