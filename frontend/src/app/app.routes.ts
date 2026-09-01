import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

/**
 * Every feature is lazy-loaded: the login screen ships without the dashboard, the order module is
 * fetched the first time someone opens it. Adding a feature means adding one entry here.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Sign in · StackFlow',
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    title: 'Create account · StackFlow',
    loadComponent: () => import('./features/auth/register-page').then((m) => m.RegisterPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      {
        path: 'dashboard',
        title: 'Dashboard · StackFlow',
        loadComponent: () => import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'products',
        title: 'Products · StackFlow',
        loadComponent: () => import('./features/products/product-list-page').then((m) => m.ProductListPage),
      },
      {
        path: 'products/new',
        canActivate: [roleGuard('ADMIN')],
        title: 'New product · StackFlow',
        loadComponent: () => import('./features/products/product-form-page').then((m) => m.ProductFormPage),
      },
      {
        path: 'products/:id/edit',
        canActivate: [roleGuard('ADMIN')],
        title: 'Edit product · StackFlow',
        loadComponent: () => import('./features/products/product-form-page').then((m) => m.ProductFormPage),
      },
      {
        path: 'stock',
        title: 'Stock · StackFlow',
        loadComponent: () => import('./features/stock/stock-page').then((m) => m.StockPage),
      },
      {
        path: 'orders',
        title: 'Orders · StackFlow',
        loadComponent: () => import('./features/orders/order-list-page').then((m) => m.OrderListPage),
      },
      {
        path: 'orders/new',
        title: 'New order · StackFlow',
        loadComponent: () => import('./features/orders/order-create-page').then((m) => m.OrderCreatePage),
      },
      {
        path: 'orders/:id',
        title: 'Order · StackFlow',
        loadComponent: () => import('./features/orders/order-detail-page').then((m) => m.OrderDetailPage),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
