import { Injectable, inject, signal } from '@angular/core';
import type { HubConnection } from '@microsoft/signalr';
import { Subject, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrderStatusUpdatedEvent } from '../../features/orders/models/order.model';
import { AuthService } from './auth.service';

export type RealtimeConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

export const ORDERS_HUB_ROUTE = '/hubs/pedidos';
export const ORDER_STATUS_UPDATED_EVENT = 'PedidoStatusAtualizado';

@Injectable({ providedIn: 'root' })
export class OrderRealtimeService {
  private readonly authService = inject(AuthService);

  private hubConnection: HubConnection | null = null;
  private startPromise: Promise<void> | null = null;
  private connectVersion = 0;

  private readonly connectionStateSignal = signal<RealtimeConnectionState>('disconnected');
  private readonly lastUpdateSignal = signal<OrderStatusUpdatedEvent | null>(null);
  private readonly statusUpdatedSubject = new Subject<OrderStatusUpdatedEvent>();

  readonly connectionState = this.connectionStateSignal.asReadonly();
  readonly lastUpdate = this.lastUpdateSignal.asReadonly();
  readonly statusUpdated$ = this.statusUpdatedSubject.asObservable();

  connect(): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    if (this.startPromise || this.connectionStateSignal() === 'connected') {
      return;
    }

    const version = ++this.connectVersion;
    this.connectionStateSignal.set('connecting');

    this.startPromise = this.startHubConnection(version).finally(() => {
      if (this.connectVersion === version) {
        this.startPromise = null;
      }
    });
  }

  disconnect(): void {
    this.connectVersion += 1;
    const connection = this.hubConnection;
    this.hubConnection = null;
    this.startPromise = null;
    this.connectionStateSignal.set('disconnected');

    if (connection) {
      connection.off(ORDER_STATUS_UPDATED_EVENT);
      void connection.stop().catch(() => undefined);
    }
  }

  notifyStatusUpdated(event: OrderStatusUpdatedEvent): void {
    this.lastUpdateSignal.set(event);
    this.statusUpdatedSubject.next(event);
  }

  private async startHubConnection(version: number): Promise<void> {
    try {
      const signalR = await import('@microsoft/signalr');
      if (this.connectVersion !== version || !this.authService.isAuthenticated()) {
        return;
      }

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${environment.apiUrl}${ORDERS_HUB_ROUTE}`, {
          accessTokenFactory: () => this.resolveAccessToken(),
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      connection.on(ORDER_STATUS_UPDATED_EVENT, (payload: OrderStatusUpdatedEvent) => {
        this.notifyStatusUpdated(payload);
      });

      connection.onreconnecting(() => {
        if (this.hubConnection === connection) {
          this.connectionStateSignal.set('reconnecting');
        }
      });

      connection.onreconnected(() => {
        if (this.hubConnection === connection) {
          this.connectionStateSignal.set('connected');
        }
      });

      connection.onclose(() => {
        if (this.hubConnection === connection) {
          this.connectionStateSignal.set('disconnected');
        }
      });

      this.hubConnection = connection;
      await connection.start();

      if (this.connectVersion !== version) {
        connection.off(ORDER_STATUS_UPDATED_EVENT);
        void connection.stop().catch(() => undefined);
        return;
      }

      this.connectionStateSignal.set('connected');
    } catch {
      if (this.connectVersion === version) {
        this.connectionStateSignal.set('disconnected');
      }
    }
  }

  private async resolveAccessToken(): Promise<string> {
    const session = this.authService.session();
    if (!session) {
      return '';
    }

    const isExpiringSoon = Date.now() >= session.expiresAt - 15_000;
    if (isExpiringSoon && session.refreshToken) {
      try {
        return await firstValueFrom(this.authService.refreshSession());
      } catch {
        return session.token;
      }
    }

    return session.token;
  }
}
