import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { StockMovementType } from '../models/product.model';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('enriches stock movement summaries with movement type from detail endpoint', () => {
    let resultTypes: Array<StockMovementType | null> = [];

    service.getStockMovementsWithDetails().subscribe((res) => {
      resultTypes = res.items.map((item) => item.tipoMovimentacao);
    });

    const listReq = httpMock.expectOne((r) => r.url.endsWith('/api/produto/movimentacao-estoque'));
    listReq.flush({
      items: [
        { id: 1, produtoId: 10, produtoNome: 'Teclado' },
        { id: 2, produtoId: 11, produtoNome: 'Mouse' },
      ],
      totalCount: 2,
      pageNumber: 1,
      pageSize: 10,
    });

    const detailReq1 = httpMock.expectOne((r) => r.url.endsWith('/api/produto/movimentacao-estoque/1'));
    detailReq1.flush({
      id: 1,
      produtoId: 10,
      produtoNome: 'Teclado',
      clienteNome: 'Admin',
      quantidade: 5,
      tipoMovimentacao: StockMovementType.Addition,
      data: '2026-11-19T12:00:00Z',
    });

    const detailReq2 = httpMock.expectOne((r) => r.url.endsWith('/api/produto/movimentacao-estoque/2'));
    detailReq2.flush({
      id: 2,
      produtoId: 11,
      produtoNome: 'Mouse',
      clienteNome: 'Admin',
      quantidade: 2,
      tipoMovimentacao: StockMovementType.Removal,
      data: '2026-11-19T12:05:00Z',
    });

    expect(resultTypes).toEqual([StockMovementType.Addition, StockMovementType.Removal]);
  });
});
