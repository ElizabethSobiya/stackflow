import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, IconName } from './icon';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="empty">
      <span class="empty__icon"><app-icon [name]="icon()" [size]="20" /></span>
      <p class="empty__title">{{ title() }}</p>
      @if (hint()) {
        <p class="subtle empty__hint">{{ hint() }}</p>
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

    .empty__icon {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      margin-bottom: var(--space-1);
      border-radius: var(--radius);
      background: var(--surface-sunken);
      color: var(--text-subtle);
    }

    .empty__title { font-weight: 600; }
    .empty__hint { max-width: 380px; }
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly hint = input<string>();
  readonly icon = input<IconName>('inbox');
}
