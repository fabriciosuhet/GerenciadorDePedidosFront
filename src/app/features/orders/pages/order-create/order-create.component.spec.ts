import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { OrderCreateComponent } from './order-create.component';

registerLocaleData(localePt);

describe('OrderCreateComponent (Functional)', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderCreateComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'orders', redirectTo: '' }]),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        {
          provide: AuthService,
          useValue: {
            isAdmin: signal(false),
            customerId: signal('11111111-1111-1111-1111-111111111111'),
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('uses /api/cliente/me for regular user, calculates total and submits POST /api/pedido', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const fixture = TestBed.createComponent(OrderCreateComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url.endsWith('/api/cliente/me')).flush({
      nomeCompleto: 'João Comprador',
      telefone: '11999998888',
      pedidos: [],
    });

    httpMock.expectOne((r) => r.url.endsWith('/api/produto')).flush({
      items: [{ id: 10, nome: 'Monitor', preco: 1000, estoque: 5 }],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 10,
    });
    fixture.detectChanges();

    const comp = fixture.componentInstance as unknown as {
      form: { controls: { itensPedidos: { at: (i: number) => { patchValue: (v: unknown) => void } } } };
      getOrderTotal: () => number;
    };
    comp.form.controls.itensPedidos.at(0).patchValue({ produtoId: 10, quantidade: 2 });
    fixture.detectChanges();

    expect(comp.getOrderTotal()).toBe(2000);

    const el = fixture.nativeElement as HTMLElement;
    el.querySelector('form')!.dispatchEvent(new Event('submit'));

    const postReq = httpMock.expectOne((r) => r.url.endsWith('/api/pedido'));
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({
      clienteId: '11111111-1111-1111-1111-111111111111',
      status: 0,
      itensPedidos: [{ produtoId: 10, quantidade: 2 }],
    });
    postReq.flush({ id: 42 });

    httpMock.expectOne((r) => r.url.endsWith('/api/produto')).flush({
      items: [{ id: 10, nome: 'Monitor', preco: 1000, estoque: 3 }],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 10,
    });

    expect(navigateSpy).toHaveBeenCalledWith(['/orders']);
  });
});
