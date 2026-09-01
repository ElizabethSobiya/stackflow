import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: '▦' },
  { path: '/products', label: 'Products', icon: '❑' },
  { path: '/stock', label: 'Stock', icon: '⛁' },
  { path: '/orders', label: 'Orders', icon: '⇄' },
];

/** Authenticated layout: navigation, identity, and the routed page. */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell" [class.shell--nav-open]="navOpen()">
      <aside class="sidebar">
        <div class="brand">
          <span class="brand__mark">SF</span>
          <span class="brand__name">StackFlow</span>
        </div>
        <nav class="nav">
          @for (item of nav; track item.path) {
            <a
              class="nav__link"
              [routerLink]="item.path"
              routerLinkActive="nav__link--active"
              (click)="navOpen.set(false)"
            >
              <span class="nav__icon" aria-hidden="true">{{ item.icon }}</span>
              {{ item.label }}
            </a>
          }
        </nav>
        <div class="sidebar__footer subtle">
          {{ auth.isAdmin() ? 'Administrator' : 'Staff' }} access
        </div>
      </aside>

      <div class="main">
        <header class="topbar">
          <button type="button" class="btn btn--ghost btn--sm topbar__toggle" (click)="navOpen.set(!navOpen())">
            ☰
          </button>
          <span class="spacer"></span>
          @if (auth.user(); as user) {
            <div class="identity">
              <span class="identity__name">{{ user.fullName }}</span>
              <span class="subtle">{{ user.email }}</span>
            </div>
            <span class="badge" [class.badge--brand]="user.role === 'ADMIN'">{{ user.role }}</span>
          }
          <button type="button" class="btn btn--sm" (click)="auth.logout()">Sign out</button>
        </header>

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    .shell {
      display: grid;
      grid-template-columns: var(--sidebar-width) 1fr;
      min-height: 100vh;
    }

    .sidebar {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
      padding: var(--space-5) var(--space-4);
      background: var(--surface-card);
      border-right: 1px solid var(--border);
      position: sticky;
      top: 0;
      height: 100vh;
    }

    .brand { display: flex; align-items: center; gap: var(--space-3); }

    .brand__mark {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: var(--brand);
      color: #fff;
      font-weight: 700;
      font-size: 12px;
    }

    .brand__name { font-weight: 600; letter-spacing: -0.01em; }

    .nav { display: flex; flex-direction: column; gap: 2px; }

    .nav__link {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: 9px 12px;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      font-weight: 500;
      text-decoration: none;
    }

    .nav__link:hover { background: var(--surface-hover); color: var(--text); text-decoration: none; }
    .nav__link--active { background: var(--brand-soft); color: var(--brand); }
    .nav__icon { width: 16px; text-align: center; }
    .sidebar__footer { margin-top: auto; }

    .main { display: flex; flex-direction: column; min-width: 0; }

    .topbar {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      height: var(--topbar-height);
      padding: 0 var(--space-5);
      background: var(--surface-card);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .topbar__toggle { display: none; }
    .identity { display: flex; flex-direction: column; line-height: 1.25; text-align: right; }
    .identity__name { font-weight: 600; font-size: 13px; }
    .content { padding: var(--space-5); max-width: 1320px; width: 100%; }

    @media (max-width: 860px) {
      .shell { grid-template-columns: 1fr; }

      .sidebar {
        position: fixed;
        inset: 0 auto 0 0;
        width: var(--sidebar-width);
        transform: translateX(-100%);
        transition: transform 160ms ease;
        z-index: 20;
      }

      .shell--nav-open .sidebar { transform: none; box-shadow: var(--shadow); }
      .topbar__toggle { display: inline-flex; }
      .identity { display: none; }
      .content { padding: var(--space-4); }
    }
  `,
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly nav = NAV;
  protected readonly navOpen = signal(false);
}
