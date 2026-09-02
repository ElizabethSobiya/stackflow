import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '../../shared/ui/icon';

/** The marketing half of the auth screens — shared by sign-in and registration. */
@Component({
  selector: 'app-brand-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="mark">
      <span class="logo">SF</span>
      StackFlow
    </div>

    <div class="pitch">
      <h1 class="headline">Inventory and orders, under control.</h1>
      <p class="sub">
        One place for the catalog, stock levels and the order workflow — with an audit trail behind
        every number.
      </p>

      <div class="features">
        <div class="feature">
          <span class="feature__icon"><app-icon name="layers" [size]="15" /></span>
          <span class="feature__body">
            <span class="feature__title">Stock that stays honest</span>
            <span class="feature__text">Concurrent updates are reconciled, never silently lost.</span>
          </span>
        </div>
        <div class="feature">
          <span class="feature__icon"><app-icon name="orders" [size]="15" /></span>
          <span class="feature__body">
            <span class="feature__title">A workflow with rules</span>
            <span class="feature__text">Status changes are validated on the server, not the screen.</span>
          </span>
        </div>
        <div class="feature">
          <span class="feature__icon"><app-icon name="history" [size]="15" /></span>
          <span class="feature__body">
            <span class="feature__title">Every change accounted for</span>
            <span class="feature__text">Who moved what, when and why — kept for good.</span>
          </span>
        </div>
      </div>
    </div>

    <p class="foot">Angular · Spring Boot · PostgreSQL</p>
  `,
  styles: `
    /* A calm gradient rather than a photograph: legible in both themes, nothing to load. */
    :host {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: var(--space-6);
      padding: var(--space-7) var(--space-6);
      overflow: hidden;
      border-right: 1px solid var(--border);
      background:
        radial-gradient(1100px 520px at 12% -10%, color-mix(in srgb, var(--accent) 20%, transparent), transparent 62%),
        radial-gradient(760px 420px at 88% 110%, color-mix(in srgb, var(--info) 16%, transparent), transparent 60%),
        var(--surface-inset);
    }

    .mark { display: inline-flex; align-items: center; gap: 10px; font-weight: 650; letter-spacing: -0.015em; }

    .logo {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: linear-gradient(140deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #000));
      color: #fff;
      font-size: 12.5px;
      font-weight: 700;
    }

    .pitch { max-width: 430px; }
    .headline { font-size: 30px; line-height: 1.2; letter-spacing: -0.025em; margin-bottom: var(--space-3); }
    .sub { color: var(--text-muted); font-size: 14.5px; }

    .features { display: flex; flex-direction: column; gap: 14px; margin-top: var(--space-6); }
    .feature { display: flex; align-items: flex-start; gap: 11px; }

    .feature__icon {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      flex: none;
      border-radius: 8px;
      background: var(--surface-card);
      border: 1px solid var(--border);
      color: var(--accent);
    }

    .feature__body { display: flex; flex-direction: column; }
    .feature__title { font-weight: 550; font-size: 13.5px; }
    .feature__text { color: var(--text-muted); font-size: 12.5px; }
    .foot { color: var(--text-subtle); font-size: 12px; }
  `,
})
export class BrandPanel {}
