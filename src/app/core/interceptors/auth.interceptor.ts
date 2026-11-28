import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

const IS_AUTH_RETRY = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);

  const isAuthBypassRoute =
    req.url.endsWith('/login') ||
    req.url.endsWith('/login/refresh') ||
    req.url.endsWith('/login/logout') ||
    req.url.endsWith('/login/esqueci-senha') ||
    req.url.endsWith('/login/redefinir-senha') ||
    req.url.endsWith('/cliente/registrar');

  if (isAuthBypassRoute) {
    return next(req);
  }

  const token = authService.token();
  const authReq = token ? withBearerToken(req, token) : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.context.get(IS_AUTH_RETRY)
      ) {
        if (!authService.refreshToken()) {
          toastService.error('Sua sessão expirou. Faça login novamente.');
          authService.clearSession(true);
          return throwError(() => error);
        }

        return authService.refreshSession().pipe(
          switchMap((newToken) => {
            const retriedReq = withBearerToken(req, newToken).clone({
              context: req.context.set(IS_AUTH_RETRY, true),
            });
            return next(retriedReq);
          }),
          catchError((refreshError: unknown) => {
            toastService.error('Sua sessão expirou. Faça login novamente.');
            authService.clearSession(true);
            return throwError(() => refreshError);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};

function withBearerToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}
