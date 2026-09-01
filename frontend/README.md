# StackFlow Web

Angular frontend for the StackFlow inventory and order management system.

```bash
npm install
npm start        # dev server on http://localhost:4200 (expects the API on :8080)
npm run build    # production bundle into dist/inventory-web
npm run test:ci  # unit tests, single run
```

Setup, architecture and API reference live in the [repository README](../README.md) and
[docs/](../docs).

Configuration lives in `src/environments/` — `environment.development.ts` points at
`http://localhost:8080/api`; the production file uses a same-origin `/api`, which the bundled nginx
config expects to be proxied.
