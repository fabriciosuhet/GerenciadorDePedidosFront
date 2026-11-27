import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HealthReport } from '../models/health.model';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HealthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('stores Healthy readiness report on 200 OK', () => {
    const mockReport: HealthReport = {
      status: 'Healthy',
      totalDurationMs: 14.5,
      timestampUtc: '2026-11-27T16:30:00Z',
      checks: [
        {
          name: 'database',
          status: 'Healthy',
          durationMs: 8.2,
          description: 'Banco operacional',
          error: null,
        },
      ],
    };

    service.checkReadiness();

    const req = httpMock.expectOne((r) => r.url.endsWith('/health/ready'));
    expect(req.request.method).toBe('GET');
    req.flush(mockReport);

    expect(service.report()).toEqual(mockReport);
    expect(service.errorMessage()).toBeNull();
    expect(service.loading()).toBe(false);
  });

  it('parses Unhealthy readiness report payload even on 503 Service Unavailable', () => {
    const unhealthyReport: HealthReport = {
      status: 'Unhealthy',
      totalDurationMs: 52.1,
      timestampUtc: '2026-11-27T16:31:00Z',
      checks: [
        {
          name: 'redis',
          status: 'Unhealthy',
          durationMs: 50,
          description: 'Falha ao conectar no Redis',
          error: 'Connection refused',
        },
      ],
    };

    service.checkReadiness();

    const req = httpMock.expectOne((r) => r.url.endsWith('/health/ready'));
    req.flush(unhealthyReport, { status: 503, statusText: 'Service Unavailable' });

    expect(service.report()).toEqual(unhealthyReport);
    expect(service.errorMessage()).toBeNull();
  });

  it('sets fallback Unhealthy state and error message on network failure', () => {
    service.checkReadiness();

    const req = httpMock.expectOne((r) => r.url.endsWith('/health/ready'));
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(service.report()?.status).toBe('Unhealthy');
    expect(service.errorMessage()).toContain('API inacessível');
  });
});
