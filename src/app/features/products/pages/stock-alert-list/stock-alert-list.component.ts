import { DatePipe } from '@angular/common';
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
import { finalize } from 'rxjs';
import { StockAlertService } from '../../../../core/services/stock-alert.service';
import { ToastService } from '../../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../../core/utils/http-error.util';
import { StockAlertRecord } from '../../models/product.model';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-stock-alert-list',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stock-alert-list.component.html',
})
export class StockAlertListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly stockAlertService = inject(StockAlertService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly onlyPending = signal(true);
  protected readonly resolvingId = signal<number | null>(null);
  protected readonly alerts = signal<StockAlertRecord[]>([]);
  protected readonly searchQuery = signal('');

  protected readonly searchForm = this.fb.nonNullable.group({
    query: [''],
  });

  protected readonly filteredAlerts = computed(() => {
    const term = this.searchQuery().trim().toLowerCase();
    const list = this.alerts();
    if (!term) {
      return list;
    }

    return list.filter(
      (alert) =>
        alert.produtoNome.toLowerCase().includes(term) ||
        String(alert.produtoId).includes(term) ||
        (alert.pedidoId !== null && String(alert.pedidoId).includes(term)),
    );
  });

  protected readonly pendingCount = computed(
    () => this.alerts().filter((alert) => !alert.resolvido).length,
  );

  protected readonly resolvedCount = computed(
    () => this.alerts().filter((alert) => alert.resolvido).length,
  );

  ngOnInit(): void {
    this.loadAlerts();
  }

  protected loadAlerts(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const pendingFilter = this.onlyPending();

    this.productService
      .getStockAlerts(pendingFilter)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (items) => {
          this.alerts.set(items);
          if (pendingFilter) {
            this.stockAlertService.setPendingBackendAlertCount(items.length);
          } else {
            this.stockAlertService.setPendingBackendAlertCount(
              items.filter((item) => !item.resolvido).length,
            );
          }
        },
        error: (err: unknown) => {
          this.alerts.set([]);
          this.errorMessage.set(
            extractApiErrorMessage(err, 'Erro ao carregar alertas de estoque.'),
          );
        },
      });
  }

  protected selectFilter(onlyPending: boolean): void {
    if (this.onlyPending() === onlyPending) {
      return;
    }
    this.onlyPending.set(onlyPending);
    this.loadAlerts();
  }

  protected applySearch(): void {
    this.searchQuery.set(this.searchForm.controls.query.value);
  }

  protected clearSearch(): void {
    this.searchForm.controls.query.setValue('');
    this.searchQuery.set('');
  }

  protected resolveAlert(alert: StockAlertRecord): void {
    if (alert.resolvido || this.resolvingId() !== null) {
      return;
    }

    this.resolvingId.set(alert.id);
    this.productService
      .resolveStockAlert(alert.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.resolvingId.set(null)),
      )
      .subscribe({
        next: () => {
          this.toastService.success(
            `Alerta #${alert.id} (${alert.produtoNome}) marcado como resolvido.`,
          );
          this.loadAlerts();
        },
        error: (err: unknown) => {
          this.toastService.error(
            extractApiErrorMessage(err, 'Não foi possível resolver o alerta de estoque.'),
          );
        },
      });
  }
}
