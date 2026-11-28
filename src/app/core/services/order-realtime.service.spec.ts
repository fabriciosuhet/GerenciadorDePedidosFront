import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrderStatus, OrderStatusUpdatedEvent } from '../../features/orders/models/order.model';
import { AuthService } from './auth.service';
import { OrderRealtimeService } from './order-realtime.service';

describe('OrderRealtimeService', () => {
  const isAuthenticated = signal(false);

  beforeEach(() => {
    isAuthenticated.set(false);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated,
            session: signal(null),
          },
        },
      ],
    });
  });

  it('does not start a hub connection when user is not authenticated', () => {
    const service = TestBed.inject(OrderRealtimeService);
    service.connect();

    expect(service.connectionState()).toBe('disconnected');
  });

  it('updates lastUpdate signal and emits on statusUpdated$ when an event arrives', () => {
    const service = TestBed.inject(OrderRealtimeService);
    const received: OrderStatusUpdatedEvent[] = [];

    const sub = service.statusUpdated$.subscribe((ev) => received.push(ev));

    const event: OrderStatusUpdatedEvent = {
      pedidoId: 77,
      clienteId: '11111111-1111-1111-1111-111111111111',
      statusAnterior: OrderStatus.Pending,
      statusAtual: OrderStatus.Processed,
      total: 350,
      atualizadoEm: '2026-11-28T11:45:00Z',
    };

    service.notifyStatusUpdated(event);

    expect(service.lastUpdate()).toEqual(event);
    expect(service.getRecentUpdate(77)).toEqual(event);
    expect(received).toEqual([event]);

    sub.unsubscribe();
    service.disconnect();
    expect(service.connectionState()).toBe('disconnected');
  });
});
