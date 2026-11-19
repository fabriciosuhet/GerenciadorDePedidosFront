import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ToastService } from '../services/toast.service';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let toastErrorSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    toastErrorSpy = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        {
          provide: ToastService,
          useValue: { error: toastErrorSpy },
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('shows admin restriction toast on 403 Forbidden', () => {
    http.get('/api/dashboard').subscribe({ error: () => {} });
    httpMock.expectOne('/api/dashboard').flush(null, { status: 403, statusText: 'Forbidden' });

    expect(toastErrorSpy).toHaveBeenCalledWith('Acesso restrito a administradores.');
  });

  it('does not show 403 toast on 404 NotFound', () => {
    http.get('/api/pedido/999').subscribe({ error: () => {} });
    httpMock.expectOne('/api/pedido/999').flush(null, { status: 404, statusText: 'Not Found' });

    expect(toastErrorSpy).not.toHaveBeenCalled();
  });
});
