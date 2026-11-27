import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DashboardQueryParams, DashboardSummary } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/dashboard`;

  getSummary(filters?: DashboardQueryParams): Observable<DashboardSummary> {
    let params = new HttpParams();

    if (filters?.periodo) {
      params = params.set('periodo', filters.periodo);
    }
    if (filters?.dataReferencia?.trim()) {
      params = params.set('dataReferencia', filters.dataReferencia.trim());
    }
    if (filters?.topProdutos !== undefined) {
      params = params.set('topProdutos', filters.topProdutos);
    }

    return this.http.get<DashboardSummary>(this.baseUrl, { params });
  }
}
