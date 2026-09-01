import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainer } from './core/notifications/toast-container';

/** Root component: routed content plus the global toast outlet. */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ToastContainer],
  template: `
    <router-outlet />
    <app-toast-container />
  `,
})
export class App {}
