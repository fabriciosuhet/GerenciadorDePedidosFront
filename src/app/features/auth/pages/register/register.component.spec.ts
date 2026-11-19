import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RegisterComponent } from './register.component';

function makeFakeJwt(): string {
  const encode = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    userName: 'maria@teste.com',
    role: 'Usuario',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.sig`;
}

describe('RegisterComponent (Functional)', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
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

  it('blocks weak password submission and registers valid user redirecting to /dashboard', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const setVal = (selector: string, val: string) => {
      const input = el.querySelector(selector) as HTMLInputElement;
      input.value = val;
      input.dispatchEvent(new Event('input'));
    };

    setVal('#reg-name', 'Maria Silva');
    setVal('#reg-email', 'maria@teste.com');
    setVal('#reg-phone', '11999998888');
    setVal('#reg-password', '123');
    fixture.detectChanges();

    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    httpMock.expectNone((r) => r.url.endsWith('/api/cliente/registrar'));

    setVal('#reg-password', 'Maria@123');
    fixture.detectChanges();

    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = httpMock.expectOne((r) => r.url.endsWith('/api/cliente/registrar'));
    expect(req.request.method).toBe('POST');
    req.flush({
      id: '11111111-1111-1111-1111-111111111111',
      token: makeFakeJwt(),
      refreshToken: 'refresh-reg',
    });

    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });
});
