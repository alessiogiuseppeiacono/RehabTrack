import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard, roleGuard('fisioterapista')],
    loadComponent: () => import('./dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'dashboard/card/:id',
    canActivate: [authGuard, roleGuard('fisioterapista')],
    loadComponent: () => import('./dashboard/card-detail/card-detail.page').then((m) => m.CardDetailPage),
  },
  {
    path: '',
    canActivate: [authGuard, roleGuard('paziente')],
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
