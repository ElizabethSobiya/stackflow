import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive and gives it a slower, deliberate focus. */
  danger?: boolean;
}

interface PendingConfirm extends ConfirmRequest {
  resolve: (confirmed: boolean) => void;
}

/**
 * Replaces `window.confirm`.
 *
 * <p>The native dialog cannot be styled, blocks the main thread, looks like a browser warning
 * rather than part of the product, and is suppressed outright by some browsers. This keeps the same
 * one-line call site — `await confirm.ask({...})` — while rendering in the app's own design.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly pending = signal<PendingConfirm | null>(null);

  readonly request = this.pending.asReadonly();

  ask(request: ConfirmRequest): Promise<boolean> {
    return new Promise((resolve) => {
      this.pending.set({ ...request, resolve });
    });
  }

  respond(confirmed: boolean): void {
    const current = this.pending();
    if (current) {
      this.pending.set(null);
      current.resolve(confirmed);
    }
  }
}
