import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { StockMovementType } from '../../models/product.model';
import { StockMovementListComponent } from './stock-movement-list.component';

describe('StockMovementListComponent (Functional)', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockMovementListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('displays Entrada/Saída badges and filters rows by movement type', () => {
    const fixture = TestBed.createComponent(StockMovementListComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url.endsWith('/api/produto/movimentacao-estoque')).flush({
      items: [
        { id: 1, produtoId: 10, produtoNome: 'Notebook' },
        { id: 2, produtoId: 11, produtoNome: 'Mouse' },
      ],
      totalCount: 2,
      pageNumber: 1,
      pageSize: 10,
    });

    httpMock.expectOne((r) => r.url.endsWith('/api/produto/movimentacao-estoque/1')).flush({
      id: 1,
      produtoId: 10,
      produtoNome: 'Notebook',
      clienteNome: 'Admin',
      quantidade: 5,
      tipoMovimentacao: StockMovementType.Addition,
      data: '2026-11-19T12:00:00Z',
    });

    httpMock.expectOne((r) => r.url.endsWith('/api/produto/movimentacao-estoque/2')).flush({
      id: 2,
      produtoId: 11,
      produtoNome: 'Mouse',
      clienteNome: 'Admin',
      quantidade: 3,
      tipoMovimentacao: StockMovementType.Removal,
      data: '2026-11-19T12:10:00Z',
    });

    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Notebook');
    expect(el.textContent).toContain('Mouse');
    expect(el.textContent).toContain('Entrada');
    expect(el.textContent).toContain('Saída');

    const saidaFilterBtn = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Saída',
    )!;
    saidaFilterBtn.click();
    fixture.detectChanges();

    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Mouse');
  });

  it('opens report export modal and downloads selected CSV report', () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-report');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    try {
      const fixture = TestBed.createComponent(StockMovementListComponent);
      fixture.detectChanges();

      httpMock.expectOne((r) => r.url.endsWith('/api/produto/movimentacao-estoque')).flush({
        items: [],
        totalCount: 0,
        pageNumber: 1,
        pageSize: 10,
      });
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const exportBtn = Array.from(el.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Exportar relatório'),
      )!;
      exportBtn.click();
      fixture.detectChanges();

      expect(el.querySelector('[role="dialog"]')).not.toBeNull();

      const csvBtn = Array.from(el.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Arquivo CSV'),
      )!;
      csvBtn.click();

      const annualBtn = Array.from(el.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Anual'),
      )!;
      annualBtn.click();
      fixture.detectChanges();

      const modalForm = el.querySelector('[role="dialog"] form')!;
      modalForm.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      const reportReq = httpMock.expectOne((r) =>
        r.url.endsWith('/api/produto/movimentacao-estoque/relatorio'),
      );
      expect(reportReq.request.params.get('periodo')).toBe('Ano');
      expect(reportReq.request.params.get('formato')).toBe('Csv');

      reportReq.flush(new Blob(['Indicador;Valor'], { type: 'text/csv' }), {
        headers: { 'Content-Disposition': 'attachment; filename="relatorio-anual.csv"' },
      });
      fixture.detectChanges();

      expect(createUrlSpy).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-report');
      expect(el.querySelector('[role="dialog"]')).toBeNull();
    } finally {
      createUrlSpy.mockRestore();
      revokeUrlSpy.mockRestore();
      clickSpy.mockRestore();
    }
  });

  it('displays error inside export modal when report download fails', () => {
    const fixture = TestBed.createComponent(StockMovementListComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url.endsWith('/api/produto/movimentacao-estoque')).flush({
      items: [],
      totalCount: 0,
      pageNumber: 1,
      pageSize: 10,
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const exportBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Exportar relatório'),
    )!;
    exportBtn.click();
    fixture.detectChanges();

    const modalForm = el.querySelector('[role="dialog"] form')!;
    modalForm.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const reportReq = httpMock.expectOne((r) =>
      r.url.endsWith('/api/produto/movimentacao-estoque/relatorio'),
    );
    reportReq.flush(new Blob(), { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(el.querySelector('[role="dialog"]')).not.toBeNull();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('permissão de Administrador');
  });
});
