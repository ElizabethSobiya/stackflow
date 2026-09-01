import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toasts" role="status" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast--{{ toast.kind }}">
          <span>{{ toast.message }}</span>
          <button type="button" class="toast__close" (click)="toastService.dismiss(toast.id)" aria-label="Dismiss">
            ×
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      right: var(--space-5);
      bottom: var(--space-5);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      z-index: 50;
      max-width: min(380px, calc(100vw - 32px));
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--surface-card);
      box-shadow: var(--shadow);
      font-size: 13.5px;
      animation: toast-in 160ms ease-out;
    }

    .toast--success { border-left: 3px solid var(--success); }
    .toast--error { border-left: 3px solid var(--danger); }
    .toast--info { border-left: 3px solid var(--brand); }

    .toast__close {
      border: none;
      background: none;
      color: var(--text-subtle);
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      padding: 0;
    }

    @keyframes toast-in {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: none; }
    }
  `,
})
export class ToastContainer {
  protected readonly toastService = inject(ToastService);
}
