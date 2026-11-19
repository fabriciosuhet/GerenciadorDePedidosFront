import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StockAlertItem } from '../../../core/services/stock-alert.service';

@Component({
  selector: 'app-stock-alert-popup',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stock-alert-popup.component.html',
})
export class StockAlertPopupComponent {
  readonly items = input.required<StockAlertItem[]>();
  readonly dismissed = output<void>();
}
