import { HttpClient, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CORRELATION_ID_HEADER, correlationIdInterceptor } from './correlation-id.interceptor';

describe('correlationIdInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([correlationIdInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds X-Correlation-ID header to API requests', () => {
    http.get(`${environment.apiUrl}/api/produto`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/produto`);
    const headerValue = req.request.headers.get(CORRELATION_ID_HEADER);
    expect(headerValue).toBeTruthy();
    expect(headerValue!.length).toBeGreaterThanOrEqual(8);
    req.flush([]);
  });

  it('preserves existing X-Correlation-ID header when already provided', () => {
    http
      .get(`${environment.apiUrl}/health/ready`, {
        headers: new HttpHeaders({ [CORRELATION_ID_HEADER]: 'custom-trace-123' }),
      })
      .subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/health/ready`);
    expect(req.request.headers.get(CORRELATION_ID_HEADER)).toBe('custom-trace-123');
    req.flush({});
  });

  it('does not attach X-Correlation-ID to external URLs', () => {
    http.get('https://example.com/status').subscribe();

    const req = httpMock.expectOne('https://example.com/status');
    expect(req.request.headers.has(CORRELATION_ID_HEADER)).toBe(false);
    req.flush({});
  });
});
