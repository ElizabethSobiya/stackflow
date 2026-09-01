/**
 * Production configuration. The build swaps this file in via `fileReplacements` in angular.json —
 * nothing in the app reads `process.env`, so a wrong value can never reach the browser silently.
 */
export const environment = {
  production: true,
  apiBaseUrl: '/api',
} as const;
