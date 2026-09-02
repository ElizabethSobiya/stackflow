import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';

export interface RevenuePoint {
  date: string;
  amount: number;
}

interface PlottedPoint extends RevenuePoint {
  x: number;
  y: number;
  index: number;
}

const WIDTH = 720;
const HEIGHT = 190;
const PADDING = { top: 14, right: 8, bottom: 26, left: 8 };
const GRID_LINES = 3;

/**
 * Seven-day revenue as an inline SVG area chart.
 *
 * <p>Hand-drawn rather than pulled from a charting library: one chart does not justify ~150 kB in
 * the initial bundle, and drawing it here means it inherits the theme tokens and stays legible in
 * both schemes without a second configuration.
 */
@Component({
  selector: 'app-revenue-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DatePipe],
  template: `
    <div class="chart">
      <svg
        [attr.viewBox]="'0 0 ' + width + ' ' + height"
        class="chart__svg"
        role="img"
        [attr.aria-label]="'Revenue over the last ' + points().length + ' days'"
        (pointerleave)="hovered.set(null)"
      >
        <defs>
          <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.24" />
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
          </linearGradient>
        </defs>

        @for (line of gridLines(); track line) {
          <line class="chart__grid" [attr.x1]="0" [attr.x2]="width" [attr.y1]="line" [attr.y2]="line" />
        }

        @if (areaPath(); as path) {
          <path [attr.d]="path" fill="url(#revenue-fill)" />
        }
        @if (linePath(); as path) {
          <path
            [attr.d]="path"
            class="chart__line"
            fill="none"
            stroke="var(--accent)"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        }

        @for (point of plotted(); track point.date) {
          <circle
            class="chart__dot"
            [class.chart__dot--active]="hovered() === point.index"
            [attr.cx]="point.x"
            [attr.cy]="point.y"
            r="3.5"
          />
          <!-- Invisible full-height column: gives each day a comfortable hover target. -->
          <rect
            class="chart__hit"
            [attr.x]="point.x - columnWidth() / 2"
            [attr.y]="0"
            [attr.width]="columnWidth()"
            [attr.height]="height"
            (pointerenter)="hovered.set(point.index)"
          />
          <text class="chart__label" [attr.x]="point.x" [attr.y]="height - 6" text-anchor="middle">
            {{ point.date | date: 'EEE' }}
          </text>
        }
      </svg>

      @if (activePoint(); as point) {
        <div class="chart__tooltip" [style.left.%]="(point.x / width) * 100">
          <span class="chart__tooltip-date">{{ point.date | date: 'MMM d' }}</span>
          <span class="chart__tooltip-value numeric">{{ point.amount | currency: 'USD' }}</span>
        </div>
      }
    </div>

    <div class="chart__foot subtle">
      <span>Peak {{ peak() | currency: 'USD' }}</span>
      <span>Total {{ total() | currency: 'USD' }}</span>
    </div>
  `,
  styles: `
    .chart { position: relative; }
    .chart__svg { display: block; width: 100%; height: 190px; overflow: visible; }
    .chart__grid { stroke: var(--border); stroke-width: 1; stroke-dasharray: 3 4; }
    .chart__dot { fill: var(--surface-card); stroke: var(--accent); stroke-width: 2; transition: r var(--transition); }
    .chart__dot--active { r: 5; fill: var(--accent); }
    .chart__hit { fill: transparent; cursor: crosshair; }
    .chart__label { fill: var(--text-subtle); font-size: 11px; font-family: var(--font); }

    .chart__tooltip {
      position: absolute;
      top: -6px;
      display: flex;
      flex-direction: column;
      padding: 5px 9px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-card);
      box-shadow: var(--shadow);
      transform: translate(-50%, -100%);
      pointer-events: none;
      white-space: nowrap;
      animation: fade-in 100ms ease-out;
    }

    .chart__tooltip-date { font-size: 11px; color: var(--text-subtle); }
    .chart__tooltip-value { font-size: 13px; font-weight: 600; }

    .chart__foot {
      display: flex;
      justify-content: space-between;
      margin-top: var(--space-3);
      padding-top: var(--space-3);
      border-top: 1px solid var(--border);
    }
  `,
})
export class RevenueChart {
  readonly points = input.required<RevenuePoint[]>();

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly hovered = signal<number | null>(null);

  protected readonly peak = computed(() => Math.max(0, ...this.points().map((point) => point.amount)));
  protected readonly total = computed(() => this.points().reduce((sum, point) => sum + point.amount, 0));

  protected readonly columnWidth = computed(() => {
    const count = this.points().length;
    return count > 1 ? (WIDTH - PADDING.left - PADDING.right) / (count - 1) : WIDTH;
  });

  protected readonly plotted = computed<PlottedPoint[]>(() => {
    const points = this.points();
    if (points.length === 0) {
      return [];
    }
    const plotWidth = WIDTH - PADDING.left - PADDING.right;
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
    // A flat series should sit on the baseline rather than divide by zero.
    const max = this.peak() || 1;

    return points.map((point, index) => ({
      ...point,
      index,
      x: PADDING.left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth),
      y: PADDING.top + plotHeight - (point.amount / max) * plotHeight,
    }));
  });

  protected readonly linePath = computed(() => {
    const plotted = this.plotted();
    return plotted.length === 0
      ? null
      : plotted.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
  });

  protected readonly areaPath = computed(() => {
    const line = this.linePath();
    const plotted = this.plotted();
    if (!line || plotted.length === 0) {
      return null;
    }
    const baseline = HEIGHT - PADDING.bottom;
    return `${line} L${plotted[plotted.length - 1].x} ${baseline} L${plotted[0].x} ${baseline} Z`;
  });

  protected readonly gridLines = computed(() => {
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
    return Array.from({ length: GRID_LINES }, (_, index) => PADDING.top + (plotHeight / (GRID_LINES - 1)) * index);
  });

  protected readonly activePoint = computed(() => {
    const index = this.hovered();
    return index === null ? null : (this.plotted()[index] ?? null);
  });
}
