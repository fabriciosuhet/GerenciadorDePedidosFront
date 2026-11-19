import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { StockAlertService } from '../../../../core/services/stock-alert.service';
import { extractApiErrorMessage } from '../../../../core/utils/http-error.util';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { CustomerDetail } from '../../../customers/models/customer.model';
import { CustomerService } from '../../../customers/services/customer.service';
import { OrderStatus } from '../../../orders/models/order.model';
import { DashboardSummary } from '../../models/dashboard.model';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly customerService = inject(CustomerService);
  private readonly stockAlertService = inject(StockAlertService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly summary = signal<DashboardSummary | null>(null);
  protected readonly currentUser = signal<CustomerDetail | null>(null);

  protected readonly lowStockCount = computed(() =>
    Math.max(
      this.stockAlertService.alerts().length,
      this.summary()?.produtosComEstoqueBaixo ?? 0,
    ),
  );

  protected readonly myOrders = computed(() =>
    (this.currentUser()?.pedidos ?? []).slice(0, 6),
  );

  protected readonly myOrdersCount = computed(
    () => this.currentUser()?.pedidos.length ?? 0,
  );

  protected readonly myPendingOrdersCount = computed(
    () =>
      (this.currentUser()?.pedidos ?? []).filter(
        (order) => order.status === OrderStatus.Pending,
      ).length,
  );

  protected readonly myCompletedOrdersCount = computed(
    () =>
      (this.currentUser()?.pedidos ?? []).filter(
        (order) => order.status === OrderStatus.Completed,
      ).length,
  );

  protected readonly myTotalSpent = computed(() =>
    (this.currentUser()?.pedidos ?? [])
      .filter((order) => order.status !== OrderStatus.Cancelled)
      .reduce((acc, order) => acc + order.total, 0),
  );

  ngOnInit(): void {
    this.loadDashboard();
  }

  protected loadDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const me$ = this.customerService.getMe().pipe(catchError(() => of(null)));
    const summary$ = this.authService.isAdmin()
      ? this.dashboardService.getSummary()
      : of(null);

    forkJoin({
      me: me$,
      summary: summary$,
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ me, summary }) => {
          this.currentUser.set(me);
          this.summary.set(summary);
          if (!me && !summary) {
            this.errorMessage.set('Não foi possível carregar os dados do painel.');
          }
        },
        error: (err: unknown) => {
          this.errorMessage.set(
            extractApiErrorMessage(err, 'Não foi possível carregar os indicadores do painel.'),
          );
        },
      });
  }
}
