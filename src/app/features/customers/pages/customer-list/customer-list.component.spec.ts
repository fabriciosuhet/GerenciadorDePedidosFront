import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../../core/services/auth.service';
import { OrderStatus } from '../../../orders/models/order.model';
import { CustomerListComponent } from './customer-list.component';

registerLocaleData(localePt);

describe('CustomerListComponent (Functional)', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        {
          provide: AuthService,
          useValue: { isAdmin: signal(true) },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists customers and opens customer detail modal with order history', () => {
    const fixture = TestBed.createComponent(CustomerListComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url.endsWith('/api/cliente')).flush({
      items: [{ id: 'cust-1', nomeCompleto: 'Ana Paula', telefone: '11988887777' }],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 10,
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Ana Paula');

    const detailsBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Detalhes'),
    )!;
    detailsBtn.click();

    httpMock.expectOne((r) => r.url.endsWith('/api/cliente/cust-1')).flush({
      nomeCompleto: 'Ana Paula',
      telefone: '11988887777',
      pedidos: [
        {
          id: 99,
          dataPedido: '2026-11-19T12:00:00Z',
          total: 320,
          clienteId: 'cust-1',
          clienteNome: 'Ana Paula',
          status: OrderStatus.Completed,
          itensPedidos: [],
        },
      ],
    });
    fixture.detectChanges();

    expect(el.textContent).toContain('Pedido #99');
  });
});
