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
import { finalize } from 'rxjs';
import { ToastService } from '../../../../core/services/toast.service';
import { triggerFileDownload } from '../../../../core/utils/file-download.util';
import { extractApiErrorMessage } from '../../../../core/utils/http-error.util';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { StockReportModalComponent } from '../../components/stock-report-modal/stock-report-modal.component';
import {
  STOCK_MOVEMENT_REASON_LABELS,
  StockMovementDetail,
  StockMovementListItem,
  StockMovementReason,
  StockMovementReportFilter,
  StockMovementType,
} from '../../models/product.model';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-stock-movement-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    PaginationComponent,
    StatusBadgeComponent,
    StockReportModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stock-movement-list.component.html',
})
export class StockMovementListComponent implements OnInit {
  protected readonly StockMovementType = StockMovementType;
  protected readonly StockMovementReason = StockMovementReason;
  protected readonly reasonLabels = STOCK_MOVEMENT_REASON_LABELS;
  private readonly productService = inject(ProductService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pageSize = signal(10);
  protected readonly currentPage = signal(1);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly movements = signal<StockMovementListItem[]>([]);
  protected readonly selectedTypeFilter = signal<StockMovementType | null>(null);
  protected readonly selectedDetail = signal<StockMovementDetail | null>(null);
  protected readonly reportModalOpen = signal(false);
  protected readonly exportingReport = signal(false);
  protected readonly reportErrorMessage = signal<string | null>(null);

  protected readonly searchForm = this.fb.nonNullable.group({
    query: [''],
  });

  protected readonly filteredMovements = computed(() => {
    const typeFilter = this.selectedTypeFilter();
    const all = this.movements();
    if (typeFilter === null) {
      return all;
    }
    return all.filter((item) => item.tipoMovimentacao === typeFilter);
  });

  ngOnInit(): void {
    this.loadMovements();
  }

  protected loadMovements(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.productService
      .getStockMovementsWithDetails(
        this.searchForm.controls.query.value,
        this.currentPage(),
        this.pageSize(),
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.movements.set(res.items);
          this.totalCount.set(res.totalCount);
        },
        error: (err: unknown) => {
          this.movements.set([]);
          this.totalCount.set(0);
          this.errorMessage.set(
            extractApiErrorMessage(err, 'Erro ao carregar movimentações de estoque.'),
          );
        },
      });
  }

  protected searchMovements(): void {
    this.currentPage.set(1);
    this.loadMovements();
  }

  protected selectTypeFilter(type: StockMovementType | null): void {
    this.selectedTypeFilter.set(type);
  }

  protected clearSearch(): void {
    this.searchForm.controls.query.setValue('');
    this.selectedTypeFilter.set(null);
    this.currentPage.set(1);
    this.loadMovements();
  }

  protected onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadMovements();
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadMovements();
  }

  protected openDetails(item: StockMovementListItem): void {
    if (
      item.tipoMovimentacao !== null &&
      item.quantidade !== undefined &&
      item.clienteNome !== undefined &&
      item.data !== undefined
    ) {
      this.selectedDetail.set({
        id: item.id,
        produtoId: item.produtoId,
        produtoNome: item.produtoNome,
        tipoMovimentacao: item.tipoMovimentacao,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        valorTotal: item.valorTotal,
        motivo: item.motivo,
        pedidoId: item.pedidoId,
        clienteNome: item.clienteNome,
        data: item.data,
      });
      return;
    }

    this.productService
      .getStockMovementById(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => this.selectedDetail.set(detail),
        error: (err: unknown) => {
          this.toastService.error(
            extractApiErrorMessage(err, 'Erro ao carregar detalhe da movimentação.'),
          );
        },
      });
  }

  protected openReportModal(): void {
    this.reportErrorMessage.set(null);
    this.reportModalOpen.set(true);
  }

  protected closeReportModal(): void {
    if (!this.exportingReport()) {
      this.reportModalOpen.set(false);
      this.reportErrorMessage.set(null);
    }
  }

  protected exportReport(filter: StockMovementReportFilter): void {
    this.exportingReport.set(true);
    this.reportErrorMessage.set(null);

    this.productService
      .downloadStockMovementReport(filter)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.exportingReport.set(false)),
      )
      .subscribe({
        next: (file) => {
          triggerFileDownload(file.blob, file.filename);
          this.toastService.success('Relatório gerado e download iniciado.');
          this.reportModalOpen.set(false);
        },
        error: (err: unknown) => {
          const message = extractApiErrorMessage(
            err,
            'Erro ao gerar relatório de movimentações de estoque.',
          );
          this.reportErrorMessage.set(message);
          this.toastService.error(message);
        },
      });
  }
}
