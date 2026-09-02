import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon, IconName } from '../../shared/ui/icon';
import { Toast, ToastService } from './toast.service';

const ICON: Record<Toast['kind'], IconName> = {
  success: 'check',
  error: 'warning',
  info: 'info',
};

@Component({
  selector: 'app-toast-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="toasts" role="status" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast--{{ toast.kind }}">
          <span class="toast__icon"><app-icon [name]="icon(toast)" [size]="15" /></span>
          <span class="toast__message">{{ toast.message }}</span>
          <button
            type="button"
            class="toast__close"
            aria-label="Dismiss notification"
            (click)="toastService.dismiss(toast.id)"
          >
            <app-icon name="close" [size]="13" />
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
      z-index: 50;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      max-width: min(390px, calc(100vw - 32px));
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 11px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface-card);
      box-shadow: var(--shadow);
      font-size: 13.5px;
      pointer-events: auto;
      animation: toast-in 180ms cubic-bezier(0.2, 0, 0.2, 1);
    }

    .toast__icon {
      display: grid;
      place-items: center;
      width: 20px;
      height: 20px;
      flex: none;
      border-radius: 50%;
      margin-top: 1px;
    }

    .toast--success .toast__icon { background: var(--success-soft); color: var(--success); }
    .toast--error .toast__icon { background: var(--danger-soft); color: var(--danger); }
    .toast--info .toast__icon { background: var(--accent-soft); color: var(--accent); }

    .toast__message { flex: 1; min-width: 0; }

    .toast__close {
      display: grid;
      place-items: center;
      flex: none;
      padding: 2px;
      border: none;
      border-radius: 4px;
      background: none;
      color: var(--text-subtle);
      cursor: pointer;
      transition: background var(--transition), color var(--transition);
    }

    .toast__close:hover { background: var(--surface-hover); color: var(--text); }

    @keyframes toast-in {
      from { opacity: 0; transform: translateY(8px) scale(0.98); }
      to { opacity: 1; transform: none; }
    }
  `,
})
export class ToastContainer {
  protected readonly toastService = inject(ToastService);

  protected icon(toast: Toast): IconName {
    return ICON[toast.kind];
  }
}
