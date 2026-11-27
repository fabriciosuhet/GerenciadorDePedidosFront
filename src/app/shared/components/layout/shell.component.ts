import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingService } from '../../../core/services/loading.service';
import { StockAlertService } from '../../../core/services/stock-alert.service';
import { ThemeService } from '../../../core/services/theme.service';
import { SidebarNavItemComponent } from '../sidebar-nav-item/sidebar-nav-item.component';
import { StockAlertPopupComponent } from '../stock-alert-popup/stock-alert-popup.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    ReactiveFormsModule,
    SidebarNavItemComponent,
    StockAlertPopupComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
})
export class ShellComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly loadingService = inject(LoadingService);
  protected readonly themeService = inject(ThemeService);
  protected readonly stockAlertService = inject(StockAlertService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly mobileMenuOpen = signal(false);
  protected readonly searchForm = this.fb.nonNullable.group({
    query: [''],
  });

  protected readonly userInitial = computed(() => {
    const email = this.authService.userEmail();
    return email ? email.charAt(0).toUpperCase() : 'U';
  });

  ngOnInit(): void {
    this.stockAlertService.checkCatalogStock();
    if (this.authService.isAdmin()) {
      this.stockAlertService.refreshPendingAlertsCount();
    }
  }

  protected onHeaderSearch(): void {
    const raw = this.searchForm.controls.query.value.trim();
    void this.router.navigate(['/orders'], {
      queryParams: raw ? { q: raw } : {},
    });
  }
}
