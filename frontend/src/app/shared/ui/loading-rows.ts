import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Skeleton placeholder that keeps a table's height stable while a page loads. */
@Component({
  selector: 'app-loading-rows',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rows">
      @for (row of placeholders(); track row) {
        <div class="skeleton rows__row"></div>
      }
    </div>
  `,
  styles: `
    .rows { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-4); }
    .rows__row { height: 34px; }
  `,
})
export class LoadingRows {
  readonly count = input(5);
  protected placeholders(): number[] {
    return Array.from({ length: this.count() }, (_, index) => index);
  }
}
