import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DashboardSummary } from '../models/dashboard.model';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches dashboard summary from GET /api/dashboard', () => {
    const mockSummary: DashboardSummary = {
      totalClientes: 12,
      totalProdutos: 30,
      produtosComEstoqueBaixo: 4,
      totalPedidos: 45,
      pedidosPendentes: 5,
      pedidosConcluidos: 38,
      pedidosCancelados: 2,
      faturamentoTotalConcluido: 18500.5,
    };

    let result: DashboardSummary | undefined;
    service.getSummary().subscribe((res) => {
      result = res;
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/dashboard'));
    expect(req.request.method).toBe('GET');
    req.flush(mockSummary);

    expect(result).toEqual(mockSummary);
  });

  it('sends periodo, dataReferencia and topProdutos query params when provided', () => {
    service
      .getSummary({ periodo: 'Mes', dataReferencia: '2026-11-27', topProdutos: 10 })
      .subscribe();

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/dashboard'));
    expect(req.request.params.get('periodo')).toBe('Mes');
    expect(req.request.params.get('dataReferencia')).toBe('2026-11-27');
    expect(req.request.params.get('topProdutos')).toBe('10');
    req.flush({
      totalClientes: 5,
      totalProdutos: 10,
      produtosComEstoqueBaixo: 1,
      totalPedidos: 12,
      pedidosPendentes: 1,
      pedidosConcluidos: 10,
      pedidosCancelados: 1,
      faturamentoTotalConcluido: 5000,
      ticketMedio: 500,
      taxaCancelamentoPercentual: 8.33,
      topProdutos: [],
    });
  });
});
