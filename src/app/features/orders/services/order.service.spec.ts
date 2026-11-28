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

  it('sends PATCH request to cancel an order and returns refund summary', () => {
    service.cancel(42).subscribe((res) => {
      expect(res.pedidoId).toBe(42);
      expect(res.status).toBe(OrderStatus.Cancelled);
      expect(res.estoqueEstornado).toBe(true);
      expect(res.unidadesEstornadas).toBe(5);
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/pedido/42/cancelar'));
    expect(req.request.method).toBe('PATCH');
    req.flush({
      pedidoId: 42,
      status: OrderStatus.Cancelled,
      estoqueEstornado: true,
      unidadesEstornadas: 5,
    });
  });

  it('downloads sales report from GET /api/pedido/relatorio with query params', () => {
    let filename = '';
    service
      .downloadSalesReport({ periodo: 'Mes', formato: 'Pdf', dataReferencia: '2026-11-27' })
      .subscribe((file) => {
        filename = file.filename;
      });

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/pedido/relatorio'));
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.get('periodo')).toBe('Mes');
    expect(req.request.params.get('formato')).toBe('Pdf');
    expect(req.request.params.get('dataReferencia')).toBe('2026-11-27');

    req.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }), {
      headers: { 'Content-Disposition': 'attachment; filename="relatorio-vendas-mes.pdf"' },
    });

    expect(filename).toBe('relatorio-vendas-mes.pdf');
  });

  it('sends PATCH requests to complete and return an order', () => {
    service.complete(15).subscribe((res) => {
      expect(res.pedidoId).toBe(15);
      expect(res.status).toBe(OrderStatus.Completed);
    });

    const completeReq = httpMock.expectOne((r) => r.url.endsWith('/api/pedido/15/concluir'));
    expect(completeReq.request.method).toBe('PATCH');
    completeReq.flush({
      pedidoId: 15,
      status: OrderStatus.Completed,
      concluidoEm: '2026-11-28T11:00:00-03:00',
    });

    service
      .returnOrder(15, { motivo: 'Desistência', retornarAoEstoque: true })
      .subscribe((res) => {
        expect(res.status).toBe(OrderStatus.Returned);
        expect(res.estoqueEstornado).toBe(true);
        expect(res.unidadesEstornadas).toBe(3);
      });

    const returnReq = httpMock.expectOne((r) => r.url.endsWith('/api/pedido/15/devolver'));
    expect(returnReq.request.method).toBe('PATCH');
    expect(returnReq.request.body).toEqual({ motivo: 'Desistência', retornarAoEstoque: true });
    returnReq.flush({
      pedidoId: 15,
      status: OrderStatus.Returned,
      motivo: 'Desistência',
      devolvidoEm: '2026-11-28T11:10:00-03:00',
      estoqueEstornado: true,
      unidadesEstornadas: 3,
    });
  });
});
