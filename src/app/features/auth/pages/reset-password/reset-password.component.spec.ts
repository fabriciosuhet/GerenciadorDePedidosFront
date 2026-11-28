import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent (Functional)', () => {
  let httpMock: HttpTestingController;

  afterEach(() => {
    httpMock.verify();
  });

  it('reads ?token= from URL, validates strong matching passwords, submits reset and navigates to /login', async () => {
    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', component: ResetPasswordComponent }]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({ token: 'tok-from-email-123' })),
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(ResetPasswordComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Token validado a partir do link de e-mail');
    expect(el.querySelector('#reset-token')).toBeNull();

    const newPwd = el.querySelector<HTMLInputElement>('#reset-new-password')!;
    const confirmPwd = el.querySelector<HTMLInputElement>('#reset-confirm-password')!;

    newPwd.value = 'Nova@1234';
    newPwd.dispatchEvent(new Event('input'));
    confirmPwd.value = 'Diferente@1';
    confirmPwd.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = el.querySelector('form')!;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    httpMock.expectNone((r) => r.url.endsWith('/api/login/redefinir-senha'));
    expect(el.textContent).toContain('não confere');

    confirmPwd.value = 'Nova@1234';
    confirmPwd.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    form.dispatchEvent(new Event('submit'));

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/login/redefinir-senha'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      token: 'tok-from-email-123',
      novaSenha: 'Nova@1234',
      confirmarNovaSenha: 'Nova@1234',
    });
    req.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(router.url).toBe('/login');
  });

  it('shows manual token input when URL has no token query param', async () => {
    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({})),
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ResetPasswordComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#reset-token')).not.toBeNull();
  });
});
