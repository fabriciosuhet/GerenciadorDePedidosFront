import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PagedResult } from '../../../core/models/paged-result.model';
import {
  CancelOrderResponse,
  CreateOrderPayload,
  OrderDetail,
  OrderSummary,
} from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/pedido`;

  getAll(query?: string, pageNumber = 1, pageSize = 10): Observable<PagedResult<OrderSummary>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);
    if (query?.trim()) {
      params = params.set('query', query.trim());
    }
    return this.http.get<PagedResult<OrderSummary>>(this.baseUrl, { params });
  }

  getById(id: number): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateOrderPayload): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.baseUrl, payload);
  }

  cancel(id: number): Observable<CancelOrderResponse> {
    return this.http.patch<CancelOrderResponse>(`${this.baseUrl}/${id}/cancelar`, {});
  }

  delete(id: number): Observable<string> {
    const params = new HttpParams().set('id', id);
    return this.http.delete(`${this.baseUrl}/deletar-pedido`, {
      params,
      responseType: 'text',
    });
  }
}
