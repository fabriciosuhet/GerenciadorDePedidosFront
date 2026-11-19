import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { LoginComponent } from './login.component';

function makeFakeJwt(): string {
  const encode = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    userName: 'admin@teste.com',
    role: 'Admin',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.sig`;
}

describe('LoginComponent (Functional)', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'dashboard', redirectTo: '' }]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('validates fields and shows error message on 404 invalid credentials', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const form = el.querySelector('form')!;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(el.textContent).toContain('Informe um e-mail válido.');

    const emailInput = el.querySelector('#login-email') as HTMLInputElement;
    const passwordInput = el.querySelector('#login-password') as HTMLInputElement;
    emailInput.value = 'errado@teste.com';
    emailInput.dispatchEvent(new Event('input'));
    passwordInput.value = 'SenhaErrada@1';
    passwordInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    form.dispatchEvent(new Event('submit'));
    const req = httpMock.expectOne((r) => r.url.endsWith('/api/login'));
    req.flush('Email ou senha invalidos', { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(el.textContent).toContain('Email ou senha invalidos');
  });

  it('logs in and navigates to /dashboard on valid credentials', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const emailInput = el.querySelector('#login-email') as HTMLInputElement;
    const passwordInput = el.querySelector('#login-password') as HTMLInputElement;
    emailInput.value = 'admin@teste.com';
    emailInput.dispatchEvent(new Event('input'));
    passwordInput.value = 'Admin@123';
    passwordInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = httpMock.expectOne((r) => r.url.endsWith('/api/login'));
    req.flush({
      email: 'admin@teste.com',
      token: makeFakeJwt(),
      refreshToken: 'refresh-1',
    });

    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });
});
