import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OrderStatus } from '../models/order.model';
import { OrderService } from './order.service';

describe('OrderService', () => {
  let service: OrderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches paginated orders with optional query filter', () => {
    service.getAll('Pendente').subscribe((res) => {
      expect(res.totalCount).toBe(1);
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/pedido') && r.params.get('query') === 'Pendente');
    expect(req.request.method).toBe('GET');
    req.flush({ items: [{ id: 1, dataPedido: '2026-01-01T10:00:00Z', total: 100 }], totalCount: 1, pageNumber: 1, pageSize: 10 });
  });

  it('posts a new order payload', () => {
    service
      .create({
        clienteId: '11111111-1111-1111-1111-111111111111',
        status: OrderStatus.Pending,
        itensPedidos: [{ produtoId: 2, quantidade: 3 }],
      })
      .subscribe((res) => {
        expect(res.id).toBe(10);
      });

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/pedido'));
    expect(req.request.method).toBe('POST');
    req.flush({ id: 10 });
  });
});
