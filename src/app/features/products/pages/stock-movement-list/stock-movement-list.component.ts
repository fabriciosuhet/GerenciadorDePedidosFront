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
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastService } from '../../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../../core/utils/http-error.util';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import {
  StockMovementDetail,
  StockMovementListItem,
  StockMovementType,
} from '../../models/product.model';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-stock-movement-list',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, PaginationComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stock-movement-list.component.html',
})
export class StockMovementListComponent implements OnInit {
  protected readonly StockMovementType = StockMovementType;
  private readonly productService = inject(ProductService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pageSize = 8;
  protected readonly currentPage = signal(1);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly movements = signal<StockMovementListItem[]>([]);
  protected readonly selectedTypeFilter = signal<StockMovementType | null>(null);
  protected readonly selectedDetail = signal<StockMovementDetail | null>(null);
  protected readonly searchControl = new FormControl('', { nonNullable: true });

  protected readonly filteredMovements = computed(() => {
    const typeFilter = this.selectedTypeFilter();
    const all = this.movements();
    if (typeFilter === null) {
      return all;
    }
    return all.filter((item) => item.tipoMovimentacao === typeFilter);
  });

  protected readonly paginatedMovements = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredMovements().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.loadMovements();
  }

  protected loadMovements(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.productService
      .getStockMovementsWithDetails(this.searchControl.value)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.movements.set(res.items);
          this.currentPage.set(1);
        },
        error: (err: unknown) => {
          this.movements.set([]);
          this.errorMessage.set(
            extractApiErrorMessage(err, 'Erro ao carregar movimentações de estoque.'),
          );
        },
      });
  }

  protected selectTypeFilter(type: StockMovementType | null): void {
    this.selectedTypeFilter.set(type);
    this.currentPage.set(1);
  }

  protected clearSearch(): void {
    this.searchControl.setValue('');
    this.selectedTypeFilter.set(null);
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
}
