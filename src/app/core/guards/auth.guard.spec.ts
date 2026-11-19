import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { adminGuard, authGuard, guestGuard } from './auth.guard';

describe('Auth Guards', () => {
  const isAuthenticated = signal(false);
  const isAdmin = signal(false);
  let toastErrorSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    isAuthenticated.set(false);
    isAdmin.set(false);
    toastErrorSpy = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { isAuthenticated, isAdmin },
        },
        {
          provide: ToastService,
          useValue: { error: toastErrorSpy },
        },
      ],
    });
  });

  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = {} as RouterStateSnapshot;

  it('authGuard allows authenticated users and redirects guests to /login', () => {
    const denied = TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));
    expect(denied instanceof UrlTree).toBe(true);
    expect((denied as UrlTree).toString()).toBe('/login');

    isAuthenticated.set(true);
    const allowed = TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));
    expect(allowed).toBe(true);
  });

  it('guestGuard allows unauthenticated users and redirects authenticated users to /dashboard', () => {
    const allowed = TestBed.runInInjectionContext(() => guestGuard(dummyRoute, dummyState));
    expect(allowed).toBe(true);

    isAuthenticated.set(true);
    const redirected = TestBed.runInInjectionContext(() => guestGuard(dummyRoute, dummyState));
    expect(redirected instanceof UrlTree).toBe(true);
    expect((redirected as UrlTree).toString()).toBe('/dashboard');
  });

  it('adminGuard allows Admin and redirects non-admin to /dashboard with toast', () => {
    const denied = TestBed.runInInjectionContext(() => adminGuard(dummyRoute, dummyState));
    expect(denied instanceof UrlTree).toBe(true);
    expect((denied as UrlTree).toString()).toBe('/dashboard');
    expect(toastErrorSpy).toHaveBeenCalledOnce();

    isAdmin.set(true);
    const allowed = TestBed.runInInjectionContext(() => adminGuard(dummyRoute, dummyState));
    expect(allowed).toBe(true);
  });
});
