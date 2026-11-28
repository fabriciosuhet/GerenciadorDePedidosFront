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
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { StockAlertService } from '../../../../core/services/stock-alert.service';
import { ToastService } from '../../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../../core/utils/http-error.util';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { OrderDetailModalComponent } from '../../components/order-detail-modal/order-detail-modal.component';
import { OrderReturnModalComponent } from '../../components/order-return-modal/order-return-modal.component';
import {
  OrderDetail,
  OrderStatus,
  OrderSummary,
  ReturnOrderPayload,
} from '../../models/order.model';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    ConfirmDialogComponent,
    PaginationComponent,
    StatusBadgeComponent,
    OrderDetailModalComponent,
    OrderReturnModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-list.component.html',
})
export class OrderListComponent implements OnInit {
  protected readonly OrderStatus = OrderStatus;
  protected readonly authService = inject(AuthService);
  private readonly orderService = inject(OrderService);
  private readonly stockAlertService = inject(StockAlertService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pageSize = signal(10);
  protected readonly currentPage = signal(1);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(true);
  protected readonly cancelling = signal(false);
  protected readonly completing = signal(false);
  protected readonly returning = signal(false);
  protected readonly deleting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly returnErrorMessage = signal<string | null>(null);
  protected readonly orders = signal<OrderSummary[]>([]);
  protected readonly activeStatusTab = signal('');
  protected readonly orderNumberFilter = signal('');
  protected readonly selectedOrderDetail = signal<OrderDetail | null>(null);
  protected readonly cancellingOrderId = signal<number | null>(null);
  protected readonly completingOrderId = signal<number | null>(null);
  protected readonly returningOrderId = signal<number | null>(null);
  protected readonly deletingOrder = signal<OrderSummary | null>(null);

  protected readonly modalBusy = computed(
    () => this.cancelling() || this.completing() || this.returning(),
  );

  protected readonly filterForm = this.fb.nonNullable.group({
    orderNumber: [''],
    query: [''],
  });

  protected readonly statusTabs = [
    { label: 'Todos', value: '' },
    { label: 'Pendente', value: 'Pendente' },
    { label: 'Em Preparo', value: 'Processado' },
    { label: 'Entregue', value: 'Concluido' },
    { label: 'Cancelado', value: 'Cancelado' },
    { label: 'Devolvido', value: 'Devolvido' },
  ];

  protected readonly filteredOrders = computed(() => {
    const numFilter = this.orderNumberFilter().trim().replace(/^#/, '');
    const all = this.orders();
    if (!numFilter) {
      return all;
    }
    return all.filter((o) => String(o.id).includes(numFilter));
  });

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const q = params.get('q')?.trim() ?? '';
      this.currentPage.set(1);
      if (/^#?\d+$/.test(q)) {
        const cleanId = q.replace(/^#/, '');
        this.filterForm.patchValue({ orderNumber: cleanId, query: '' });
        this.orderNumberFilter.set(cleanId);
        this.loadOrders();
      } else {
        this.filterForm.patchValue({ orderNumber: '', query: q });
        this.orderNumberFilter.set('');
        this.activeStatusTab.set(q);
        this.loadOrders();
      }
    });
  }

  protected canCancel(order: OrderSummary): boolean {
    if (order.status === undefined) {
      return this.activeStatusTab() !== 'Cancelado' && this.activeStatusTab() !== 'Devolvido';
    }
    return order.status === OrderStatus.Pending || order.status === OrderStatus.Processed;
  }

  protected canComplete(order: OrderSummary): boolean {
    return this.authService.isAdmin() && order.status === OrderStatus.Processed;
  }

  protected canReturn(order: OrderSummary): boolean {
    return this.authService.isAdmin() && order.status === OrderStatus.Completed;
  }

