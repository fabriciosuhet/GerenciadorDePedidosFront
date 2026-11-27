import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  StockMovementReportFilter,
  StockReportFormat,
  StockReportPeriod,
} from '../../models/product.model';

interface SelectOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

@Component({
  selector: 'app-stock-report-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stock-report-modal.component.html',
})
export class StockReportModalComponent {
  private readonly fb = inject(FormBuilder);

  readonly open = input<boolean>(false);
  readonly downloading = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly closed = output<void>();
  readonly exportRequested = output<StockMovementReportFilter>();

  protected readonly periodOptions: readonly SelectOption<StockReportPeriod>[] = [
    {
      value: 'Semana',
      label: 'Semanal',
      description: 'Segunda a domingo da semana de referência',
    },
    {
      value: 'Mes',
      label: 'Mensal',
      description: 'Do 1º ao último dia do mês selecionado',
    },
    {
      value: 'Ano',
      label: 'Anual',
      description: 'Consolidado completo do ano de referência',
    },
  ];

  protected readonly formatOptions: readonly SelectOption<StockReportFormat>[] = [
    {
      value: 'Pdf',
      label: 'PDF',
      description: 'Relatório formatado em paisagem A4',
    },
    {
      value: 'Csv',
      label: 'CSV',
      description: 'Planilha compatível com Excel (UTF-8)',
    },
  ];

  protected readonly reportForm = this.fb.nonNullable.group({
    periodo: this.fb.nonNullable.control<StockReportPeriod>('Mes'),
    formato: this.fb.nonNullable.control<StockReportFormat>('Pdf'),
    dataReferencia: this.fb.nonNullable.control<string>(''),
  });

  constructor() {
    effect(() => {
      if (this.downloading()) {
        this.reportForm.disable({ emitEvent: false });
      } else {
        this.reportForm.enable({ emitEvent: false });
      }
    });
  }

  protected selectPeriod(period: StockReportPeriod): void {
    this.reportForm.controls.periodo.setValue(period);
  }

  protected selectFormat(format: StockReportFormat): void {
    this.reportForm.controls.formato.setValue(format);
  }

  protected clearReferenceDate(): void {
    this.reportForm.controls.dataReferencia.setValue('');
  }

  protected handleClose(): void {
    if (!this.downloading()) {
      this.closed.emit();
    }
  }

  protected submit(): void {
    if (this.downloading()) {
      return;
    }

    const { periodo, formato, dataReferencia } = this.reportForm.getRawValue();
    this.exportRequested.emit({
      periodo,
      formato,
      dataReferencia: dataReferencia.trim() ? dataReferencia.trim() : null,
    });
  }
}
