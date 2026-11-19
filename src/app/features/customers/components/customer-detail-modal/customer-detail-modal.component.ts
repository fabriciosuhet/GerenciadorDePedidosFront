import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { CustomerDetail } from '../../models/customer.model';

@Component({
  selector: 'app-customer-detail-modal',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-detail-modal.component.html',
})
export class CustomerDetailModalComponent {
  readonly customer = input<CustomerDetail | null>(null);
  readonly closed = output<void>();
}
