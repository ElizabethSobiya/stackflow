import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty">
      <p class="empty__title">{{ title() }}</p>
      @if (hint()) {
        <p class="subtle">{{ hint() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: `
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-7) var(--space-4);
      text-align: center;
    }

    .empty__title { margin: 0; font-weight: 600; }
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly hint = input<string>();
}
