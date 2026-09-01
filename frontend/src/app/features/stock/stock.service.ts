import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
import { PageRequest, pageParams } from '../../core/api/page-request';
import {
  PageResponse,
  StockItem,
  StockMovement,
  StockMovementReason,
  StockView,
} from '../../core/models/api.models';

export interface StockAdjustment {
  delta: number;
  reason: StockMovementReason;
  note?: string | null;
}

@Injectable({ providedIn: 'root' })
export class StockService {
  private readonly api = inject(ApiClient);

  lowStock(page: PageRequest): Observable<PageResponse<StockItem>> {
    return this.api.get<PageResponse<StockItem>>('/stock/low', pageParams(page));
  }

  get(productId: number): Observable<StockView> {
    return this.api.get<StockView>(`/stock/${productId}`);
  }

  movements(productId: number, page: PageRequest): Observable<PageResponse<StockMovement>> {
    return this.api.get<PageResponse<StockMovement>>(`/stock/${productId}/movements`, pageParams(page));
  }

  adjust(productId: number, adjustment: StockAdjustment): Observable<StockView> {
    return this.api.post<StockView>(`/stock/${productId}/adjust`, adjustment);
  }

  setThreshold(productId: number, lowStockThreshold: number): Observable<StockView> {
    return this.api.put<StockView>(`/stock/${productId}/threshold`, { lowStockThreshold });
  }
}
