import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ReportFormat, ReportPeriod } from '../../../../core/models/report.model';
import { ToastService } from '../../../../core/services/toast.service';
import { triggerFileDownload } from '../../../../core/utils/file-download.util';
import { extractApiErrorMessage } from '../../../../core/utils/http-error.util';
import { OrderService } from '../../../orders/services/order.service';
import { ProductService } from '../../../products/services/product.service';

type ReportKind = 'sales' | 'stock';

interface PeriodOption {
  value: ReportPeriod;
  label: string;
  description: string;
}

@Component({
  selector: 'app-report-center',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './report-center.component.html',
})
export class ReportCenterComponent {
  private readonly orderService = inject(OrderService);
  private readonly productService = inject(ProductService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly periodOptions: readonly PeriodOption[] = [
    { value: 'Semana', label: 'Semanal', description: 'Segunda a domingo da semana de referência' },
    { value: 'Mes', label: 'Mensal', description: 'Do 1º ao último dia do mês selecionado' },
    { value: 'Ano', label: 'Anual', description: 'Consolidado completo do ano de referência' },
  ];

  protected readonly filterForm = this.fb.nonNullable.group({
    periodo: this.fb.nonNullable.control<ReportPeriod>('Mes'),
    dataReferencia: this.fb.nonNullable.control<string>(''),
  });

  protected readonly downloadingKey = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected selectPeriod(period: ReportPeriod): void {
    this.filterForm.controls.periodo.setValue(period);
  }

  protected clearReferenceDate(): void {
    this.filterForm.controls.dataReferencia.setValue('');
  }

  protected isDownloading(kind: ReportKind, format: ReportFormat): boolean {
    return this.downloadingKey() === `${kind}-${format}`;
  }

  protected downloadReport(kind: ReportKind, formato: ReportFormat): void {
    if (this.downloadingKey() !== null) {
      return;
    }

    const { periodo, dataReferencia } = this.filterForm.getRawValue();
    const filter = {
      periodo,
      formato,
      dataReferencia: dataReferencia.trim() ? dataReferencia.trim() : null,
    };

    const key = `${kind}-${formato}`;
    this.downloadingKey.set(key);
    this.errorMessage.set(null);

    const request$ =
      kind === 'sales'
        ? this.orderService.downloadSalesReport(filter)
        : this.productService.downloadStockMovementReport(filter);

    const label = kind === 'sales' ? 'Relatório de Vendas' : 'Relatório de Movimentações de Estoque';

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.downloadingKey.set(null)),
      )
      .subscribe({
        next: (file) => {
          triggerFileDownload(file.blob, file.filename);
          this.toastService.success(`${label} (${formato}) gerado e download iniciado.`);
        },
        error: (err: unknown) => {
          const message = extractApiErrorMessage(err, `Erro ao gerar ${label.toLowerCase()}.`);
          this.errorMessage.set(message);
          this.toastService.error(message);
        },
      });
  }
}
