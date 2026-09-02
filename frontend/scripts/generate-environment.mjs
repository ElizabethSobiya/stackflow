#!/usr/bin/env node
/**
 * Bakes the API base URL into the production environment file at build time.
 *
 * Angular compiles to static files, so there is no server left to read an environment variable at
 * runtime. Hosts like Vercel, Netlify and Render expose variables to the *build*, which is where
 * this runs: set `API_BASE_URL` in the host's dashboard and the deployed bundle points at the right
 * API without anyone editing a committed file.
 *
 * With `API_BASE_URL` unset the committed default (`/api`, same-origin) is kept, which is what the
 * bundled nginx image and `docker compose --profile full` rely on.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const target = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'environments', 'environment.ts');
const raw = process.env.API_BASE_URL?.trim();

if (!raw) {
  console.log('[environment] API_BASE_URL not set — keeping the committed default (/api, same-origin)');
  process.exit(0);
}

// Trailing slashes would produce "//products" once a path is appended.
const apiBaseUrl = raw.replace(/\/+$/, '');

if (!/^https?:\/\//.test(apiBaseUrl) && !apiBaseUrl.startsWith('/')) {
  console.error(`[environment] API_BASE_URL must be absolute or root-relative, got "${raw}"`);
  process.exit(1);
}

if (!apiBaseUrl.endsWith('/api')) {
  console.warn(`[environment] warning: API_BASE_URL "${apiBaseUrl}" does not end with /api — every route is served under /api`);
}

writeFileSync(
  target,
  `// Generated at build time by scripts/generate-environment.mjs — do not edit by hand.
export const environment = {
  production: true,
  apiBaseUrl: '${apiBaseUrl}',
} as const;
`,
);

console.log(`[environment] production apiBaseUrl set to ${apiBaseUrl}`);
