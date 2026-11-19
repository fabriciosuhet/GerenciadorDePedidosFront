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
import { ToastService } from '../../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../../core/utils/http-error.util';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { OrderDetailModalComponent } from '../../components/order-detail-modal/order-detail-modal.component';
import { OrderDetail, OrderSummary } from '../../models/order.model';
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
    OrderDetailModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-list.component.html',
})
export class OrderListComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly orderService = inject(OrderService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pageSize = signal(10);
  protected readonly currentPage = signal(1);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(true);
  protected readonly deleting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly orders = signal<OrderSummary[]>([]);
  protected readonly activeStatusTab = signal('');
  protected readonly orderNumberFilter = signal('');
  protected readonly selectedOrderDetail = signal<OrderDetail | null>(null);
  protected readonly deletingOrder = signal<OrderSummary | null>(null);

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
