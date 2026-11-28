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

    const cancelBtn = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cancelar',
    );
    expect(cancelBtn).toBeDefined();
  });

  it('cancels an order from the detail modal, updates status and refreshes orders and stock alerts', () => {
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
    const detailsBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Detalhes'),
    )!;
    detailsBtn.click();

    httpMock.expectOne((r) => r.url.endsWith('/api/pedido/101')).flush({
      id: 101,
      dataPedido: '2026-11-19T10:00:00Z',
      total: 500,
      clienteId: 'guid-1',
      clienteNome: 'Maria Silva',
      status: OrderStatus.Processed,
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

    const cancelFromModalBtn = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cancelar pedido',
    )!;
    expect(cancelFromModalBtn).toBeDefined();
    cancelFromModalBtn.click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Confirmar cancelamento');

    const confirmBtn = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Confirmar cancelamento',
    )!;
    confirmBtn.click();

    const cancelReq = httpMock.expectOne((r) => r.url.endsWith('/api/pedido/101/cancelar'));
    expect(cancelReq.request.method).toBe('PATCH');
    cancelReq.flush({
      pedidoId: 101,
      status: OrderStatus.Cancelled,
      estoqueEstornado: true,
      unidadesEstornadas: 2,
    });

    httpMock.expectOne((r) => r.url.endsWith('/api/pedido')).flush({
      items: [{ id: 101, dataPedido: '2026-11-19T10:00:00Z', total: 500 }],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 10,
    });

    httpMock.expectOne((r) => r.url.endsWith('/api/produto')).flush({
      items: [],
      totalCount: 0,
      pageNumber: 1,
      pageSize: 100,
    });

    fixture.detectChanges();

    const cancelAfterBtn = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cancelar pedido',
    );
    expect(cancelAfterBtn).toBeUndefined();
  });

  it('shows status badges per row, hides Cancelar for Cancelled/Returned/Completed and supports Concluir & Devolver for Admin', () => {
    const fixture = TestBed.createComponent(OrderListComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url.endsWith('/api/pedido')).flush({
      items: [
        { id: 1, dataPedido: '2026-11-28T10:00:00Z', total: 100, status: OrderStatus.Cancelled },
        { id: 2, dataPedido: '2026-11-28T10:05:00Z', total: 200, status: OrderStatus.Returned },
        { id: 3, dataPedido: '2026-11-28T10:10:00Z', total: 300, status: OrderStatus.Processed },
        { id: 4, dataPedido: '2026-11-28T10:15:00Z', total: 400, status: OrderStatus.Completed },
      ],
      totalCount: 4,
      pageNumber: 1,
      pageSize: 10,
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const rows = Array.from(el.querySelectorAll('tbody tr'));
    expect(rows.length).toBe(4);

    // Cancelled row (#1): badge Cancelado, no Cancelar/Concluir/Devolver
    expect(rows[0].textContent).toContain('Cancelado');
    expect(rows[0].textContent).not.toContain('Cancelar');
    expect(rows[0].textContent).not.toContain('Concluir');
    expect(rows[0].textContent).not.toContain('Devolver');

    // Returned row (#2): badge Devolvido, no Cancelar/Concluir/Devolver
    expect(rows[1].textContent).toContain('Devolvido');
    expect(rows[1].textContent).not.toContain('Cancelar');

    // Processed row (#3): shows Concluir and Cancelar
    expect(rows[2].textContent).toContain('Em Preparo');
    expect(rows[2].textContent).toContain('Concluir');
    expect(rows[2].textContent).toContain('Cancelar');

    // Completed row (#4): shows Devolver, hides Cancelar
    expect(rows[3].textContent).toContain('Entregue');
    expect(rows[3].textContent).toContain('Devolver');
    expect(rows[3].textContent).not.toContain('Cancelar');

    // Complete order #3
    const completeBtn = Array.from(rows[2].querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Concluir',
    )!;
    completeBtn.click();
    fixture.detectChanges();

    const confirmCompleteBtn = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Confirmar conclusão',
    )!;
    confirmCompleteBtn.click();

    const completeReq = httpMock.expectOne((r) => r.url.endsWith('/api/pedido/3/concluir'));
    expect(completeReq.request.method).toBe('PATCH');
    completeReq.flush({
      pedidoId: 3,
      status: OrderStatus.Completed,
      concluidoEm: '2026-11-28T11:00:00Z',
    });

    httpMock.expectOne((r) => r.url.endsWith('/api/pedido')).flush({
      items: [
        { id: 4, dataPedido: '2026-11-28T10:15:00Z', total: 400, status: OrderStatus.Completed },
      ],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 10,
    });
    fixture.detectChanges();

    // Return order #4
    const returnBtn = Array.from(el.querySelectorAll<HTMLButtonElement>('tbody tr button')).find(
      (b) => b.textContent?.trim() === 'Devolver',
    )!;
    returnBtn.click();
    fixture.detectChanges();

    const reasonInput = el.querySelector<HTMLTextAreaElement>('#return-order-reason')!;
    reasonInput.value = 'Avaria no transporte';
    reasonInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const returnForm = el.querySelector('[role="dialog"] form')!;
    returnForm.dispatchEvent(new Event('submit'));

    const returnReq = httpMock.expectOne((r) => r.url.endsWith('/api/pedido/4/devolver'));
    expect(returnReq.request.method).toBe('PATCH');
    expect(returnReq.request.body).toEqual({
      motivo: 'Avaria no transporte',
      retornarAoEstoque: true,
    });
    returnReq.flush({
      pedidoId: 4,
      status: OrderStatus.Returned,
      motivo: 'Avaria no transporte',
      devolvidoEm: '2026-11-28T11:10:00Z',
      estoqueEstornado: true,
      unidadesEstornadas: 2,
    });

    httpMock.expectOne((r) => r.url.endsWith('/api/pedido')).flush({
      items: [
        { id: 4, dataPedido: '2026-11-28T10:15:00Z', total: 400, status: OrderStatus.Returned },
      ],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 10,
    });
    httpMock.expectOne((r) => r.url.endsWith('/api/produto')).flush({
      items: [],
      totalCount: 0,
      pageNumber: 1,
      pageSize: 100,
    });
    fixture.detectChanges();

    expect(el.textContent).toContain('Devolvido');
  });
});
