import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { OrderStatus } from '../../core/models/api.models';

const TONE: Record<OrderStatus, string> = {
  PENDING: 'badge--warning',
  CONFIRMED: 'badge--brand',
  SHIPPED: 'badge--info',
  DELIVERED: 'badge--success',
  CANCELLED: 'badge--danger',
};

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge {{ tone() }}">{{ status() }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<OrderStatus>();
  protected readonly tone = computed(() => TONE[this.status()]);
}
