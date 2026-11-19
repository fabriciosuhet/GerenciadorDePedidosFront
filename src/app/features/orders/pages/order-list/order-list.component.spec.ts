import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { OrderStatus } from '../../models/order.model';
import { OrderListComponent } from './order-list.component';

registerLocaleData(localePt);

describe('OrderListComponent (Functional)', () => {
  let httpMock: HttpTestingController;
  const isAdmin = signal(true);

  beforeEach(async () => {
    isAdmin.set(true);
    await TestBed.configureTestingModule({
      imports: [OrderListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: AuthService, useValue: { isAdmin } },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists orders, filters by order number, opens detail modal and deletes as Admin', () => {
    const fixture = TestBed.createComponent(OrderListComponent);
    fixture.detectChanges();

    const listReq = httpMock.expectOne((r) => r.url.endsWith('/api/pedido'));
    listReq.flush({
      items: [
        { id: 101, dataPedido: '2026-11-19T10:00:00Z', total: 500 },
        { id: 202, dataPedido: '2026-11-19T11:00:00Z', total: 800 },
      ],
      totalCount: 2,
      pageNumber: 1,
      pageSize: 10,
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('#101');
    expect(el.textContent).toContain('#202');

    const detailsBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Detalhes'),
    )!;
    detailsBtn.click();

    const detailReq = httpMock.expectOne((r) => r.url.endsWith('/api/pedido/101'));
    detailReq.flush({
      id: 101,
      dataPedido: '2026-11-19T10:00:00Z',
      total: 500,
      clienteId: 'guid-1',
      clienteNome: 'Maria Silva',
      status: OrderStatus.Pending,
      itensPedidos: [
        {
          id: 1,
          produtoId: 5,
          produtoNome: 'Teclado',
          quantidade: 2,
          precoUnitario: 250,
          total: 500,
        },
      ],
    });
    fixture.detectChanges();
    expect(el.textContent).toContain('Maria Silva');
    expect(el.textContent).toContain('Teclado');

    const deleteBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Excluir'),
    )!;
    deleteBtn.click();
    fixture.detectChanges();
    expect(el.textContent).toContain('Excluir pedido');
  });

  it('hides delete button for non-admin Usuario', () => {
    isAdmin.set(false);
    const fixture = TestBed.createComponent(OrderListComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url.endsWith('/api/pedido')).flush({
      items: [{ id: 101, dataPedido: '2026-11-19T10:00:00Z', total: 500 }],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 10,
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const deleteBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Excluir'),
    );
    expect(deleteBtn).toBeUndefined();
  });
});
