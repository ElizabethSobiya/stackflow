import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../core/dialog/confirm.service';
import { ToastService } from '../../core/notifications/toast.service';
import { Product } from '../../core/models/api.models';
import { createPagedQuery } from '../../shared/data/paged-query';
import { EmptyState } from '../../shared/ui/empty-state';
import { Icon } from '../../shared/ui/icon';
import { LoadingRows } from '../../shared/ui/loading-rows';
import { Paginator } from '../../shared/ui/paginator';
import { EMPTY_PRODUCT_CRITERIA, ProductsService } from './products.service';

@Component({
  selector: 'app-product-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, RouterLink, Paginator, EmptyState, LoadingRows, Icon],
  template: `
    <div class="page">
      <header class="page__header">
        <div class="page__title">
          <h1>Products</h1>
          <p class="muted">{{ query.result()?.totalElements ?? 0 }} products in the catalog.</p>
        </div>
        @if (auth.isAdmin()) {
          <a class="btn btn--primary" routerLink="/products/new">
            <app-icon name="plus" [size]="14" />
            New product
          </a>
        }
      </header>

      <div class="card">
        <div class="card__header filters">
          <div class="input-group filters__search">
            <span class="input-group__icon"><app-icon name="search" [size]="15" /></span>
            <input
              class="input"
              type="search"
              placeholder="Search name, SKU or description…"
              aria-label="Search products"
              [value]="query.criteria().search"
              (input)="query.setCriteria({ search: value($event) })"
            />
          </div>

          <select
            class="select filters__select"
            aria-label="Filter by category"
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
            aria-label="Filter by status"
            [value]="query.criteria().active"
            (change)="query.setCriteria({ active: asActive(value($event)) })"
          >
            <option value="">Active and inactive</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>

          @if (hasFilters()) {
            <button type="button" class="btn btn--ghost btn--sm" (click)="query.resetCriteria()">
              <app-icon name="close" [size]="13" />
              Clear
            </button>
          }
        </div>

        @if (query.loading() && query.items().length === 0) {
          <app-loading-rows />
        } @else if (query.error(); as message) {
          <app-empty-state icon="warning" title="Could not load products" [hint]="message">
            <button type="button" class="btn" (click)="query.reload()">Try again</button>
          </app-empty-state>
        } @else if (query.isEmpty()) {
          <app-empty-state
            icon="package"
            title="No products match"
            hint="Adjust the filters, or add a product to the catalog."
          />
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
                  @if (auth.isAdmin()) {
                    <th></th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (product of query.items(); track product.id) {
                  <tr [class.is-inactive]="!product.active">
                    <td>
                      <div class="product">
                        <span class="product__name">{{ product.name }}</span>
                        @if (!product.active) {
                          <span class="badge">Inactive</span>
                        }
                      </div>
                    </td>
                    <td class="mono">{{ product.sku }}</td>
                    <td>{{ product.category }}</td>
                    <td class="text-right numeric">{{ product.price | currency: 'USD' }}</td>
                    <td class="text-right">
                      <span class="stock">
                        <span class="numeric">{{ product.quantity ?? '—' }}</span>
                        @if (product.lowStock) {
                          <span class="badge badge--warning">Low</span>
                        }
                      </span>
                    </td>
                    @if (auth.isAdmin()) {
                      <td>
                        <div class="table__actions">
                          <a
                            class="btn btn--sm btn--icon"
                            [routerLink]="['/products', product.id, 'edit']"
                            [attr.aria-label]="'Edit ' + product.name"
                            title="Edit"
                          >
                            <app-icon name="edit" [size]="14" />
                          </a>
                          @if (product.active) {
                            <button
                              type="button"
                              class="btn btn--sm btn--icon btn--danger"
                              [disabled]="busyId() === product.id"
                              [attr.aria-label]="'Deactivate ' + product.name"
                              title="Deactivate"
                              (click)="deactivate(product)"
                            >
                              <app-icon name="trash" [size]="14" />
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
                      </td>
                    }
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
    .filters { flex-wrap: wrap; gap: var(--space-2); }
    .filters__search { flex: 1 1 260px; }
    .filters__select { flex: 0 1 180px; }
    .product { display: flex; align-items: center; gap: var(--space-2); }
    .product__name { font-weight: 550; }
    .stock { display: inline-flex; align-items: center; gap: 6px; justify-content: flex-end; }
    .is-inactive { opacity: 0.62; }
  `,
})
export class ProductListPage {
  private readonly products = inject(ProductsService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

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

  protected asActive(value: string): '' | 'true' | 'false' {
    return value === 'true' || value === 'false' ? value : '';
  }

  protected hasFilters(): boolean {
    const criteria = this.query.criteria();
    return Boolean(criteria.search || criteria.category || criteria.active);
  }

  protected async deactivate(product: Product): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: `Deactivate ${product.name}?`,
      message:
        'It stops appearing in the sellable catalog. Existing orders keep their history, and you can reactivate it at any time.',
      confirmLabel: 'Deactivate',
      danger: true,
    });
    if (!confirmed) {
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
