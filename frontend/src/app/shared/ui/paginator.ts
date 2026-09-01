import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PageResponse } from '../../core/models/api.models';

/** Pager for server-side pagination; emits page indexes and never slices data itself. */
@Component({
  selector: 'app-paginator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (page(); as data) {
      <div class="paginator">
        <span class="subtle numeric">
          {{ rangeStart() }}–{{ rangeEnd() }} of {{ data.totalElements }}
        </span>
        <span class="spacer"></span>
        <button type="button" class="btn btn--sm" [disabled]="data.first" (click)="pageChange.emit(data.page - 1)">
          Previous
        </button>
        <span class="subtle numeric">Page {{ data.page + 1 }} of {{ data.totalPages || 1 }}</span>
        <button type="button" class="btn btn--sm" [disabled]="data.last" (click)="pageChange.emit(data.page + 1)">
          Next
        </button>
      </div>
    }
  `,
  styles: `
    .paginator {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-top: 1px solid var(--border);
      flex-wrap: wrap;
    }
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
