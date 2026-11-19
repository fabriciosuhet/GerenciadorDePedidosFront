import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
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
});
