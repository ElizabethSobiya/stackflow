import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
import { PageRequest, pageParams } from '../../core/api/page-request';
import { PageResponse, Product, ProductPayload } from '../../core/models/api.models';

export interface ProductCriteria {
  search: string;
  category: string;
  active: '' | 'true' | 'false';
}

export const EMPTY_PRODUCT_CRITERIA: ProductCriteria = { search: '', category: '', active: '' };

/** Every catalog call the app makes, in one place. Components never build URLs themselves. */
@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly api = inject(ApiClient);

  search(criteria: ProductCriteria, page: PageRequest): Observable<PageResponse<Product>> {
    return this.api.get<PageResponse<Product>>('/products', {
      ...pageParams(page),
      search: criteria.search,
      category: criteria.category,
      active: criteria.active,
    });
  }

  get(id: number): Observable<Product> {
    return this.api.get<Product>(`/products/${id}`);
  }

  categories(): Observable<string[]> {
    return this.api.get<string[]>('/products/categories');
  }

  create(payload: ProductPayload): Observable<Product> {
    return this.api.post<Product>('/products', payload);
  }

  update(id: number, payload: ProductPayload): Observable<Product> {
    return this.api.put<Product>(`/products/${id}`, payload);
  }

  deactivate(id: number): Observable<void> {
    return this.api.delete<void>(`/products/${id}`);
  }

  activate(id: number): Observable<Product> {
    return this.api.post<Product>(`/products/${id}/activate`, {});
  }
}
