import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ForgotPasswordComponent } from './forgot-password.component';

describe('ForgotPasswordComponent (Functional)', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('blocks invalid email and posts valid email to POST /api/login/esqueci-senha', () => {
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const form = el.querySelector('form')!;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    httpMock.expectNone((r) => r.url.endsWith('/api/login/esqueci-senha'));
    expect(el.textContent).toContain('Informe um e-mail válido.');

    const emailInput = el.querySelector<HTMLInputElement>('#forgot-email')!;
    emailInput.value = 'usuario@teste.com';
    emailInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    form.dispatchEvent(new Event('submit'));

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/login/esqueci-senha'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'usuario@teste.com' });
    req.flush({
      message: 'Se o e-mail informado estiver cadastrado, você receberá as instruções.',
    });
    fixture.detectChanges();

    expect(el.querySelector('[role="status"]')?.textContent).toContain(
      'Se o e-mail informado estiver cadastrado',
    );
  });
});
