# API Reference

Base URL `http://localhost:8080/api` · interactive docs at `/swagger-ui.html` · OpenAPI JSON at
`/v3/api-docs`.

All requests and responses are JSON. Every endpoint except register, login and refresh requires
`Authorization: Bearer <access token>`.

---

## Conventions

**Paginated responses** — every list endpoint returns this shape:

```json
{
  "content": [],
  "page": 0,
  "size": 20,
  "totalElements": 42,
  "totalPages": 3,
  "first": true,
  "last": false
}
```

Query parameters: `page` (0-based), `size`, `sort=field,asc|desc`.

**Errors** — every failure returns this shape. Branch on `code`; `message` is for humans.

```json
{
  "timestamp": "2026-09-01T16:33:19.178Z",
  "status": 422,
  "code": "INSUFFICIENT_STOCK",
  "message": "Insufficient stock for ELEC-LAP-001: requested 5, available 2",
  "path": "/api/orders/7/status",
  "fieldErrors": [{ "field": "sku", "message": "SKU may contain letters, digits, dot, dash and underscore only" }]
}
```

| Code | Status | Meaning |
| --- | --- | --- |
| `VALIDATION_FAILED` | 400 | Request body failed validation; see `fieldErrors` |
| `AUTHENTICATION_FAILED` | 401 | Missing, expired or invalid credentials |
| `ACCESS_DENIED` | 403 | Authenticated, but the role is not permitted |
| `RESOURCE_NOT_FOUND` | 404 | No such entity |
| `RESOURCE_CONFLICT` | 409 | Duplicate SKU or email |
| `CONCURRENT_MODIFICATION` | 409 | Lost an optimistic-locking race; safe to retry |
| `BUSINESS_RULE_VIOLATION` | 422 | Valid request the domain refuses |
| `INSUFFICIENT_STOCK` | 422 | Not enough units to confirm the order |
| `INVALID_STATUS_TRANSITION` | 422 | The state machine does not allow that move |
| `INTERNAL_ERROR` | 500 | Unexpected failure (details are logged, never returned) |

---

## Authentication

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | — | Create an account. **The first account on an empty database becomes ADMIN**; later ones are STAFF. |
| POST | `/auth/login` | — | Exchange credentials for a token pair |
| POST | `/auth/refresh` | — | Rotate a refresh token for a new pair |
| POST | `/auth/logout` | any | Revoke every refresh token for the caller |
| GET | `/auth/me` | any | The current user |

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@stackflow.dev","password":"Password123!"}'
```

```json
{
  "accessToken": "eyJhbGciOiJIUzM4NCJ9...",
  "refreshToken": "K3rW9...",
  "expiresInSeconds": 900,
  "user": { "id": 1, "email": "admin@stackflow.dev", "fullName": "Ada Admin", "role": "ADMIN", "enabled": true }
}
```

Access tokens expire after 15 minutes; the client is expected to call `/auth/refresh` and replay the
request. Reusing an already-consumed refresh token revokes every session for that user.

---

## Products

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/products` | any | Search: `search`, `category`, `active`, `minPrice`, `maxPrice` + pagination |
| GET | `/products/categories` | any | Distinct categories of active products |
| GET | `/products/{id}` | any | One product with its stock level |
| POST | `/products` | ADMIN | Create (also creates the stock row) |
| PUT | `/products/{id}` | ADMIN | Update |
| DELETE | `/products/{id}` | ADMIN | Soft delete — deactivates, keeping order history intact |
| POST | `/products/{id}/activate` | ADMIN | Reactivate |

```bash
curl -X POST http://localhost:8080/api/products \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Aurora 14\" Laptop","category":"Electronics","sku":"ELEC-LAP-001",
       "price":1299.00,"initialQuantity":24,"lowStockThreshold":5}'
```

`initialQuantity` is honoured on create only — every later change goes through the stock API so that
each movement carries a reason.

---

## Stock

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/stock/low` | any | Products at or below their threshold |
| GET | `/stock/{productId}` | any | Current level |
| GET | `/stock/{productId}/movements` | any | Audit trail, newest first |
| POST | `/stock/{productId}/adjust` | ADMIN, STAFF | Signed adjustment with a reason |
| PUT | `/stock/{productId}/threshold` | ADMIN | Change the low-stock threshold |

```bash
curl -X POST http://localhost:8080/api/stock/1/adjust \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"delta":-3,"reason":"DAMAGE_WRITE_OFF","note":"water damage in transit"}'
```

`reason` is one of `INITIAL_STOCK`, `PURCHASE_RECEIVED`, `MANUAL_ADJUSTMENT`, `ORDER_CONFIRMED`,
`ORDER_CANCELLED`, `DAMAGE_WRITE_OFF`, `STOCK_COUNT_CORRECTION`.

An adjustment that would take stock below zero returns 422 `INSUFFICIENT_STOCK`. Concurrent
adjustments are retried internally; sustained contention returns 409 `CONCURRENT_MODIFICATION`.

---

## Orders

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/orders` | any | Search: `search`, `status`, `from`, `to`, `createdBy` + pagination |
| GET | `/orders/{id}` | any | Full order with items and status history |
| POST | `/orders` | ADMIN, STAFF | Create a PENDING order |
| PATCH | `/orders/{id}/status` | ADMIN | Move to the next status |

```bash
curl -X POST http://localhost:8080/api/orders \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"customerName":"Northwind Trading","customerEmail":"orders@northwind.example",
       "items":[{"productId":1,"quantity":2},{"productId":2,"quantity":1}]}'
```

### Status transitions

```
PENDING ──▶ CONFIRMED ──▶ SHIPPED ──▶ DELIVERED
   │            │
   └────────────┴──────▶ CANCELLED
```

Every order response includes `allowedTransitions`, so a client renders its actions from the server's
rules rather than reimplementing them. Anything else returns 422 `INVALID_STATUS_TRANSITION`.

Side effects:

| Transition | Effect |
| --- | --- |
| `→ CONFIRMED` | Deducts every line from stock, atomically. Fails with `INSUFFICIENT_STOCK` if any line cannot be covered — and then nothing is deducted. |
| `CONFIRMED/SHIPPED → CANCELLED` | Restores the units |
| `PENDING → CANCELLED` | No stock movement — none was ever taken |

```bash
curl -X PATCH http://localhost:8080/api/orders/7/status \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"CONFIRMED","note":"payment cleared"}'
```

---

## Dashboard

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/dashboard/summary` | any | Metrics, 7-day revenue series and recent orders in one round-trip |

```json
{
  "totalOrders": 4,
  "ordersByStatus": { "PENDING": 1, "CONFIRMED": 1, "SHIPPED": 1, "DELIVERED": 1, "CANCELLED": 0 },
  "revenueThisWeek": 5243.49,
  "lowStockCount": 2,
  "activeProducts": 6,
  "unitsOnHand": 45,
  "revenueSeries": [{ "date": "2026-08-26", "amount": 0 }],
  "recentOrders": []
}
```

Revenue counts orders in `CONFIRMED`, `SHIPPED` or `DELIVERED` — cancelled orders never count.

---

## Users (admin)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/users` | ADMIN | List accounts |
| PATCH | `/users/{id}/role` | ADMIN | Change a role |
| PATCH | `/users/{id}/enabled?value=` | ADMIN | Enable or disable an account |

---

## Operations

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/actuator/health` | — | Liveness / readiness |
| GET | `/actuator/metrics` | any | Micrometer metrics |
