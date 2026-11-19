import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PagedResult } from '../../../core/models/paged-result.model';
import { CreateOrderPayload, OrderDetail, OrderSummary } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/pedido`;

  getAll(query?: string): Observable<PagedResult<OrderSummary>> {
    let params = new HttpParams();
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

  delete(id: number): Observable<string> {
    const params = new HttpParams().set('id', id);
    return this.http.delete(`${this.baseUrl}/deletar-pedido`, {
      params,
      responseType: 'text',
    });
  }
}
