import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/notifications/toast.service';
import { Product } from '../../core/models/api.models';
import { createPagedQuery } from '../../shared/data/paged-query';
import { EmptyState } from '../../shared/ui/empty-state';
import { LoadingRows } from '../../shared/ui/loading-rows';
import { Paginator } from '../../shared/ui/paginator';
import { EMPTY_PRODUCT_CRITERIA, ProductsService } from './products.service';

@Component({
  selector: 'app-product-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, RouterLink, Paginator, EmptyState, LoadingRows],
  template: `
    <div class="page">
      <header class="page__header">
        <div>
          <h1>Products</h1>
          <p class="muted">{{ query.result()?.totalElements ?? 0 }} products in the catalog.</p>
        </div>
        @if (auth.isAdmin()) {
          <a class="btn btn--primary" routerLink="/products/new">New product</a>
        }
      </header>

      <div class="card">
        <div class="card__header filters">
          <input
            class="input filters__search"
            type="search"
            placeholder="Search name, SKU or description…"
            [value]="query.criteria().search"
            (input)="query.setCriteria({ search: value($event) })"
          />
          <select
            class="select filters__select"
            [value]="query.criteria().category"
            (change)="query.setCriteria({ category: value($event) })"
          >
            <option value="">All categories</option>
            @for (category of categories(); track category) {
              <option [value]="category">{{ category }}</option>
            }
          </select>
          <select
            class="select filters__select"
            [value]="query.criteria().active"
            (change)="query.setCriteria({ active: value($event) === 'true' ? 'true' : value($event) === 'false' ? 'false' : '' })"
          >
            <option value="">Active and inactive</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
          <button type="button" class="btn btn--ghost btn--sm" (click)="query.resetCriteria()">Clear</button>
        </div>

        @if (query.loading() && query.items().length === 0) {
          <app-loading-rows />
        } @else if (query.error(); as message) {
          <app-empty-state title="Could not load products" [hint]="message">
            <button type="button" class="btn" (click)="query.reload()">Try again</button>
          </app-empty-state>
        } @else if (query.isEmpty()) {
          <app-empty-state title="No products match" hint="Adjust the filters or add a new product." />
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th class="text-right">Price</th>
                  <th class="text-right">In stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (product of query.items(); track product.id) {
                  <tr [class.row--inactive]="!product.active">
                    <td>
                      <div class="product__name">{{ product.name }}</div>
                      @if (!product.active) {
                        <span class="badge">Inactive</span>
                      }
                    </td>
                    <td class="mono">{{ product.sku }}</td>
                    <td>{{ product.category }}</td>
                    <td class="text-right numeric">{{ product.price | currency: 'USD' }}</td>
                    <td class="text-right numeric">
                      {{ product.quantity ?? '—' }}
                      @if (product.lowStock) {
                        <span class="badge badge--warning">Low</span>
                      }
                    </td>
                    <td>
                      @if (auth.isAdmin()) {
                        <div class="table__actions">
                          <a class="btn btn--sm" [routerLink]="['/products', product.id, 'edit']">Edit</a>
                          @if (product.active) {
                            <button
                              type="button"
                              class="btn btn--sm btn--danger"
                              [disabled]="busyId() === product.id"
                              (click)="deactivate(product)"
                            >
                              Deactivate
                            </button>
                          } @else {
                            <button
                              type="button"
                              class="btn btn--sm"
                              [disabled]="busyId() === product.id"
                              (click)="activate(product)"
                            >
                              Activate
                            </button>
                          }
                        </div>
                      }
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
    .filters__select { flex: 0 1 190px; }
    .product__name { font-weight: 550; }
    .row--inactive { opacity: 0.62; }
  `,
})
export class ProductListPage {
  private readonly products = inject(ProductsService);
  private readonly toast = inject(ToastService);

  protected readonly auth = inject(AuthService);
  protected readonly categories = signal<string[]>([]);
  protected readonly busyId = signal<number | null>(null);

  protected readonly query = createPagedQuery(
    (criteria, page) => this.products.search(criteria, page),
    { criteria: EMPTY_PRODUCT_CRITERIA, page: { sort: 'createdAt', direction: 'desc' } },
  );

  constructor() {
    this.products.categories().subscribe((categories) => this.categories.set(categories));
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected deactivate(product: Product): void {
    if (!confirm(`Deactivate ${product.name}? Existing orders keep their history.`)) {
      return;
    }
    this.busyId.set(product.id);
    this.products.deactivate(product.id).subscribe({
      next: () => {
        this.toast.success(`${product.name} deactivated.`);
        this.busyId.set(null);
        this.query.reload();
      },
      error: () => this.busyId.set(null),
    });
  }

  protected activate(product: Product): void {
    this.busyId.set(product.id);
    this.products.activate(product.id).subscribe({
      next: () => {
        this.toast.success(`${product.name} is active again.`);
        this.busyId.set(null);
        this.query.reload();
      },
      error: () => this.busyId.set(null),
    });
  }
}
