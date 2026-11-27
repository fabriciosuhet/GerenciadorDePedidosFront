import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PagedResult } from '../../../core/models/paged-result.model';
import { extractFilenameFromContentDisposition } from '../../../core/utils/file-download.util';
import {
  CreateProductPayload,
  DownloadedFile,
  Product,
  ProductDetail,
  StockAdjustmentPayload,
  StockMovementDetail,
  StockMovementListItem,
  StockMovementReportFilter,
  StockMovementSummary,
  UpdateProductPayload,
} from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/produto`;

  getAll(query?: string, pageNumber = 1, pageSize = 10): Observable<PagedResult<Product>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);
    if (query?.trim()) {
      params = params.set('query', query.trim());
    }
    return this.http.get<PagedResult<Product>>(this.baseUrl, { params });
  }

  getById(id: number): Observable<ProductDetail> {
    return this.http.get<ProductDetail>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateProductPayload): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.baseUrl, payload);
  }

  update(payload: UpdateProductPayload): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/atualizar-produto`, payload);
  }

  delete(id: number): Observable<string> {
    const params = new HttpParams().set('id', id);
    return this.http.delete(`${this.baseUrl}/remover-produto`, {
      params,
      responseType: 'text',
    });
  }

  addStock(payload: StockAdjustmentPayload): Observable<string> {
    return this.http.put(`${this.baseUrl}/adicionar-estoque`, payload, {
      responseType: 'text',
    });
  }

  removeStock(payload: StockAdjustmentPayload): Observable<string> {
    return this.http.put(`${this.baseUrl}/remover-estoque`, payload, {
      responseType: 'text',
    });
  }

  getStockMovements(
    query?: string,
    pageNumber = 1,
    pageSize = 10,
  ): Observable<PagedResult<StockMovementSummary>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);
    if (query?.trim()) {
      params = params.set('query', query.trim());
    }
    return this.http.get<PagedResult<StockMovementSummary>>(
      `${this.baseUrl}/movimentacao-estoque`,
      { params },
    );
  }

  getStockMovementById(id: number): Observable<StockMovementDetail> {
    return this.http.get<StockMovementDetail>(
      `${this.baseUrl}/movimentacao-estoque/${id}`,
    );
  }

  getStockMovementsWithDetails(
    query?: string,
    pageNumber = 1,
    pageSize = 10,
  ): Observable<PagedResult<StockMovementListItem>> {
    return this.getStockMovements(query, pageNumber, pageSize).pipe(
      switchMap((paged) => {
        if (paged.items.length === 0) {
          return of({ ...paged, items: [] });
        }

        return forkJoin(
          paged.items.map((item) =>
            this.getStockMovementById(item.id).pipe(
              map(
                (detail): StockMovementListItem => ({
                  ...item,
                  tipoMovimentacao: detail.tipoMovimentacao,
                  quantidade: detail.quantidade,
                  precoUnitario: detail.precoUnitario,
                  valorTotal: detail.valorTotal,
                  motivo: detail.motivo,
                  pedidoId: detail.pedidoId,
                  clienteNome: detail.clienteNome,
                  data: detail.data,
                }),
              ),
              catchError(() =>
                of<StockMovementListItem>({
                  ...item,
                  tipoMovimentacao: null,
                }),
              ),
            ),
          ),
        ).pipe(map((items) => ({ ...paged, items })));
      }),
    );
  }

  downloadStockMovementReport(filter: StockMovementReportFilter): Observable<DownloadedFile> {
    let params = new HttpParams()
      .set('periodo', filter.periodo)
      .set('formato', filter.formato);

    if (filter.dataReferencia?.trim()) {
      params = params.set('dataReferencia', filter.dataReferencia.trim());
    }

    return this.http
      .get(`${this.baseUrl}/movimentacao-estoque/relatorio`, {
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
          const fallbackFilename = `relatorio-movimentacoes-estoque-${periodSlug}-${dateSlug}.${extension}`;

          return {
            blob,
            filename: headerFilename ?? fallbackFilename,
          };
        }),
      );
  }
}
