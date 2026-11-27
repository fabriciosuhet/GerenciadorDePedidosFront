import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { OrderDetail, OrderStatus } from '../../models/order.model';

@Component({
  selector: 'app-order-detail-modal',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-detail-modal.component.html',
})
export class OrderDetailModalComponent {
  protected readonly OrderStatus = OrderStatus;

  readonly order = input<OrderDetail | null>(null);
  readonly cancelling = input<boolean>(false);

  readonly closed = output<void>();
  readonly cancelRequested = output<OrderDetail>();
}
