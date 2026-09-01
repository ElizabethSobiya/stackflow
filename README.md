# StackFlow — Inventory & Order Management

A full-stack inventory and order management system: **Angular 21** (standalone, signals, zoneless) on
**Spring Boot 3.5 / Java 17**, with **PostgreSQL**, JWT auth, a server-enforced order state machine and
optimistic locking on stock.

Built from [`Inventory_management_guide.md`](./Inventory_management_guide.md).

---

## What it does

| Area | Capability |
| --- | --- |
| **Auth** | Register / login, short-lived JWT access tokens, rotating database-backed refresh tokens, role-based access (ADMIN / STAFF) enforced server-side |
| **Catalog** | Product CRUD, server-side pagination, search across name/SKU/description, category and price filters, soft delete |
| **Stock** | Per-product levels with low-stock thresholds, signed adjustments with a mandatory reason, full movement audit trail, optimistic locking with retry |
| **Orders** | Order builder, `PENDING → CONFIRMED → SHIPPED → DELIVERED` (plus `CANCELLED`) with server-validated transitions, stock committed on confirmation and released on cancellation, complete status history |
| **Dashboard** | Order counts by status, 7-day revenue series, low-stock count, units on hand, recent orders |

---

## Quick start

**Prerequisites:** Java 17+, Node 20.19+/22.12+, Docker (for Postgres).

```bash
# 1. database
docker compose up -d postgres          # if 5432 is taken, see "Port already in use" below

# 2. API on :8080 — applies migrations and seeds demo data on an empty database
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# 3. UI on :4200
cd frontend && npm install && npm start
```

Open <http://localhost:4200> and sign in:

| Account | Password | Role |
| --- | --- | --- |
| `admin@stackflow.dev` | `Password123!` | ADMIN |
| `staff@stackflow.dev` | `Password123!` | STAFF |

> On a database with no users at all, **the first account to register becomes the ADMIN**. Everyone
> who registers afterwards is STAFF, and promotion is an admin action.

Interactive API docs: <http://localhost:8080/swagger-ui.html>

Or use `make`: `make db-up`, `make api`, `make web`, `make test`.

### Port already in use

If something already listens on 5432 (a native Postgres install, typically), start the container on
another port and point the API at it:

```bash
STACKFLOW_DB_PORT=55432 docker compose up -d postgres
DB_URL=jdbc:postgresql://localhost:55432/stackflow ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

---

## Tests

```bash
cd backend  && ./mvnw test      # 59 tests — domain, services, JWT, retry, plus a full HTTP-level workflow test
cd frontend && npm run test:ci  # 14 tests — auth session, token-refresh interceptor, list-query engine
```

The backend suite includes an integration test that drives the real HTTP stack, security filters and
an in-memory database end to end: register → catalogue a product → place an order → confirm it →
assert the stock moved → cancel it → assert the stock came back.

---

## Project layout

```
stackflow/
├── backend/                     Spring Boot API (package-by-feature)
│   └── src/main/java/com/stackflow/inventory/
│       ├── common/              shared kernel: BaseEntity, ApiError, exceptions, retry helper
│       ├── security/            JWT issuing/parsing, filter, SecurityConfig, principal
│       ├── user/  auth/         accounts, registration, login, refresh-token rotation
│       ├── catalog/             products
│       ├── stock/               stock levels + movement audit trail
│       ├── order/               order aggregate, state machine, metrics
│       └── dashboard/           read-model composed from other features' interfaces
├── frontend/                    Angular application
│   └── src/app/
│       ├── core/                API client, auth, guards, interceptors, models, toasts
│       ├── shared/              paged-query engine + reusable UI (badge, paginator, empty state…)
│       ├── layout/              authenticated shell
│       └── features/            auth, dashboard, products, stock, orders (all lazy-loaded)
├── docs/                        architecture, API reference, engineering notes
├── docker-compose.yml           Postgres, plus a `full` profile that runs the whole stack
└── Makefile
```

Full reasoning behind the structure: **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)**.
Endpoint reference: **[docs/API.md](./docs/API.md)**.
Bugs found, trade-offs and measurements: **[docs/ENGINEERING-NOTES.md](./docs/ENGINEERING-NOTES.md)**.

---

## Design decisions worth knowing

**Package-by-feature, not package-by-layer.** Everything an order does — entity, repository, service,
controller, DTOs — lives under `order/`. Features talk to each other only through narrow service
interfaces (`StockService`, `ProductService`, `OrderMetrics`), so extracting one into its own
deployable later is a mechanical move rather than a rewrite. The guide's original layer-first sketch
groups files by what they *are*; this groups them by what they *do*, which is what changes together.

**The state machine lives in the domain.** `OrderStatus.allowedTransitions()` is the single source of
truth. The API even returns each order's legal next states so the UI can render its buttons from the
server's rules instead of duplicating them — and a client that asks for `DELIVERED → PENDING` anyway
gets a 422.

**Stock is committed at confirmation, not at creation.** A pending order never blocks inventory;
cancelling a confirmed order puts the units back. Both directions run in the same transaction as the
status change, so an order can never be confirmed with its units still on the shelf.

**Optimistic locking with bounded retry.** `StockItem` carries a `@Version` column. Ten concurrent
adjustments against the same row produce ten correct movements, not a lost update — see the measured
run in the engineering notes.

**Two-token auth.** Access tokens are stateless JWTs, deliberately short-lived because they cannot be
revoked. Refresh tokens are opaque, stored only as SHA-256 hashes, rotated on every use, and a
replayed token revokes the whole family.

**Everything is paginated server-side.** There is no "fetch all and slice in the browser" path
anywhere in the codebase.

---

## Deploying

```bash
docker compose --profile full up --build     # UI on :8081, API on :8080, Postgres on :5432
```

runs all three together: Postgres, the API (multi-stage JDK→JRE image) and the UI (nginx serving the
production bundle). The UI container proxies its same-origin `/api` calls to the API container via
`API_UPSTREAM`, so the browser only ever talks to one origin — no CORS in that topology.

Required in any real environment:

| Variable | Purpose |
| --- | --- |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Database connection |
| `JWT_SECRET` | HMAC signing key, **at least 32 bytes**; the app refuses to start with a shorter one |
| `CORS_ALLOWED_ORIGINS` | Exact frontend origin(s) — wildcards are not accepted |
| `SPRING_PROFILES_ACTIVE=prod` | Disables seeding and verbose logging |

Suggested hosts: Render or Railway for the API and its Postgres, Vercel or Netlify for the frontend.
The production frontend build calls a same-origin `/api`, so either deploy it behind the bundled nginx
(which proxies) or add a rewrite at the host and set `CORS_ALLOWED_ORIGINS` accordingly.
