import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
import { PageRequest, pageParams } from '../../core/api/page-request';
import {
  CreateOrderPayload,
  Order,
  OrderStatus,
  OrderSummary,
  PageResponse,
} from '../../core/models/api.models';

export interface OrderCriteria {
  search: string;
  status: '' | OrderStatus;
}

export const EMPTY_ORDER_CRITERIA: OrderCriteria = { search: '', status: '' };

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly api = inject(ApiClient);

  search(criteria: OrderCriteria, page: PageRequest): Observable<PageResponse<OrderSummary>> {
    return this.api.get<PageResponse<OrderSummary>>('/orders', {
      ...pageParams(page),
      search: criteria.search,
      status: criteria.status,
    });
  }

  get(id: number): Observable<Order> {
    return this.api.get<Order>(`/orders/${id}`);
  }

  create(payload: CreateOrderPayload): Observable<Order> {
    return this.api.post<Order>('/orders', payload);
  }

  /** The server validates the transition; the UI only offers what it advertised as allowed. */
  changeStatus(id: number, status: OrderStatus, note?: string): Observable<Order> {
    return this.api.patch<Order>(`/orders/${id}/status`, { status, note: note ?? null });
  }
}
