import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { HealthService } from '../../../core/services/health.service';
import { LoadingService } from '../../../core/services/loading.service';
import { OrderRealtimeService } from '../../../core/services/order-realtime.service';
import { StockAlertService } from '../../../core/services/stock-alert.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../core/utils/http-error.util';
import { ChangePasswordRequest } from '../../../features/auth/models/auth.model';
import { ChangePasswordModalComponent } from '../change-password-modal/change-password-modal.component';
import { SidebarNavItemComponent } from '../sidebar-nav-item/sidebar-nav-item.component';
import { StockAlertPopupComponent } from '../stock-alert-popup/stock-alert-popup.component';
import { SystemHealthPopoverComponent } from '../system-health-popover/system-health-popover.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    ReactiveFormsModule,
    ChangePasswordModalComponent,
    SidebarNavItemComponent,
    StockAlertPopupComponent,
    SystemHealthPopoverComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
})
export class ShellComponent implements OnInit, OnDestroy {
  protected readonly authService = inject(AuthService);
  protected readonly healthService = inject(HealthService);
  protected readonly loadingService = inject(LoadingService);
  protected readonly orderRealtimeService = inject(OrderRealtimeService);
  protected readonly themeService = inject(ThemeService);
  protected readonly stockAlertService = inject(StockAlertService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly mobileMenuOpen = signal(false);
  protected readonly changePasswordModalOpen = signal(false);
  protected readonly changingPassword = signal(false);
  protected readonly changePasswordError = signal<string | null>(null);
  protected readonly searchForm = this.fb.nonNullable.group({
    query: [''],
  });

  protected readonly userInitial = computed(() => {
    const email = this.authService.userEmail();
    return email ? email.charAt(0).toUpperCase() : 'U';
  });

  ngOnInit(): void {
    this.orderRealtimeService.connect();
    this.stockAlertService.checkCatalogStock();
    if (this.authService.isAdmin()) {
      this.stockAlertService.refreshPendingAlertsCount();
      this.healthService.checkReadiness();
    }
  }

  ngOnDestroy(): void {
    this.orderRealtimeService.disconnect();
  }

  protected onHeaderSearch(): void {
    const raw = this.searchForm.controls.query.value.trim();
    void this.router.navigate(['/orders'], {
      queryParams: raw ? { q: raw } : {},
    });
  }

  protected openChangePasswordModal(): void {
    this.mobileMenuOpen.set(false);
    this.changePasswordError.set(null);
    this.changePasswordModalOpen.set(true);
  }

  protected closeChangePasswordModal(): void {
    if (!this.changingPassword()) {
      this.changePasswordModalOpen.set(false);
      this.changePasswordError.set(null);
    }
  }

  protected submitChangePassword(payload: ChangePasswordRequest): void {
    this.changingPassword.set(true);
    this.changePasswordError.set(null);

    this.authService
      .changePassword(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.changingPassword.set(false)),
      )
      .subscribe({
        next: () => {
          this.changePasswordModalOpen.set(false);
          this.toastService.success(
            'Senha alterada com sucesso! Faça login novamente com sua nova senha.',
          );
          this.authService.clearSession(true);
        },
        error: (err: unknown) => {
          const message = extractApiErrorMessage(err, 'Não foi possível alterar a senha.');
          this.changePasswordError.set(message);
          this.toastService.error(message);
        },
      });
  }
}
