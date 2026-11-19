import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PagedResult } from '../../../core/models/paged-result.model';
import {
  CreateCustomerPayload,
  Customer,
  CustomerDetail,
  UpdateCustomerPayload,
} from '../models/customer.model';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/cliente`;

  getAll(query?: string): Observable<PagedResult<Customer>> {
    let params = new HttpParams();
    if (query?.trim()) {
      params = params.set('query', query.trim());
    }
    return this.http.get<PagedResult<Customer>>(this.baseUrl, { params });
  }

  getMe(): Observable<CustomerDetail> {
    return this.http.get<CustomerDetail>(`${this.baseUrl}/me`);
  }

  getById(id: string): Observable<CustomerDetail> {
    return this.http.get<CustomerDetail>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateCustomerPayload): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.baseUrl, payload);
  }

  update(payload: UpdateCustomerPayload): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/atualizar-cliente`, payload);
  }

  delete(id: string): Observable<string> {
    const params = new HttpParams().set('id', id);
    return this.http.delete(`${this.baseUrl}/deletar-cliente`, {
      params,
      responseType: 'text',
    });
  }
}
