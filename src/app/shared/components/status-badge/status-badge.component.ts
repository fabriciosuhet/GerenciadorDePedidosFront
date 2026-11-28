import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  ORDER_STATUS_LABELS,
  OrderStatus,
} from '../../../features/orders/models/order.model';
import {
  STOCK_MOVEMENT_LABELS,
  StockMovementType,
} from '../../../features/products/models/product.model';

export type OrderStatusKey =
  | 'pending'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-badge.component.html',
})
export class StatusBadgeComponent {
  readonly status = input<OrderStatus | null>(null);
  readonly statusKey = input<OrderStatusKey | null>(null);
  readonly movementType = input<StockMovementType | null>(null);

  protected readonly resolvedKey = computed<OrderStatusKey | null>(() => {
    const explicitKey = this.statusKey();
    if (explicitKey) {
      return explicitKey;
    }
    const orderStatus = this.status();
    if (orderStatus === null || orderStatus === undefined) {
      return null;
    }
    switch (orderStatus) {
      case OrderStatus.Pending:
        return 'pending';
      case OrderStatus.Processed:
        return 'preparing';
      case OrderStatus.Completed:
        return 'delivered';
      case OrderStatus.Cancelled:
        return 'cancelled';
      case OrderStatus.Returned:
        return 'returned';
      default:
        return 'pending';
    }
  });

  protected readonly label = computed(() => {
    const orderStatus = this.status();
    if (orderStatus !== null && orderStatus !== undefined) {
      return ORDER_STATUS_LABELS[orderStatus] ?? 'Pendente';
    }
    const key = this.statusKey();
    if (key) {
      const map: Record<OrderStatusKey, string> = {
        pending: 'Pendente',
        preparing: 'Em Preparo',
        shipped: 'Enviado',
        delivered: 'Entregue',
        cancelled: 'Cancelado',
        returned: 'Devolvido',
      };
      return map[key];
    }
    const movement = this.movementType();
    if (movement !== null && movement !== undefined) {
      return STOCK_MOVEMENT_LABELS[movement] ?? '-';
    }
    return '-';
  });

  protected readonly badgeClasses = computed(() => {
    const key = this.resolvedKey();
    if (key) {
      switch (key) {
        case 'pending':
          return 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800/60';
        case 'preparing':
          return 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800/60';
        case 'shipped':
          return 'bg-indigo-50 text-indigo-800 ring-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-800/60';
        case 'delivered':
          return 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800/60';
        case 'cancelled':
          return 'bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800/60';
        case 'returned':
          return 'bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-800/60';
      }
    }

    const movement = this.movementType();
    if (movement === StockMovementType.Addition) {
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800/60';
    }
    if (movement === StockMovementType.Removal) {
      return 'bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800/60';
    }
    return 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700';
  });

  protected readonly dotClass = computed(() => {
    const key = this.resolvedKey();
    if (key) {
      switch (key) {
        case 'pending':
          return 'bg-amber-500';
        case 'preparing':
          return 'bg-sky-500';
        case 'shipped':
          return 'bg-indigo-500';
        case 'delivered':
          return 'bg-emerald-500';
        case 'cancelled':
          return 'bg-rose-500';
        case 'returned':
          return 'bg-violet-500';
      }
    }
    const movement = this.movementType();
    if (movement === StockMovementType.Addition) {
      return 'bg-emerald-500';
    }
    if (movement === StockMovementType.Removal) {
      return 'bg-rose-500';
    }
    return 'bg-slate-400';
  });
}
