import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

function makeFakeJwt(expOffsetSeconds: number): string {
  const encode = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    userName: 'user@teste.com',
    role: 'Usuario',
    exp: Math.floor(Date.now() / 1000) + expOffsetSeconds,
  })}.sig`;
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', redirectTo: '' }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('refreshes expired token once for concurrent 401 responses and retries requests', () => {
    const expiredToken = makeFakeJwt(-60);
    const freshToken = makeFakeJwt(900);

    authService.login({ email: 'user@teste.com', password: 'User@1234' }).subscribe();
    httpMock
      .expectOne((r) => r.url.endsWith('/api/login'))
      .flush({ email: 'user@teste.com', token: expiredToken, refreshToken: 'refresh-1' });

    let responses: [unknown, unknown] | undefined;
    forkJoin([
      http.get('/api/pedido'),
      http.get('/api/produto'),
    ]).subscribe((res) => {
      responses = res;
    });

    const pedidoReq1 = httpMock.expectOne('/api/pedido');
    const produtoReq1 = httpMock.expectOne('/api/produto');
    expect(pedidoReq1.request.headers.get('Authorization')).toBe(`Bearer ${expiredToken}`);
    expect(produtoReq1.request.headers.get('Authorization')).toBe(`Bearer ${expiredToken}`);

    pedidoReq1.flush(null, { status: 401, statusText: 'Unauthorized' });
    produtoReq1.flush(null, { status: 401, statusText: 'Unauthorized' });

    const refreshReqs = httpMock.match((r) => r.url.endsWith('/api/login/refresh'));
    expect(refreshReqs.length).toBe(1);
    refreshReqs[0].flush({
      email: 'user@teste.com',
      token: freshToken,
      refreshToken: 'refresh-2',
    });

    const pedidoRetry = httpMock.expectOne('/api/pedido');
    const produtoRetry = httpMock.expectOne('/api/produto');
    expect(pedidoRetry.request.headers.get('Authorization')).toBe(`Bearer ${freshToken}`);
    expect(produtoRetry.request.headers.get('Authorization')).toBe(`Bearer ${freshToken}`);

    pedidoRetry.flush({ items: ['pedido'] });
    produtoRetry.flush({ items: ['produto'] });

    expect(responses).toEqual([{ items: ['pedido'] }, { items: ['produto'] }]);
  });

  it('clears session when refresh fails on 401', () => {
    const expiredToken = makeFakeJwt(-60);

    authService.login({ email: 'user@teste.com', password: 'User@1234' }).subscribe();
    httpMock
      .expectOne((r) => r.url.endsWith('/api/login'))
      .flush({ email: 'user@teste.com', token: expiredToken, refreshToken: 'refresh-invalid' });

    let failed = false;
    http.get('/api/pedido').subscribe({
      error: () => {
        failed = true;
      },
    });

    httpMock.expectOne('/api/pedido').flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne((r) => r.url.endsWith('/api/login/refresh'))
      .flush({ error: 'Refresh token expirado.' }, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(authService.isAuthenticated()).toBe(false);
    expect(authService.token()).toBeNull();
  });
});
