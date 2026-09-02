import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { ThemeService } from '../core/theme/theme.service';
import { Icon, IconName } from '../shared/ui/icon';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  hint: string;
}

const NAV: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard', hint: 'Metrics and recent activity' },
  { path: '/products', label: 'Products', icon: 'package', hint: 'Catalog' },
  { path: '/stock', label: 'Stock', icon: 'layers', hint: 'Levels and adjustments' },
  { path: '/orders', label: 'Orders', icon: 'orders', hint: 'Order workflow' },
];

const THEME_ICON = { system: 'monitor', light: 'sun', dark: 'moon' } as const;

/** Authenticated layout: navigation, identity and the routed page. */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LowerCasePipe, Icon],
  template: `
    <div class="shell">
      @if (navOpen()) {
        <div class="scrim" (click)="navOpen.set(false)" aria-hidden="true"></div>
      }

      <aside class="sidebar" [class.sidebar--open]="navOpen()">
        <a class="brand" routerLink="/dashboard" (click)="navOpen.set(false)">
          <span class="brand__mark">SF</span>
          <span class="brand__text">
            <span class="brand__name">StackFlow</span>
            <span class="brand__tag">Inventory &amp; orders</span>
          </span>
        </a>

        <nav class="nav" aria-label="Main">
          <span class="nav__section">Operations</span>
          @for (item of nav; track item.path) {
            <a
              class="nav__link"
              [routerLink]="item.path"
              routerLinkActive="nav__link--active"
              [title]="item.hint"
              (click)="navOpen.set(false)"
            >
              <app-icon [name]="item.icon" [size]="17" />
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="sidebar__footer">
          @if (auth.user(); as user) {
            <div class="account">
              <span class="avatar" [attr.aria-hidden]="true">{{ initials() }}</span>
              <span class="account__text">
                <span class="account__name truncate">{{ user.fullName }}</span>
                <span class="account__role">
                  @if (auth.isAdmin()) {
                    <app-icon name="shield" [size]="11" />
                  }
                  {{ user.role | lowercase }}
                </span>
              </span>
            </div>
          }
        </div>
      </aside>

      <div class="main">
        <header class="topbar">
          <button
            type="button"
            class="btn btn--ghost btn--icon topbar__menu"
            aria-label="Toggle navigation"
            (click)="navOpen.set(!navOpen())"
          >
            <app-icon name="menu" [size]="18" />
          </button>

          <span class="spacer"></span>

          <button
            type="button"
            class="btn btn--ghost btn--icon"
            [title]="themeLabel()"
            [attr.aria-label]="themeLabel()"
            (click)="theme.cycle()"
          >
            <app-icon [name]="themeIcon()" [size]="17" />
          </button>

          <button type="button" class="btn btn--sm" (click)="auth.logout()">
            <app-icon name="logout" [size]="14" />
            Sign out
          </button>
        </header>

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    .shell { display: grid; grid-template-columns: var(--sidebar-width) 1fr; min-height: 100vh; }

    .sidebar {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
      padding: var(--space-5) var(--space-3) var(--space-4);
      background: var(--surface-card);
      border-right: 1px solid var(--border);
      position: sticky;
      top: 0;
      height: 100vh;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 var(--space-2);
      color: var(--text);
      text-decoration: none;
    }

    .brand__mark {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      flex: none;
      border-radius: 9px;
      background: linear-gradient(140deg, var(--accent), color-mix(in srgb, var(--accent) 62%, #000));
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: -0.02em;
      box-shadow: var(--shadow-xs);
    }

    .brand__text { display: flex; flex-direction: column; line-height: 1.25; }
    .brand__name { font-weight: 650; letter-spacing: -0.015em; }
    .brand__tag { font-size: 11px; color: var(--text-subtle); }

    .nav { display: flex; flex-direction: column; gap: 2px; }

    .nav__section {
      padding: 0 var(--space-3) 6px;
      font-size: 10.5px;
      font-weight: 650;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-subtle);
    }

    .nav__link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px var(--space-3);
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      font-size: 13.5px;
      font-weight: 500;
      text-decoration: none;
      transition: background var(--transition), color var(--transition);
    }

    .nav__link:hover { background: var(--surface-hover); color: var(--text); }

    .nav__link--active {
      background: var(--accent-soft);
      color: var(--accent);
      font-weight: 550;
    }

    .sidebar__footer { margin-top: auto; }

    .account {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: var(--space-2);
      border-radius: var(--radius-sm);
      background: var(--surface-inset);
      border: 1px solid var(--border);
    }

    .avatar {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      flex: none;
      border-radius: 50%;
      background: var(--accent-soft);
      color: var(--accent);
      font-size: 11.5px;
      font-weight: 650;
    }

    .account__text { display: flex; flex-direction: column; line-height: 1.3; min-width: 0; }
    .account__name { font-size: 13px; font-weight: 550; }

    .account__role {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      color: var(--text-subtle);
      text-transform: capitalize;
    }

    .main { display: flex; flex-direction: column; min-width: 0; }

    .topbar {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      height: var(--topbar-height);
      padding: 0 var(--space-5);
      background: color-mix(in srgb, var(--surface-card) 82%, transparent);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 20;
    }

    .topbar__menu { display: none; }
    .content { padding: var(--space-5); width: 100%; max-width: 1340px; animation: fade-in 180ms ease-out; }
    .scrim { position: fixed; inset: 0; z-index: 25; background: rgb(12 16 22 / 40%); }

    @media (max-width: 900px) {
      .shell { grid-template-columns: 1fr; }

      .sidebar {
        position: fixed;
        inset: 0 auto 0 0;
        z-index: 30;
        width: var(--sidebar-width);
        transform: translateX(-100%);
        transition: transform var(--transition);
      }

      .sidebar--open { transform: none; box-shadow: var(--shadow-lg); }
      .topbar__menu { display: inline-flex; }
      .content { padding: var(--space-4); }
    }
  `,
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly nav = NAV;
  protected readonly navOpen = signal(false);

  protected readonly themeIcon = computed(() => THEME_ICON[this.theme.preference()]);

  protected readonly themeLabel = computed(() => {
    const preference = this.theme.preference();
    return preference === 'system'
      ? `Theme: follows your system (${this.theme.resolved()})`
      : `Theme: ${preference}`;
  });

  protected readonly initials = computed(() => {
    const name = this.auth.user()?.fullName ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  });
}
