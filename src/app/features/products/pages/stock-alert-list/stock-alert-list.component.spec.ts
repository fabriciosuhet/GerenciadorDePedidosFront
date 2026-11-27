import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StockAlertService } from '../../../../core/services/stock-alert.service';
import { StockAlertListComponent } from './stock-alert-list.component';

describe('StockAlertListComponent (Functional)', () => {
  let httpMock: HttpTestingController;
  let stockAlertService: StockAlertService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockAlertListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    stockAlertService = TestBed.inject(StockAlertService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads pending alerts, filters locally and resolves an alert via PATCH', () => {
    const fixture = TestBed.createComponent(StockAlertListComponent);
    fixture.detectChanges();

    const initReq = httpMock.expectOne(
      (r) =>
        r.url.endsWith('/api/produto/alertas-estoque') &&
        r.params.get('apenasPendentes') === 'true',
    );
    initReq.flush([
      {
        id: 1,
        produtoId: 10,
        produtoNome: 'Teclado Mecânico',
        estoqueAtual: 2,
        estoqueMinimo: 5,
        pedidoId: 44,
        resolvido: false,
        criadoEm: '2026-11-27T15:00:00Z',
        resolvidoEm: null,
      },
      {
        id: 2,
        produtoId: 11,
        produtoNome: 'Mouse Sem Fio',
        estoqueAtual: 0,
        estoqueMinimo: 5,
        pedidoId: null,
        resolvido: false,
        criadoEm: '2026-11-27T15:10:00Z',
        resolvidoEm: null,
      },
    ]);
    fixture.detectChanges();

    expect(stockAlertService.pendingBackendAlertCount()).toBe(2);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Teclado Mecânico');
    expect(el.textContent).toContain('Pedido #44');
    expect(el.textContent).toContain('Ajuste manual');

    const searchInput = el.querySelector<HTMLInputElement>('#stock-alert-search')!;
    searchInput.value = 'Teclado';
    searchInput.dispatchEvent(new Event('input'));
    const form = el.querySelector('form')!;
    const submitEvent = new Event('submit', { cancelable: true });
    form.dispatchEvent(submitEvent);
    fixture.detectChanges();

    expect(submitEvent.defaultPrevented).toBe(true);
    expect(el.querySelectorAll('tbody tr').length).toBe(1);

    const resolveBtn = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Resolver',
    )!;
    resolveBtn.click();

    const patchReq = httpMock.expectOne((r) =>
      r.url.endsWith('/api/produto/alertas-estoque/1/resolver'),
    );
    expect(patchReq.request.method).toBe('PATCH');
    patchReq.flush(null, { status: 204, statusText: 'No Content' });

    const reloadReq = httpMock.expectOne(
      (r) =>
        r.url.endsWith('/api/produto/alertas-estoque') &&
        r.params.get('apenasPendentes') === 'true',
    );
    reloadReq.flush([
      {
        id: 2,
        produtoId: 11,
        produtoNome: 'Mouse Sem Fio',
        estoqueAtual: 0,
        estoqueMinimo: 5,
        pedidoId: null,
        resolvido: false,
        criadoEm: '2026-11-27T15:10:00Z',
        resolvidoEm: null,
      },
    ]);
    fixture.detectChanges();

    expect(stockAlertService.pendingBackendAlertCount()).toBe(1);
  });

  it('switches to history tab fetching apenasPendentes=false and renders resolved items', () => {
    const fixture = TestBed.createComponent(StockAlertListComponent);
    fixture.detectChanges();

    httpMock
      .expectOne(
        (r) =>
          r.url.endsWith('/api/produto/alertas-estoque') &&
          r.params.get('apenasPendentes') === 'true',
      )
      .flush([]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const historyBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Todos (Histórico)'),
    )!;
    historyBtn.click();

    const historyReq = httpMock.expectOne(
      (r) =>
        r.url.endsWith('/api/produto/alertas-estoque') &&
        r.params.get('apenasPendentes') === 'false',
    );
    historyReq.flush([
      {
        id: 7,
        produtoId: 20,
        produtoNome: 'Monitor 4K',
        estoqueAtual: 12,
        estoqueMinimo: 5,
        pedidoId: 90,
        resolvido: true,
        criadoEm: '2026-11-26T10:00:00Z',
        resolvidoEm: '2026-11-27T11:00:00Z',
      },
    ]);
    fixture.detectChanges();

    expect(el.textContent).toContain('Monitor 4K');
    expect(el.textContent).toContain('Resolvido');
    expect(el.textContent).toContain('Concluído');
  });
});
