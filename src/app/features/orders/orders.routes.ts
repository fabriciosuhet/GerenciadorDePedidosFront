import { Routes } from '@angular/router';

export const ORDERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/order-list/order-list.component').then((m) => m.OrderListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/order-create/order-create.component').then((m) => m.OrderCreateComponent),
  },
];
