import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, of, take, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HealthReport } from '../models/health.model';

function isHealthReport(value: unknown): value is HealthReport {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    (record['status'] === 'Healthy' ||
      record['status'] === 'Degraded' ||
      record['status'] === 'Unhealthy') &&
    Array.isArray(record['checks'])
  );
}

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);
  private readonly readyUrl = `${environment.apiUrl}/health/ready`;

  private readonly reportSignal = signal<HealthReport | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly errorMessageSignal = signal<string | null>(null);

  readonly report = this.reportSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly errorMessage = this.errorMessageSignal.asReadonly();

  fetchReadiness(): Observable<HealthReport | null> {
    this.loadingSignal.set(true);
    this.errorMessageSignal.set(null);

    return this.http.get<HealthReport>(this.readyUrl).pipe(
      tap((report) => {
        this.reportSignal.set(report);
      }),
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 503 && isHealthReport(err.error)) {
          this.reportSignal.set(err.error);
          return of(err.error);
        }

        const message =
          err instanceof HttpErrorResponse && err.status === 0
            ? 'API inacessível em http://localhost:8080. Verifique se o container Docker está ativo.'
            : 'Não foi possível consultar a saúde dos serviços da API.';

        this.reportSignal.set({
          status: 'Unhealthy',
          totalDurationMs: 0,
          timestampUtc: new Date().toISOString(),
          checks: [],
        });
        this.errorMessageSignal.set(message);
        return of(null);
      }),
      finalize(() => {
        this.loadingSignal.set(false);
      }),
    );
  }

  checkReadiness(): void {
    this.fetchReadiness().pipe(take(1)).subscribe();
  }
}
