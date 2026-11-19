import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LoadingService } from '../services/loading.service';
import { loadingInterceptor } from './loading.interceptor';

describe('loadingInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let loadingService: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([loadingInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    loadingService = TestBed.inject(LoadingService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('tracks active requests with LoadingService', () => {
    expect(loadingService.isLoading()).toBe(false);

    http.get('/api/produto').subscribe();
    expect(loadingService.isLoading()).toBe(true);

    httpMock.expectOne('/api/produto').flush({ items: [] });
    expect(loadingService.isLoading()).toBe(false);
  });
});
