import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-metric-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card metric">
      <span class="metric__label">{{ label() }}</span>
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
      gap: 4px;
      padding: var(--space-4) var(--space-5);
    }

    .metric__label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-subtle);
    }

    .metric__value { font-size: 25px; font-weight: 650; letter-spacing: -0.02em; }
  `,
})
export class MetricCard {
  readonly label = input.required<string>();
  /** Accepts the `null` that Angular's number/currency pipes return for an absent value. */
  readonly value = input.required<string | number | null>();
  readonly hint = input<string>();
}