  protected loadOrders(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const query = this.filterForm.controls.query.value;
    const effectiveSize = this.orderNumberFilter().trim() ? 100 : this.pageSize();

    this.orderService
      .getAll(query, this.currentPage(), effectiveSize)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.orders.set(res.items);
          this.totalCount.set(res.totalCount);
        },
        error: (err: unknown) => {
          this.orders.set([]);
          this.totalCount.set(0);
          this.errorMessage.set(extractApiErrorMessage(err, 'Erro ao carregar pedidos.'));
        },
      });
  }

  protected applyFilters(): void {
    const { orderNumber, query } = this.filterForm.getRawValue();
    this.orderNumberFilter.set(orderNumber);
    this.activeStatusTab.set(query);
    this.currentPage.set(1);
    this.loadOrders();
  }

  protected selectStatusTab(statusQuery: string): void {
    this.activeStatusTab.set(statusQuery);
    this.filterForm.patchValue({ query: statusQuery });
    this.currentPage.set(1);
    this.loadOrders();
  }

  protected clearFilters(): void {
    this.filterForm.reset({ orderNumber: '', query: '' });
    this.orderNumberFilter.set('');
    this.activeStatusTab.set('');
    this.currentPage.set(1);
    this.loadOrders();
  }

  protected onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadOrders();
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadOrders();
  }

  protected openOrderDetails(id: number): void {
    this.orderService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => this.selectedOrderDetail.set(detail),
        error: (err: unknown) => {
          this.toastService.error(
            extractApiErrorMessage(err, 'Não foi possível carregar os detalhes do pedido.'),
          );
        },
      });
  }

  protected requestCancelOrder(orderId: number): void {
    this.cancellingOrderId.set(orderId);
  }

  protected confirmCancelOrder(): void {
    const orderId = this.cancellingOrderId();
    if (orderId === null) {
      return;
    }

    this.cancelling.set(true);
    this.orderService
      .cancel(orderId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cancelling.set(false)),
      )
      .subscribe({
        next: (result) => {
          const message = result.estoqueEstornado
            ? `Pedido #${result.pedidoId} cancelado! ${result.unidadesEstornadas} unidade(s) estornada(s) ao estoque.`
            : `Pedido #${result.pedidoId} cancelado com sucesso!`;
          this.toastService.success(message);
          this.cancellingOrderId.set(null);

          const currentDetail = this.selectedOrderDetail();
          if (currentDetail?.id === result.pedidoId) {
            this.selectedOrderDetail.set({ ...currentDetail, status: result.status });
          }

          this.loadOrders();
          if (result.estoqueEstornado) {
            this.stockAlertService.checkCatalogStock();
          }
        },
        error: (err: unknown) => {
          this.cancellingOrderId.set(null);
          this.toastService.error(extractApiErrorMessage(err, 'Erro ao cancelar pedido.'));
        },
      });
  }

  protected requestCompleteOrder(orderId: number): void {
    this.completingOrderId.set(orderId);
  }

  protected confirmCompleteOrder(): void {
    const orderId = this.completingOrderId();
    if (orderId === null) {
      return;
    }

    this.completing.set(true);
    this.orderService
      .complete(orderId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.completing.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.toastService.success(`Pedido #${result.pedidoId} marcado como concluído/entregue!`);
          this.completingOrderId.set(null);

          const currentDetail = this.selectedOrderDetail();
          if (currentDetail?.id === result.pedidoId) {
            this.selectedOrderDetail.set({
              ...currentDetail,
              status: result.status,
              concluidoEm: result.concluidoEm,
            });
          }

          this.loadOrders();
        },
        error: (err: unknown) => {
          this.completingOrderId.set(null);
          this.toastService.error(extractApiErrorMessage(err, 'Erro ao concluir pedido.'));
        },
      });
  }

  protected requestReturnOrder(orderId: number): void {
    this.returnErrorMessage.set(null);
    this.returningOrderId.set(orderId);
  }

  protected closeReturnModal(): void {
    if (!this.returning()) {
      this.returningOrderId.set(null);
      this.returnErrorMessage.set(null);
    }
  }

  protected submitReturnOrder(payload: ReturnOrderPayload): void {
    const orderId = this.returningOrderId();
    if (orderId === null) {
      return;
    }

    this.returning.set(true);
    this.returnErrorMessage.set(null);

    this.orderService
      .returnOrder(orderId, payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.returning.set(false)),
      )
      .subscribe({
        next: (result) => {
          const message = result.estoqueEstornado
            ? `Pedido #${result.pedidoId} devolvido! ${result.unidadesEstornadas} unidade(s) retornada(s) ao estoque.`
            : `Pedido #${result.pedidoId} registrado como devolvido.`;
          this.toastService.success(message);
          this.returningOrderId.set(null);

          const currentDetail = this.selectedOrderDetail();
          if (currentDetail?.id === result.pedidoId) {
            this.selectedOrderDetail.set({
              ...currentDetail,
              status: result.status,
              devolvidoEm: result.devolvidoEm,
              motivoDevolucao: result.motivo,
            });
          }

          this.loadOrders();
          if (result.estoqueEstornado) {
            this.stockAlertService.checkCatalogStock();
          }
        },
        error: (err: unknown) => {
          const message = extractApiErrorMessage(err, 'Erro ao registrar devolução do pedido.');
          this.returnErrorMessage.set(message);
          this.toastService.error(message);
        },
      });
  }

  protected confirmDeleteOrder(): void {
    const target = this.deletingOrder();
    if (!target) return;

    this.deleting.set(true);
    this.orderService
      .delete(target.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deleting.set(false)),
      )
      .subscribe({
        next: (msg) => {
          this.toastService.success(msg || 'Pedido excluído com sucesso!');
          this.deletingOrder.set(null);
          this.loadOrders();
        },
        error: (err: unknown) => {
          this.toastService.error(extractApiErrorMessage(err, 'Erro ao excluir pedido.'));
        },
      });
  }
}
