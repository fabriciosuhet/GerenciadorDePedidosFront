import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
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
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { ReportFormat, ReportPeriod } from '../../../../core/models/report.model';
import { AuthService } from '../../../../core/services/auth.service';
import { OrderRealtimeService } from '../../../../core/services/order-realtime.service';
import { StockAlertService } from '../../../../core/services/stock-alert.service';
import { ToastService } from '../../../../core/services/toast.service';
import { triggerFileDownload } from '../../../../core/utils/file-download.util';
import { extractApiErrorMessage } from '../../../../core/utils/http-error.util';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { CustomerDetail } from '../../../customers/models/customer.model';
import { CustomerService } from '../../../customers/services/customer.service';
import { OrderStatus } from '../../../orders/models/order.model';
import { OrderService } from '../../../orders/services/order.service';
import { DashboardQueryParams, DashboardSummary } from '../../models/dashboard.model';
import { DashboardService } from '../../services/dashboard.service';

interface PeriodTab {
  label: string;
  value: ReportPeriod | null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly customerService = inject(CustomerService);
  private readonly orderService = inject(OrderService);
  private readonly orderRealtimeService = inject(OrderRealtimeService);
  private readonly stockAlertService = inject(StockAlertService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly periodTabs: readonly PeriodTab[] = [
    { label: 'Geral', value: null },
    { label: 'Semana', value: 'Semana' },
    { label: 'Mês', value: 'Mes' },
    { label: 'Ano', value: 'Ano' },
  ];

  protected readonly topProductOptions: readonly number[] = [5, 10, 20];

  protected readonly loading = signal(true);
  protected readonly refreshingAnalytics = signal(false);
  protected readonly exportingFormat = signal<ReportFormat | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly summary = signal<DashboardSummary | null>(null);
  protected readonly currentUser = signal<CustomerDetail | null>(null);
  protected readonly selectedPeriod = signal<ReportPeriod | null>(null);

  protected readonly analyticsForm = this.fb.nonNullable.group({
    dataReferencia: [''],
    topProdutos: [5],
  });

  protected readonly lowStockCount = computed(() =>
    Math.max(
      this.stockAlertService.alerts().length,
      this.summary()?.produtosComEstoqueBaixo ?? 0,
    ),
  );

  protected readonly topProducts = computed(() => this.summary()?.topProdutos ?? []);

  protected readonly maxTopProductRevenue = computed(() => {
    const items = this.topProducts();
    if (items.length === 0) {
      return 0;
    }
    return Math.max(...items.map((item) => item.faturamentoTotal), 0);
  });

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

    this.orderRealtimeService.statusUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        const user = this.currentUser();
        if (user) {
          const hasOrder = user.pedidos.some((o) => o.id === event.pedidoId);
          if (hasOrder) {
            this.currentUser.set({
              ...user,
              pedidos: user.pedidos.map((order) =>
                order.id === event.pedidoId
                  ? { ...order, status: event.statusAtual, total: event.total }
                  : order,
              ),
            });
          }
        }

        if (this.authService.isAdmin() && !this.loading()) {
          this.reloadAdminSummary();
        }
      });
  }

  protected loadDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const me$ = this.customerService.getMe().pipe(catchError(() => of(null)));
    const summary$ = this.authService.isAdmin()
      ? this.dashboardService.getSummary(this.buildDashboardFilters())
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

  protected selectPeriod(period: ReportPeriod | null): void {
    if (this.selectedPeriod() === period) {
      return;
    }
    this.selectedPeriod.set(period);
    if (period === null) {
      this.analyticsForm.controls.dataReferencia.setValue('');
    }
    this.reloadAdminSummary();
  }

  protected onAnalyticsFiltersChanged(): void {
    this.reloadAdminSummary();
  }

  protected clearReferenceDate(): void {
    this.analyticsForm.controls.dataReferencia.setValue('');
    this.reloadAdminSummary();
  }

  protected calculateRevenueShare(revenue: number): number {
    const max = this.maxTopProductRevenue();
    if (max <= 0) {
      return 0;
    }
    return Math.max(6, Math.min(100, Math.round((revenue / max) * 100)));
  }

  protected exportSalesReport(formato: ReportFormat): void {
    if (this.exportingFormat() !== null) {
      return;
    }

    const periodo: ReportPeriod = this.selectedPeriod() ?? 'Mes';
    const dataReferencia = this.analyticsForm.controls.dataReferencia.value.trim() || null;

    this.exportingFormat.set(formato);
    this.orderService
      .downloadSalesReport({ periodo, formato, dataReferencia })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.exportingFormat.set(null)),
      )
      .subscribe({
        next: (file) => {
          triggerFileDownload(file.blob, file.filename);
          this.toastService.success(`Relatório de vendas (${formato}) gerado com sucesso.`);
        },
        error: (err: unknown) => {
          this.toastService.error(
            extractApiErrorMessage(err, 'Erro ao exportar relatório de vendas.'),
          );
        },
      });
  }

  private reloadAdminSummary(): void {
    if (!this.authService.isAdmin()) {
      return;
    }

    this.refreshingAnalytics.set(true);
    this.dashboardService
      .getSummary(this.buildDashboardFilters())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.refreshingAnalytics.set(false)),
      )
      .subscribe({
        next: (summary) => {
          this.summary.set(summary);
        },
        error: (err: unknown) => {
          this.toastService.error(
            extractApiErrorMessage(err, 'Não foi possível atualizar os indicadores do período.'),
          );
        },
      });
  }

  private buildDashboardFilters(): DashboardQueryParams {
    const periodo = this.selectedPeriod();
    const { dataReferencia, topProdutos } = this.analyticsForm.getRawValue();

    return {
      periodo,
      dataReferencia: periodo && dataReferencia.trim() ? dataReferencia.trim() : null,
      topProdutos: Number(topProdutos) || 5,
    };
  }
}
