import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PageResponse } from '../../core/models/api.models';
import { Icon } from './icon';

/** Pager for server-side pagination; emits page indexes and never slices data itself. */
@Component({
  selector: 'app-paginator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (page(); as data) {
      <div class="paginator">
        <span class="subtle numeric">
          Showing {{ rangeStart() }}–{{ rangeEnd() }} of {{ data.totalElements }}
        </span>
        <span class="spacer"></span>
        <button
          type="button"
          class="btn btn--sm btn--icon"
          aria-label="Previous page"
          [disabled]="data.first"
          (click)="pageChange.emit(data.page - 1)"
        >
          <app-icon name="chevronLeft" [size]="14" />
        </button>
        <span class="subtle numeric paginator__pages">{{ data.page + 1 }} / {{ data.totalPages || 1 }}</span>
        <button
          type="button"
          class="btn btn--sm btn--icon"
          aria-label="Next page"
          [disabled]="data.last"
          (click)="pageChange.emit(data.page + 1)"
        >
          <app-icon name="chevronRight" [size]="14" />
        </button>
      </div>
    }
  `,
  styles: `
    .paginator {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 10px var(--space-4);
      border-top: 1px solid var(--border);
      background: var(--surface-inset);
      flex-wrap: wrap;
    }

    .paginator__pages { min-width: 52px; text-align: center; }
  `,
})
export class Paginator {
  readonly page = input.required<PageResponse<unknown> | null>();
  readonly pageChange = output<number>();

  protected readonly rangeStart = computed(() => {
    const data = this.page();
    return data && data.totalElements > 0 ? data.page * data.size + 1 : 0;
  });

  protected readonly rangeEnd = computed(() => {
    const data = this.page();
    return data ? data.page * data.size + data.content.length : 0;
  });
}
