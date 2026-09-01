import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';

export interface RevenuePoint {
  date: string;
  amount: number;
}

interface Bar extends RevenuePoint {
  heightPercent: number;
}

/**
 * Seven-day revenue as inline SVG-free CSS bars.
 *
 * <p>A charting library would add ~150 kB to the initial bundle for one chart; this renders from
 * the same data with no dependency and inherits the theme tokens automatically.
 */
@Component({
  selector: 'app-revenue-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DecimalPipe],
  template: `
    <div class="chart">
      @for (bar of bars(); track bar.date) {
        <div class="chart__col" [title]="bar.amount | number: '1.2-2'">
          <div class="chart__bar" [style.height.%]="bar.heightPercent"></div>
          <span class="chart__label">{{ bar.date | date: 'EEE' }}</span>
        </div>
      }
    </div>
    <p class="subtle chart__peak">Peak day: {{ peak() | number: '1.0-0' }}</p>
  `,
  styles: `
    .chart {
      display: flex;
      align-items: flex-end;
      gap: var(--space-2);
      height: 168px;
      padding-top: var(--space-2);
    }

    .chart__col {
      display: flex;
      flex: 1;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      height: 100%;
    }

    .chart__bar {
      width: 100%;
      min-height: 3px;
      border-radius: 4px 4px 2px 2px;
      background: linear-gradient(180deg, var(--brand), color-mix(in srgb, var(--brand) 55%, transparent));
      transition: height 240ms ease;
    }

    .chart__label { font-size: 11px; color: var(--text-subtle); }
    .chart__peak { margin: var(--space-3) 0 0; }
  `,
})
export class RevenueChart {
  readonly points = input.required<RevenuePoint[]>();

  protected readonly peak = computed(() => Math.max(0, ...this.points().map((point) => point.amount)));

  protected readonly bars = computed<Bar[]>(() => {
    const max = this.peak();
    return this.points().map((point) => ({
      ...point,
      heightPercent: max > 0 ? Math.max(2, (point.amount / max) * 100) : 2,
    }));
  });
}
