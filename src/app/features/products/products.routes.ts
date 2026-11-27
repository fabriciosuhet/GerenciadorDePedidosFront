import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/auth.guard';

export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/product-list/product-list.component').then((m) => m.ProductListComponent),
  },
  {
    path: 'movements',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/stock-movement-list/stock-movement-list.component').then(
        (m) => m.StockMovementListComponent,
      ),
  },
  {
    path: 'alerts',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/stock-alert-list/stock-alert-list.component').then(
        (m) => m.StockAlertListComponent,
      ),
  },
];
