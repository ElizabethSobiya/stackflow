import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, IconName } from '../../shared/ui/icon';

export type MetricTone = 'accent' | 'success' | 'warning' | 'info';

@Component({
  selector: 'app-metric-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="card metric">
      <div class="metric__top">
        <span class="metric__label">{{ label() }}</span>
        <span class="metric__icon metric__icon--{{ tone() }}">
          <app-icon [name]="icon()" [size]="15" />
        </span>
      </div>
      <span class="metric__value numeric">{{ value() }}</span>
      @if (hint()) {
        <span class="subtle">{{ hint() }}</span>
      }
    </div>
  `,
  styles: `
    .metric {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: var(--space-4) var(--space-5) var(--space-5);
      transition: border-color var(--transition), box-shadow var(--transition);
    }

    .metric:hover { border-color: var(--border-strong); box-shadow: var(--shadow-sm); }

    .metric__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      margin-bottom: 6px;
    }

    .metric__label {
      font-size: 11.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.055em;
      color: var(--text-subtle);
    }

    .metric__icon {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
    }

    .metric__icon--accent { background: var(--accent-soft); color: var(--accent); }
    .metric__icon--success { background: var(--success-soft); color: var(--success); }
    .metric__icon--warning { background: var(--warning-soft); color: var(--warning); }
    .metric__icon--info { background: var(--info-soft); color: var(--info); }

    .metric__value { font-size: 26px; font-weight: 650; letter-spacing: -0.025em; line-height: 1.2; }
  `,
})
export class MetricCard {
  readonly label = input.required<string>();
  /** Accepts the `null` that Angular's number and currency pipes return for an absent value. */
  readonly value = input.required<string | number | null>();
  readonly icon = input.required<IconName>();
  readonly tone = input<MetricTone>('accent');
  readonly hint = input<string>();
}
