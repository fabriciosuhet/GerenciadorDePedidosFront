import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { HealthReport, HealthStatus } from '../../../core/models/health.model';

const CHECK_LABELS: Record<string, string> = {
  database: 'Banco de Dados',
  redis: 'Cache Redis',
  'masstransit-bus': 'Mensageria (MassTransit)',
};

const STATUS_LABELS: Record<HealthStatus, string> = {
  Healthy: 'Operacional',
  Degraded: 'Degradado',
  Unhealthy: 'Indisponível',
};

@Component({
  selector: 'app-system-health-popover',
  standalone: true,
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './system-health-popover.component.html',
})
export class SystemHealthPopoverComponent {
  readonly report = input<HealthReport | null>(null);
  readonly loading = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly refreshRequested = output<void>();

  protected readonly open = signal(false);

  protected readonly overallStatus = computed<HealthStatus | null>(() => this.report()?.status ?? null);

  protected readonly overallLabel = computed(() => {
    const status = this.overallStatus();
    if (!status) {
      return this.loading() ? 'Verificando...' : 'Status da API';
    }
    return STATUS_LABELS[status];
  });

  protected toggle(): void {
    const nextOpen = !this.open();
    this.open.set(nextOpen);
    if (nextOpen && this.report() === null && !this.loading()) {
      this.refreshRequested.emit();
    }
  }

  protected close(): void {
    this.open.set(false);
  }

  protected refresh(): void {
    if (!this.loading()) {
      this.refreshRequested.emit();
    }
  }

  protected formatCheckName(name: string): string {
    return CHECK_LABELS[name] ?? name;
  }

  protected formatStatus(status: HealthStatus): string {
    return STATUS_LABELS[status];
  }
}
