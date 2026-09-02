import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon } from '../../shared/ui/icon';
import { ConfirmService } from './confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (confirmService.request(); as request) {
      <div class="overlay" (click)="confirmService.respond(false)">
        <div
          class="dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          (click)="$event.stopPropagation()"
          (keydown.escape)="confirmService.respond(false)"
        >
          <div class="dialog__icon" [class.dialog__icon--danger]="request.danger">
            <app-icon [name]="request.danger ? 'warning' : 'info'" [size]="18" />
          </div>

          <h2 id="confirm-title" class="dialog__title">{{ request.title }}</h2>
          <p class="dialog__message">{{ request.message }}</p>

          <div class="dialog__actions">
            <button type="button" class="btn" (click)="confirmService.respond(false)">
              {{ request.cancelLabel ?? 'Cancel' }}
            </button>
            <button
              type="button"
              class="btn"
              [class.btn--danger]="request.danger"
              [class.btn--primary]="!request.danger"
              autofocus
              (click)="confirmService.respond(true)"
            >
              {{ request.confirmLabel ?? 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 60;
      display: grid;
      place-items: center;
      padding: var(--space-4);
      background: rgb(12 16 22 / 45%);
      backdrop-filter: blur(2px);
      animation: fade-in 120ms ease-out;
    }

    .dialog {
      width: min(420px, 100%);
      padding: var(--space-5);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface-card);
      box-shadow: var(--shadow-lg);
      animation: dialog-in 160ms cubic-bezier(0.2, 0, 0.2, 1);
    }

    .dialog__icon {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      margin-bottom: var(--space-4);
      border-radius: var(--radius-sm);
      background: var(--accent-soft);
      color: var(--accent);
    }

    .dialog__icon--danger { background: var(--danger-soft); color: var(--danger); }
    .dialog__title { margin-bottom: 6px; font-size: 16px; }
    .dialog__message { color: var(--text-muted); font-size: 13.5px; }

    .dialog__actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-2);
      margin-top: var(--space-5);
    }

    @keyframes dialog-in {
      from { opacity: 0; transform: translateY(8px) scale(0.98); }
      to { opacity: 1; transform: none; }
    }
  `,
})
export class ConfirmDialog {
  protected readonly confirmService = inject(ConfirmService);
}
