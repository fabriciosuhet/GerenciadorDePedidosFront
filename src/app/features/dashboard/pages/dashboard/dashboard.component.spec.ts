import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, signal } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { OrderRealtimeService } from '../../../../core/services/order-realtime.service';
import { StockAlertService } from '../../../../core/services/stock-alert.service';
import { OrderStatus } from '../../../orders/models/order.model';
import { DashboardComponent } from './dashboard.component';

registerLocaleData(localePt);

describe('DashboardComponent (Functional)', () => {
  let httpMock: HttpTestingController;
  const isAdmin = signal(true);

  beforeEach(async () => {
    localStorage.clear();
    isAdmin.set(true);
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        {
          provide: AuthService,
          useValue: {
            isAdmin,
            userEmail: signal('admin@teste.com'),
            role: signal('Admin'),
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('loads GET /api/dashboard and GET /api/cliente/me for Admin without calling /api/cliente or /api/produto', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    httpMock.expectNone((r) => r.url.endsWith('/api/cliente'));
    httpMock.expectNone((r) => r.url.endsWith('/api/produto'));

    const meReq = httpMock.expectOne((r) => r.url.endsWith('/api/cliente/me'));
    meReq.flush({
      nomeCompleto: 'Administrador Sistema',
      telefone: '11999990000',
      pedidos: [
        {
          id: 7,
          dataPedido: '2026-11-19T12:00:00Z',
          total: 250,
          clienteId: 'guid-1',
          clienteNome: 'Administrador Sistema',
          status: OrderStatus.Completed,
          itensPedidos: [],
        },
      ],
    });

    const dashReq = httpMock.expectOne((r) => r.url.endsWith('/api/dashboard'));
    dashReq.flush({
      totalClientes: 8,
      totalProdutos: 14,
      produtosComEstoqueBaixo: 2,
      totalPedidos: 22,
      pedidosPendentes: 3,
      pedidosConcluidos: 18,
      pedidosCancelados: 1,
      faturamentoTotalConcluido: 12500,
    });

    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Olá, Administrador Sistema');
    expect(el.textContent).toContain('22');
    expect(el.textContent).toContain('14');
    expect(el.textContent).toContain('Pedido #7');
  });

  it('calls only GET /api/cliente/me for non-admin Usuario and renders personal KPIs', () => {
    isAdmin.set(false);
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    httpMock.expectNone((r) => r.url.endsWith('/api/dashboard'));

    const meReq = httpMock.expectOne((r) => r.url.endsWith('/api/cliente/me'));
    meReq.flush({
      nomeCompleto: 'João Cliente',
      telefone: '11977776666',
      pedidos: [
        {
          id: 12,
          dataPedido: '2026-11-19T12:00:00Z',
          total: 400,
          clienteId: 'guid-2',
          clienteNome: 'João Cliente',
          status: OrderStatus.Pending,
          itensPedidos: [],
        },
      ],
    });

    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Meu Painel de Pedidos');
    expect(el.textContent).toContain('Olá, João Cliente');
    expect(el.textContent).toContain('Pedido #12');
  });

  it('syncs Catálogo low-stock badge count with StockAlertService alerts (20% rule)', () => {
    const stockAlertService = TestBed.inject(StockAlertService);
    stockAlertService.evaluateProducts([
      { id: 1, nome: 'Prod A', preco: 10, estoque: 2 },
      { id: 2, nome: 'Prod B', preco: 10, estoque: 10 },
      { id: 3, nome: 'Prod C', preco: 10, estoque: 15 },
      { id: 4, nome: 'Prod D', preco: 10, estoque: 20 },
    ]);

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url.endsWith('/api/cliente/me')).flush({
      nomeCompleto: 'Admin',
      telefone: '11999990000',
      pedidos: [],
    });
    httpMock.expectOne((r) => r.url.endsWith('/api/dashboard')).flush({
      totalClientes: 2,
      totalProdutos: 4,
      produtosComEstoqueBaixo: 1,
      totalPedidos: 0,
      pedidosPendentes: 0,
      pedidosConcluidos: 0,
      pedidosCancelados: 0,
      faturamentoTotalConcluido: 0,
    });

    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('4 baixo');
  });

  it('filters dashboard analytics by period and renders Ticket Médio, Taxa de Cancelamento and Top Produtos', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url.endsWith('/api/cliente/me')).flush({
      nomeCompleto: 'Admin',
      telefone: '11999990000',
      pedidos: [],
    });
    httpMock.expectOne((r) => r.url.endsWith('/api/dashboard')).flush({
      totalClientes: 5,
      totalProdutos: 10,
      produtosComEstoqueBaixo: 1,
      totalPedidos: 10,
      pedidosPendentes: 1,
      pedidosConcluidos: 8,
      pedidosCancelados: 1,
      faturamentoTotalConcluido: 4000,
      ticketMedio: 500,
      taxaCancelamentoPercentual: 10,
      topProdutos: [],
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const monthBtn = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Mês',
    )!;
    monthBtn.click();

    const periodReq = httpMock.expectOne(
      (r) => r.url.endsWith('/api/dashboard') && r.params.get('periodo') === 'Mes',
    );
    periodReq.flush({
      totalClientes: 5,
      totalProdutos: 10,
      produtosComEstoqueBaixo: 1,
      totalPedidos: 4,
      pedidosPendentes: 0,
      pedidosConcluidos: 3,
      pedidosCancelados: 1,
      faturamentoTotalConcluido: 2700,
      ticketMedio: 900,
      taxaCancelamentoPercentual: 25,
      periodo: 'Mes',
      dataInicio: '2026-11-01T00:00:00Z',
      dataFim: '2026-11-30T23:59:59Z',
      topProdutos: [
        {
          produtoId: 12,
          produtoNome: 'Monitor Ultrawide',
          quantidadeVendida: 3,
          faturamentoTotal: 2700,
        },
      ],
    });
    fixture.detectChanges();

    expect(el.textContent).toContain('Monitor Ultrawide');
    expect(el.textContent).toContain('900,00');
    expect(el.textContent).toContain('25,0%');
  });

  it('updates recent order status in real time when SignalR emits PedidoStatusAtualizado', () => {
    isAdmin.set(false);
    const realtimeService = TestBed.inject(OrderRealtimeService);
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url.endsWith('/api/cliente/me')).flush({
      nomeCompleto: 'João Cliente',
      telefone: '11977776666',
      pedidos: [
        {
          id: 50,
          dataPedido: '2026-11-28T11:40:00Z',
          total: 320,
          clienteId: 'guid-2',
          clienteNome: 'João Cliente',
          status: OrderStatus.Pending,
          itensPedidos: [],
        },
      ],
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Pendente');

    realtimeService.notifyStatusUpdated({
      pedidoId: 50,
      clienteId: 'guid-2',
      statusAnterior: OrderStatus.Pending,
      statusAtual: OrderStatus.Processed,
      total: 320,
      atualizadoEm: '2026-11-28T11:40:02Z',
    });
    fixture.detectChanges();

    expect(el.textContent).toContain('Em Preparo');
  });
});
