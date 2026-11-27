import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const CORRELATION_ID_HEADER = 'X-Correlation-ID';

function generateCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `gdp-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export const correlationIdInterceptor: HttpInterceptorFn = (req, next) => {
  const isApiRequest = req.url.startsWith(environment.apiUrl);
  if (!isApiRequest || req.headers.has(CORRELATION_ID_HEADER)) {
    return next(req);
  }

  const correlatedReq = req.clone({
    setHeaders: {
      [CORRELATION_ID_HEADER]: generateCorrelationId(),
    },
  });

  return next(correlatedReq);
};
