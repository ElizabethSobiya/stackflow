import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { OrderStatus } from '../../core/models/api.models';

const TONE: Record<OrderStatus, string> = {
  PENDING: 'badge--warning',
  CONFIRMED: 'badge--accent',
  SHIPPED: 'badge--info',
  DELIVERED: 'badge--success',
  CANCELLED: 'badge--danger',
};

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge {{ tone() }}">
      <span class="badge__dot"></span>
      {{ label() }}
    </span>
  `,
})
export class StatusBadge {
  readonly status = input.required<OrderStatus>();

  protected readonly tone = computed(() => TONE[this.status()]);
  protected readonly label = computed(() => this.status().toLowerCase());
}
