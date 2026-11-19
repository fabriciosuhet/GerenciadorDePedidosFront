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
});
