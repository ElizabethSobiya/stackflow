import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialog } from './core/dialog/confirm-dialog';
import { ToastContainer } from './core/notifications/toast-container';

/** Root component: routed content plus the global overlays. */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ToastContainer, ConfirmDialog],
  template: `
    <router-outlet />
    <app-toast-container />
    <app-confirm-dialog />
  `,
})
export class App {}
