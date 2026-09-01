# Architecture

How the system is put together, and why it is put together that way. The organising principle
throughout: **code that changes together lives together, and everything that crosses a boundary
crosses it through an interface.**

---

## 1. Shape of the system

```
┌──────────────────────────┐        JSON over HTTPS        ┌───────────────────────────┐
│  Angular SPA (:4200)     │  ───────────────────────────▶ │  Spring Boot API (:8080)  │
│                          │  Bearer <access token>        │                           │
│  core/    auth, http     │ ◀───────────────────────────  │  security → feature       │
│  shared/  list engine    │        ApiError / PageResponse│  services → repositories  │
│  features/ lazy routes   │                               │                           │
└──────────────────────────┘                               └─────────────┬─────────────┘
                                                                         │ JPA / Flyway
                                                                ┌────────▼────────┐
                                                                │   PostgreSQL    │
                                                                └─────────────────┘
```

---

## 2. Backend: package-by-feature

```
com.stackflow.inventory
├── common/       shared kernel — BaseEntity, ApiError, exception hierarchy, retry + spec helpers
├── security/     JWT issuing/parsing, authentication filter, SecurityConfig, UserPrincipal
├── user/         accounts and roles
├── auth/         registration, login, refresh-token rotation
├── catalog/      products
├── stock/        stock levels and the movement audit trail
├── order/        the order aggregate, its state machine, and read-only metrics
├── dashboard/    a read model composed from other features
└── bootstrap/    dev-only data seeding
```

Each feature contains its own `domain / repository / service / web / dto`. The alternative — one
`controller/`, one `service/`, one `entity/` package — spreads a single change across four
directories and makes it impossible to see, from the tree alone, what the system does.

### Allowed dependencies

```
        dashboard ──▶ order.OrderMetrics
             │  └───▶ stock.StockService
             │  └───▶ catalog.ProductService
             ▼
   order ──▶ stock.StockService        (interface)
     └────▶ catalog.ProductService     (interface)

   catalog ──▶ stock.StockService      (interface — a product creates its stock row)
   stock ──▶ catalog.domain.Product    (read-only association)

   every feature ──▶ common, security
```

Two rules keep this honest:

1. **Cross-feature calls go through an interface**, never a repository or an `*Impl`. `OrderService`
   knows `StockService.deductForOrder(orderId, lines)` exists; it has never heard of `StockItem`.
2. **No cycles between features.** `catalog → stock` (for initialisation) and `stock → catalog.domain`
   (for the product association) is the one deliberate pairing, and it is one-directional at the
   service level, so Spring never sees a bean cycle.

The payoff is concrete: moving `stock` behind a network call means writing one new `StockService`
implementation. No caller changes.

### Layering inside a feature

| Layer | Responsibility | Never does |
| --- | --- | --- |
| `web` | HTTP shape, validation annotations, authorisation (`@PreAuthorize`) | business rules |
| `service` | orchestration, transactions, cross-feature calls | build HTTP responses |
| `domain` | invariants and state transitions | know about HTTP or Spring |
| `repository` | queries | contain rules |

Domain objects protect their own invariants: `StockItem.decrease()` refuses to go negative,
`Order.transitionTo()` refuses an illegal status change, `Order.addLine()` refuses to modify a
non-pending order. Those rules hold no matter which service calls them — which is exactly why they are
unit-testable without Spring, a database or mocks.

### Error handling

Every deliberate failure extends `ApplicationException`, which carries its own HTTP status and a
stable machine-readable code:

| Exception | Status | Code |
| --- | --- | --- |
| `ResourceNotFoundException` | 404 | `RESOURCE_NOT_FOUND` |
| `ConflictException` | 409 | `RESOURCE_CONFLICT` |
| `BusinessRuleException` | 422 | `BUSINESS_RULE_VIOLATION` |
| `InsufficientStockException` | 422 | `INSUFFICIENT_STOCK` |
| `InvalidStatusTransitionException` | 422 | `INVALID_STATUS_TRANSITION` |
| `AuthenticationFailedException` | 401 | `AUTHENTICATION_FAILED` |
| optimistic-lock failure | 409 | `CONCURRENT_MODIFICATION` |

`GlobalExceptionHandler` is the only place that turns an exception into a response, so a new failure
mode is one subclass, not another `catch` block in a controller. Clients branch on `code`; `message`
is for humans and may be reworded at any time.

---

## 3. Concurrency: the stock problem

Two orders confirm the same product at the same instant. Both read `quantity = 5`, both subtract 3,
both write `2`. One deduction has vanished and the shelf disagrees with the database.

`StockItem` carries a `@Version` column, so the second write fails loudly instead of silently
overwriting. On top of that:

- **`OptimisticRetry`** re-runs the unit of work — up to `stackflow.stock.optimistic-lock-retries`
  attempts — with exponential backoff and full jitter. A race the user cannot see should not become
  an error the user has to read.
- **Retry belongs to whoever owns the transaction.** `OrderServiceImpl.changeStatus` is declared
  `@Transactional(propagation = NOT_SUPPORTED)` and opens a fresh transaction per attempt through a
  `TransactionTemplate`. `StockService.deductForOrder` deliberately does *not* retry: it joins the
  caller's transaction, and a transaction that has lost a version race is already doomed — retrying
  inside it would only fail again at commit.
- **Atomicity is preserved.** Status change and stock movement commit together or not at all.

Measured behaviour (10 concurrent `-1` adjustments on one row) is in
[ENGINEERING-NOTES.md](./ENGINEERING-NOTES.md).

---

## 4. Security model

- **Access token**: HS256 JWT, 15 minutes, carries `uid`, `sub` (email) and `role`. Requests are
  authenticated from the token alone — no database hit on the hot path.
