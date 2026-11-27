import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PagedResult } from '../../../core/models/paged-result.model';
import { DownloadedFile, ReportFilter } from '../../../core/models/report.model';
import { extractFilenameFromContentDisposition } from '../../../core/utils/file-download.util';
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

  downloadSalesReport(filter: ReportFilter): Observable<DownloadedFile> {
    let params = new HttpParams()
      .set('periodo', filter.periodo)
      .set('formato', filter.formato);

    if (filter.dataReferencia?.trim()) {
      params = params.set('dataReferencia', filter.dataReferencia.trim());
    }

    return this.http
      .get(`${this.baseUrl}/relatorio`, {
        params,
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(
        map((response: HttpResponse<Blob>): DownloadedFile => {
          const blob = response.body ?? new Blob();
          const headerFilename = extractFilenameFromContentDisposition(
            response.headers.get('Content-Disposition'),
          );
          const extension = filter.formato === 'Csv' ? 'csv' : 'pdf';
          const periodSlug = filter.periodo.toLowerCase();
          const dateSlug =
            filter.dataReferencia?.trim() || new Date().toISOString().slice(0, 10);
          const fallbackFilename = `relatorio-vendas-${periodSlug}-${dateSlug}.${extension}`;

          return {
            blob,
            filename: headerFilename ?? fallbackFilename,
          };
        }),
      );
  }
}
