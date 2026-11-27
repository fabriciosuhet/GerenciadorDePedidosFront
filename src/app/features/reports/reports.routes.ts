import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/report-center/report-center.component').then((m) => m.ReportCenterComponent),
  },
];
