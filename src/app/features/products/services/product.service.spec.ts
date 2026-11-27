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

  it('downloads stock movement report with query params and extracts filename from header', () => {
    let downloadedName = '';
    let downloadedSize = 0;

    service
      .downloadStockMovementReport({
        periodo: 'Semana',
        formato: 'Csv',
        dataReferencia: '2026-11-27',
      })
      .subscribe((file) => {
        downloadedName = file.filename;
        downloadedSize = file.blob.size;
      });

    const req = httpMock.expectOne((r) =>
      r.url.endsWith('/api/produto/movimentacao-estoque/relatorio'),
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.get('periodo')).toBe('Semana');
    expect(req.request.params.get('formato')).toBe('Csv');
    expect(req.request.params.get('dataReferencia')).toBe('2026-11-27');

    req.flush(new Blob(['col1;col2'], { type: 'text/csv' }), {
      headers: {
        'Content-Disposition':
          'attachment; filename="relatorio-movimentacoes-estoque-semana-20261123-20261129.csv"',
      },
    });

    expect(downloadedName).toBe('relatorio-movimentacoes-estoque-semana-20261123-20261129.csv');
    expect(downloadedSize).toBeGreaterThan(0);
  });

  it('falls back to a generated filename when Content-Disposition header is absent', () => {
    let downloadedName = '';

    service
      .downloadStockMovementReport({
        periodo: 'Ano',
        formato: 'Pdf',
        dataReferencia: null,
      })
      .subscribe((file) => {
        downloadedName = file.filename;
      });

    const req = httpMock.expectOne((r) =>
      r.url.endsWith('/api/produto/movimentacao-estoque/relatorio'),
    );
    expect(req.request.params.get('periodo')).toBe('Ano');
    expect(req.request.params.get('formato')).toBe('Pdf');
    expect(req.request.params.has('dataReferencia')).toBe(false);

    req.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));

    expect(downloadedName).toMatch(/^relatorio-movimentacoes-estoque-ano-\d{4}-\d{2}-\d{2}\.pdf$/);
  });
});