- **Refresh token**: 256 bits of `SecureRandom`, returned to the client but stored only as a SHA-256
  hash. Rotated on every use; reusing a consumed token revokes every session for that user, which is
  the standard signal of a stolen token.
- **Authorisation** lives next to the code it protects (`@PreAuthorize` on controller methods), not in
  a URL pattern list that quietly stops matching when an endpoint is renamed. `SecurityConfig` only
  distinguishes public from authenticated.
- **Passwords**: BCrypt. Login answers identically for an unknown email and a wrong password.
- **CORS**: exact origins only, from configuration.
- The frontend's `roleGuard` is a UX affordance. Bypassing it in the browser earns a 403 from the
  server, because the server checks independently.

**Known trade-off:** tokens live in `localStorage`, which is readable by any script on the origin. The
stronger design is an httpOnly, SameSite cookie for the refresh token, which needs a cookie-issuing
endpoint and CSRF protection on the API. Every storage access is confined to `TokenStorage`, so that
change touches one file.

---

## 5. Frontend

Angular 21, standalone components, **zoneless** change detection. State is held in signals, which is
what makes zoneless safe: nothing depends on a monkey-patched `setTimeout` to notice a change.

```
core/     ApiClient (base URL + param serialisation), AuthService (session signals, single-flight
          refresh), TokenStorage, guards, interceptors, typed API models, toasts
shared/   createPagedQuery — the list-screen engine — plus presentational components
layout/   the authenticated shell
features/ auth · dashboard · products · stock · orders, every one lazy-loaded
```

**`createPagedQuery` is the piece that pays for itself.** Products, orders and stock are all "filter,
page, sort, show loading/empty/error" screens. Writing that three times means three subtly different
debounce bugs. Instead, one function composes filter and page signals into a stream, applies
`debounceTime` and `switchMap` (so a fast typist cancels their own in-flight request rather than
racing it), and exposes `items / loading / error / isEmpty` back as signals. A new list screen is a
fetcher function and a template.

**Interceptors, in order:**

1. `authInterceptor` — attaches the bearer token; on a 401 it refreshes **once**, replays the original
   request, and only signs the user out if the refresh itself fails. `AuthService.refresh()` is
   single-flight, so a burst of simultaneous 401s produces one refresh call, not one per request.
2. `errorInterceptor` — turns any remaining failure into one toast, then re-throws so the component
   can still render its own state. 400/401/422 are left silent because the screen shows them inline.

**No component library.** Angular Material or PrimeNG would add a large dependency for tables and
buttons this app can express in ~300 lines of tokenised CSS, and every table here is bespoke anyway
(server-side paging, status-driven actions). The design system in `styles.scss` is all custom
properties, so dark mode is a second block of variables rather than a second stylesheet. The revenue
chart is CSS bars for the same reason: a charting library would have cost more than the chart.

---

## 6. Data model

```
users ──< refresh_tokens
  │
  ├──< orders ──< order_items >── products ──1:1── stock_items ──< stock_movements
  │        └──< order_status_history
  └──< (created_by on orders, stock_movements, order_status_history)
```

Points worth defending in review:

- **`order_items` snapshots `product_name`, `sku` and `unit_price`.** The foreign key preserves
  traceability; the snapshot preserves history. Re-pricing a product must never silently rewrite what
  a customer was charged last month.
- **`order_status_history` and `stock_movements` are append-only.** A `status` column answers "where
  is it now"; these answer "how did it get here, when, and on whose authority" — the question that
  actually gets asked when something is disputed.
- **Soft delete on products.** Hard-deleting would orphan historical order lines.
- **Indexes are deliberate, not decorative:**
  - `orders (status, created_at DESC)` — the order list is almost always "status X, newest first", so
    one composite index serves both the filter and the sort and Postgres never sorts the table.
  - `stock_items ((quantity - low_stock_threshold))` — an expression index, because the low-stock
    report compares two columns and no single-column index can serve that.
  - `order_items (order_id)`, `stock_movements (stock_item_id, created_at DESC)` — the foreign-key
    lookups that back the detail screens.
- **Schema changes go through Flyway**, and Hibernate runs with `ddl-auto: validate`, so a mismatch
  between entity and schema fails at startup instead of at 3am.

---

## 7. Query-count discipline

N+1 queries are the default failure mode of a JPA application, so each list path states how it avoids
one:

| Path | Approach |
| --- | --- |
| Product list + stock levels | one `findAllByProductIdIn` for the whole page, not one per row |
| Order list + unit counts | one grouped `countUnitsByOrderIds` for the whole page |
| Order detail | `@EntityGraph(items, items.product)` — one round-trip |
| Low-stock report | `join fetch s.product` |

`spring.jpa.open-in-view` is **off**. Lazy loading stops at the service boundary, so a forgotten fetch
fails in a test rather than quietly issuing queries while the view renders.

---

## 8. Where this would go next

Honest limits of the current build, roughly in the order they would start to hurt:

1. **No caching.** Dashboard metrics recompute per request. First candidate for a short-TTL cache.
2. **Refresh tokens accumulate.** `RefreshTokenService.purgeExpired()` exists but nothing schedules
   it; it wants a `@Scheduled` job, or a partial index plus a nightly cleanup.
3. **Dashboard revenue is bucketed in Java.** Correct and portable for a 7-day window; a longer
   window wants a grouped SQL query.
4. **No rate limiting on `/api/auth/login`** — the obvious brute-force surface.
5. **Testcontainers over H2.** The integration test runs against H2 in Postgres mode; Testcontainers
   would exercise the real Flyway migrations and real Postgres semantics.
6. **Observability.** Actuator and structured logs are wired up; traces and per-endpoint metrics are
   not.
