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

const RETRY_DELAYS_MS = [2000, 4000, 8000, 15000, 30000] as const;
const RECENT_UPDATE_TTL_MS = 60_000;

interface CachedRealtimeUpdate {
  event: OrderStatusUpdatedEvent;
  receivedAt: number;
}

@Injectable({ providedIn: 'root' })
export class OrderRealtimeService {
  private readonly authService = inject(AuthService);

  private hubConnection: HubConnection | null = null;
  private startPromise: Promise<void> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryAttempt = 0;
  private connectVersion = 0;
  private readonly recentUpdates = new Map<number, CachedRealtimeUpdate>();

  private readonly connectionStateSignal = signal<RealtimeConnectionState>('disconnected');
  private readonly lastUpdateSignal = signal<OrderStatusUpdatedEvent | null>(null);
  private readonly statusUpdatedSubject = new Subject<OrderStatusUpdatedEvent>();

  readonly connectionState = this.connectionStateSignal.asReadonly();
  readonly lastUpdate = this.lastUpdateSignal.asReadonly();
  readonly statusUpdated$ = this.statusUpdatedSubject.asObservable();

  connect(): void {
    if (!this.isUserAuthenticated()) {
      return;
    }

    if (this.startPromise || this.connectionStateSignal() === 'connected') {
      return;
    }

    this.clearRetryTimer();

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
    this.retryAttempt = 0;
    this.clearRetryTimer();

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
    const existing = this.recentUpdates.get(event.pedidoId);
    const shouldReplace =
      !existing ||
      event.statusAtual !== event.statusAnterior ||
      existing.event.statusAtual === event.statusAtual;

    if (shouldReplace) {
      this.recentUpdates.set(event.pedidoId, {
        event,
        receivedAt: Date.now(),
      });
    }

    this.pruneExpiredUpdates();
    this.lastUpdateSignal.set(event);
    this.statusUpdatedSubject.next(event);
  }

  getRecentUpdate(orderId: number): OrderStatusUpdatedEvent | null {
    const entry = this.recentUpdates.get(orderId);
    if (!entry) {
      return null;
    }
    if (Date.now() - entry.receivedAt > RECENT_UPDATE_TTL_MS) {
      this.recentUpdates.delete(orderId);
      return null;
    }
    return entry.event;
  }

  private async startHubConnection(version: number): Promise<void> {
    try {
      const signalR = await import('@microsoft/signalr');
      if (this.connectVersion !== version || !this.isUserAuthenticated()) {
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
          this.retryAttempt = 0;
          this.connectionStateSignal.set('connected');
        }
      });

      connection.onclose(() => {
        if (this.hubConnection === connection) {
          this.hubConnection = null;
          this.connectionStateSignal.set('disconnected');
          this.scheduleReconnect(version);
        }
      });

      this.hubConnection = connection;
      await connection.start();

      if (this.connectVersion !== version) {
        connection.off(ORDER_STATUS_UPDATED_EVENT);
        void connection.stop().catch(() => undefined);
        return;
      }

      this.retryAttempt = 0;
      this.connectionStateSignal.set('connected');
    } catch (err: unknown) {
      if (this.connectVersion === version) {
        this.hubConnection = null;
        this.connectionStateSignal.set('disconnected');
        console.warn('[OrderRealtimeService] Falha ao conectar ao SignalR (/hubs/pedidos):', err);
        this.scheduleReconnect(version);
      }
    }
  }

  private scheduleReconnect(version: number): void {
    if (this.connectVersion !== version || !this.isUserAuthenticated()) {
      return;
    }

    this.clearRetryTimer();
    const delayIndex = Math.min(this.retryAttempt, RETRY_DELAYS_MS.length - 1);
    const delayMs = RETRY_DELAYS_MS[delayIndex];
    this.retryAttempt += 1;

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.connectVersion === version && this.isUserAuthenticated()) {
        this.connect();
      }
    }, delayMs);
  }

  private isUserAuthenticated(): boolean {
    return typeof this.authService.isAuthenticated === 'function'
      ? this.authService.isAuthenticated()
      : false;
  }

  private clearRetryTimer(): void {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private pruneExpiredUpdates(): void {
    const now = Date.now();
    for (const [orderId, entry] of this.recentUpdates.entries()) {
      if (now - entry.receivedAt > RECENT_UPDATE_TTL_MS) {
        this.recentUpdates.delete(orderId);
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
