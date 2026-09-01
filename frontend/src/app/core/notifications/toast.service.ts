import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const DISMISS_AFTER_MS = 5000;

/** App-wide transient messages, held in a signal so the container renders without subscriptions. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly items = signal<Toast[]>([]);
  private nextId = 1;

  readonly toasts = this.items.asReadonly();

  success(message: string): void {
    this.push('success', message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  info(message: string): void {
    this.push('info', message);
  }

  dismiss(id: number): void {
    this.items.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private push(kind: ToastKind, message: string): void {
    const id = this.nextId++;
    this.items.update((toasts) => [...toasts, { id, kind, message }]);
    setTimeout(() => this.dismiss(id), DISMISS_AFTER_MS);
  }
}
