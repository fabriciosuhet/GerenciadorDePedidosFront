import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  EMPTY,
  Observable,
  catchError,
  finalize,
  map,
  shareReplay,
  take,
  tap,
  throwError,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UserRoleName,
} from '../../features/auth/models/auth.model';

interface StoredSession {
  token: string;
  refreshToken: string;
  email: string;
  role: UserRoleName;
  customerId?: string;
  expiresAt: number;
}

const STORAGE_KEY = 'gdp_session';
const MS_ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
const MS_NAME_ID_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiBaseUrl = `${environment.apiUrl}/api`;

  private readonly sessionSignal = signal<StoredSession | null>(this.loadInitialSession());
  private refreshInFlight$: Observable<string> | null = null;

  readonly session = this.sessionSignal.asReadonly();
  readonly token = computed(() => this.sessionSignal()?.token ?? null);
  readonly refreshToken = computed(() => this.sessionSignal()?.refreshToken ?? null);
  readonly isAuthenticated = computed(() => {
    const current = this.sessionSignal();
    if (!current?.token) {
      return false;
    }
    return Date.now() < current.expiresAt || Boolean(current.refreshToken);
  });
  readonly userEmail = computed(() => this.sessionSignal()?.email ?? '');
  readonly role = computed<UserRoleName>(() => this.sessionSignal()?.role ?? 'Usuario');
  readonly isAdmin = computed(() => this.isAuthenticated() && this.role() === 'Admin');
  readonly customerId = computed(() => this.sessionSignal()?.customerId ?? null);

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiBaseUrl}/login`, payload).pipe(
      tap((res) => {
        this.persistSession(res.token, res.refreshToken, res.email);
      }),
    );
  }

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiBaseUrl}/cliente/registrar`, payload).pipe(
      tap((res) => {
        this.persistSession(res.token, res.refreshToken, payload.email, res.id);
      }),
    );
  }

  refreshSession(): Observable<string> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const currentRefreshToken = this.sessionSignal()?.refreshToken;
    if (!currentRefreshToken) {
      return throwError(() => new Error('Refresh token ausente.'));
    }

    const customerId = this.sessionSignal()?.customerId;

    this.refreshInFlight$ = this.http
      .post<LoginResponse>(`${this.apiBaseUrl}/login/refresh`, {
        refreshToken: currentRefreshToken,
      })
      .pipe(
        tap((res) => {
          this.persistSession(res.token, res.refreshToken, res.email, customerId);
        }),
        map((res) => res.token),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay(1),
      );

    return this.refreshInFlight$;
  }

  logout(redirect = true): void {
    const current = this.sessionSignal();
    this.clearSession(redirect);

    if (current?.refreshToken && current.token) {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${current.token}`,
      });
      this.http
        .post<void>(
          `${this.apiBaseUrl}/login/logout`,
          { refreshToken: current.refreshToken },
          { headers },
        )
        .pipe(
          take(1),
          catchError(() => EMPTY),
        )
        .subscribe();
    }
  }

  clearSession(redirect = true): void {
    localStorage.removeItem(STORAGE_KEY);
    this.sessionSignal.set(null);
    this.refreshInFlight$ = null;
    if (redirect) {
      void this.router.navigate(['/login']);
    }
  }

  private persistSession(
    token: string,
    refreshToken: string,
    fallbackEmail: string,
    customerId?: string,
  ): void {
    const claims = decodeJwtPayload(token);
    const rawRole = (claims[MS_ROLE_CLAIM] ?? claims['role'] ?? 'Usuario') as string;
    const role: UserRoleName = rawRole === 'Admin' ? 'Admin' : 'Usuario';
    const email = typeof claims['userName'] === 'string' ? claims['userName'] : fallbackEmail;
    const claimCustomerId =
      typeof claims['clienteId'] === 'string'
        ? claims['clienteId']
        : typeof claims[MS_NAME_ID_CLAIM] === 'string'
          ? claims[MS_NAME_ID_CLAIM]
          : undefined;
    const expSeconds =
      typeof claims['exp'] === 'number'
        ? claims['exp']
        : Math.floor(Date.now() / 1000) + 15 * 60;

    const session: StoredSession = {
      token,
      refreshToken,
      email,
      role,
      customerId: customerId ?? claimCustomerId,
      expiresAt: expSeconds * 1000,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this.sessionSignal.set(session);
  }

  private loadInitialSession(): StoredSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as StoredSession;
      if (!parsed.token) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      if (Date.now() >= parsed.expiresAt && !parsed.refreshToken) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return {};
    }
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}
