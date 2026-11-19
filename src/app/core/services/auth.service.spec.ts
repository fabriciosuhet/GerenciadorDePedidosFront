import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from './auth.service';

function makeFakeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('persists session, refreshToken and decodes Admin role on login', () => {
    const token = makeFakeJwt({
      userName: 'admin@teste.com',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'Admin',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    service.login({ email: 'admin@teste.com', password: 'Password@1' }).subscribe();

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/login'));
    req.flush({ email: 'admin@teste.com', token, refreshToken: 'refresh-123' });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.isAdmin()).toBe(true);
    expect(service.userEmail()).toBe('admin@teste.com');
    expect(service.refreshToken()).toBe('refresh-123');
  });

  it('stores customerId, refreshToken and Usuario role on register', () => {
    const token = makeFakeJwt({
      userName: 'user@teste.com',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'Usuario',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    service
      .register({
        nomeCompleto: 'User Teste',
        email: 'user@teste.com',
        telefone: '11999999999',
        senha: 'User@1234',
      })
      .subscribe();

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/cliente/registrar'));
    req.flush({
      id: '11111111-1111-1111-1111-111111111111',
      token,
      refreshToken: 'refresh-reg',
    });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.isAdmin()).toBe(false);
    expect(service.customerId()).toBe('11111111-1111-1111-1111-111111111111');
    expect(service.refreshToken()).toBe('refresh-reg');
  });

  it('deduplicates concurrent refreshSession calls into a single HTTP request and rotates tokens', () => {
    const oldToken = makeFakeJwt({
      userName: 'user@teste.com',
      role: 'Usuario',
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    const newToken = makeFakeJwt({
      userName: 'user@teste.com',
      role: 'Usuario',
      exp: Math.floor(Date.now() / 1000) + 900,
    });

    service.login({ email: 'user@teste.com', password: 'User@1234' }).subscribe();
    httpMock
      .expectOne((r) => r.url.endsWith('/api/login'))
      .flush({ email: 'user@teste.com', token: oldToken, refreshToken: 'refresh-old' });

    let tokens: [string, string] | undefined;
    forkJoin([service.refreshSession(), service.refreshSession()]).subscribe((res) => {
      tokens = res;
    });

    const refreshReqs = httpMock.match((r) => r.url.endsWith('/api/login/refresh'));
    expect(refreshReqs.length).toBe(1);
    expect(refreshReqs[0].request.body).toEqual({ refreshToken: 'refresh-old' });

    refreshReqs[0].flush({
      email: 'user@teste.com',
      token: newToken,
      refreshToken: 'refresh-new',
    });

    expect(tokens).toEqual([newToken, newToken]);
    expect(service.token()).toBe(newToken);
    expect(service.refreshToken()).toBe('refresh-new');
  });

  it('revokes refreshToken on server and clears local session on logout', () => {
    const token = makeFakeJwt({
      userName: 'user@teste.com',
      role: 'Usuario',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    service.login({ email: 'user@teste.com', password: 'User@1234' }).subscribe();
    httpMock
      .expectOne((r) => r.url.endsWith('/api/login'))
      .flush({ email: 'user@teste.com', token, refreshToken: 'refresh-to-revoke' });

    service.logout(false);

    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
    expect(service.refreshToken()).toBeNull();

    const logoutReq = httpMock.expectOne((r) => r.url.endsWith('/api/login/logout'));
    expect(logoutReq.request.body).toEqual({ refreshToken: 'refresh-to-revoke' });
    expect(logoutReq.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    logoutReq.flush(null, { status: 204, statusText: 'No Content' });
  });
});
