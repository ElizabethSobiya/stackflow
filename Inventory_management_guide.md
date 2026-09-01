# Inventory / Order Management System — Build Guide

**Stack:** Angular 17+ (standalone components), Spring Boot 3 (Java 17+), Spring Security + JWT, PostgreSQL, RxJS, Reactive Forms

**Goal:** A real, working full-stack app you can genuinely put on your resume and speak to in an interview. Budget roughly 8–12 focused days depending on how deep you go.

---

## 1. Project Scope

Core entities: **Products**, **Stock/Inventory**, **Orders**, **Users (Admin/Staff roles)**.

Features to build, roughly in order:
1. Auth (register/login, JWT, role-based route guards)
2. Product catalog (CRUD, pagination, search/filter)
3. Stock management (increment/decrement, low-stock flag)
4. Order workflow (create order → pending → confirmed → shipped → delivered/cancelled, with status transition rules)
5. Admin dashboard (basic metrics: total orders, low-stock items, revenue this week)
6. Role-based UI (admin sees everything, staff sees limited views)

---

## 2. Day-by-Day Plan

### Day 1–2: Backend foundation
- Spring Initializr project: Spring Web, Spring Data JPA, Spring Security, PostgreSQL Driver, Validation, Lombok
- Set up `application.yml`, connect to local Postgres (Docker container recommended)
- Define entities: `User`, `Role`, `Product`, `StockItem`, `Order`, `OrderItem`, `OrderStatusHistory`
- Set up repository layer (Spring Data JPA interfaces)

### Day 3–4: Auth & security
- Implement JWT generation/validation (`JwtService`, `JwtAuthFilter`)
- `AuthController`: `/api/auth/register`, `/api/auth/login`
- Password hashing with BCrypt
- `SecurityConfig`: stateless session, role-based endpoint rules (`hasRole("ADMIN")`, `hasRole("STAFF")`)
- Test with Postman/curl before touching the frontend

### Day 5–6: Product & stock APIs
- `ProductController` + `ProductService`: CRUD, pagination (`Pageable`), search by name/category
- `StockController`: adjust stock, low-stock threshold check
- Add validation (`@Valid`, custom exceptions → `@ControllerAdvice` global error handler)
- Write a few unit tests for service layer logic (status transitions, stock deduction)

### Day 7: Order workflow
- `OrderController` + `OrderService`
- Status transition state machine: enforce valid transitions only (e.g., can't go from `DELIVERED` back to `PENDING`)
- Deduct stock on order confirmation, restore on cancellation
- `OrderStatusHistory` table to log every transition with timestamp

### Day 8–9: Angular frontend setup
- `ng new inventory-frontend --standalone --routing`
- Folder structure: `core/` (auth, interceptors, guards), `features/products`, `features/orders`, `features/dashboard`, `shared/`
- Auth: login/register forms (Reactive Forms), `AuthService` storing JWT, `authInterceptor` attaching token to requests, `authGuard` + `roleGuard` for route protection

### Day 10–11: Product & order UI
- Product list: Angular Material table or PrimeNG table, server-side pagination + filtering, hooked to RxJS `BehaviorSubject` for filter state
- Product form: reactive form with validators, create/edit modes
- Order creation flow: add products to cart-like state, submit order
- Order list: status badges, admin-only action buttons to change status

### Day 12: Dashboard + polish
- Simple dashboard: cards for total orders, low-stock count, revenue this week (use Chart.js or ngx-charts for one chart)
- Loading states, error toasts, basic responsive layout
- README with setup instructions, screenshots

---

## 3. Backend Structure (Spring Boot)

```
src/main/java/com/inventory/
├── config/
│   ├── SecurityConfig.java
│   └── JwtAuthFilter.java
├── controller/
│   ├── AuthController.java
│   ├── ProductController.java
│   ├── StockController.java
│   └── OrderController.java
├── service/
│   ├── AuthService.java
│   ├── ProductService.java
│   ├── OrderService.java
│   └── JwtService.java
├── repository/
│   ├── UserRepository.java
│   ├── ProductRepository.java
│   └── OrderRepository.java
├── entity/
│   ├── User.java
│   ├── Product.java
│   ├── StockItem.java
│   ├── Order.java
│   ├── OrderItem.java
│   └── OrderStatusHistory.java
├── dto/
│   ├── request/
│   └── response/
├── exception/
│   ├── GlobalExceptionHandler.java
│   └── custom exceptions...
└── InventoryApplication.java
```

### Key entity notes
- `Order` has a `status` enum (`PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED`) and a `@OneToMany` to `OrderItem`
- `OrderStatusHistory` gives you an audit trail — good interview talking point on schema design
- Use `@Version` on `StockItem` for optimistic locking to prevent race conditions on concurrent stock updates (this mirrors real problems you've hit before — worth doing properly)

---

## 4. Frontend Structure (Angular)

```
src/app/
├── core/
│   ├── interceptors/auth.interceptor.ts
│   ├── guards/auth.guard.ts
│   ├── guards/role.guard.ts
│   └── services/auth.service.ts
├── features/
│   ├── auth/ (login, register components)
│   ├── products/
│   │   ├── product-list/
│   │   ├── product-form/
│   │   └── product.service.ts
│   ├── orders/
│   │   ├── order-list/
│   │   ├── order-detail/
│   │   └── order.service.ts
│   └── dashboard/
├── shared/
│   ├── components/ (table, status-badge, loading-spinner)
│   └── models/ (interfaces matching backend DTOs)
└── app.routes.ts
```

### Key patterns to actually use (not just include)
- **Reactive Forms** with custom validators for product/order forms
- **RxJS**: `BehaviorSubject` for filter/search state, `switchMap` for search-triggered API calls, `debounceTime` on search input
- **HTTP Interceptor** for attaching JWT and handling 401s (auto-logout/redirect)
- **Route Guards**: `authGuard` (logged in?) and `roleGuard` (admin-only routes)

---

## 5. Database Schema (core tables)

```sql
users (id, email, password_hash, role, created_at)
products (id, name, description, category, price, sku, created_at)
stock_items (id, product_id FK, quantity, low_stock_threshold, version)
orders (id, user_id FK, status, total_amount, created_at, updated_at)
order_items (id, order_id FK, product_id FK, quantity, unit_price)
order_status_history (id, order_id FK, from_status, to_status, changed_at, changed_by FK)
```

Add a composite index on `(product_id, status)` or similar once you notice slow queries in dev logs — and be ready to explain *why* you added it if asked, that's a real interview-quality detail.

---

## 6. Things to Deliberately Get Right (interview gold)

- **Optimistic locking** on stock updates — simulate two concurrent requests decrementing stock and show it fails gracefully instead of corrupting data
- **State machine validation** on order status — don't just let the frontend dictate status changes, enforce valid transitions server-side
- **JWT refresh handling** — even a simple version (short-lived access token, 401 → redirect to login) shows you understand the auth lifecycle
- **Pagination done server-side**, not fetch-all-and-slice-in-Angular
- **One deliberate bug you found and fixed** — keep a note of something real you debugged during the build (race condition, N+1 query, stale cache). This is the single best interview story type: concrete, technical, yours.

---

## 7. README Checklist (for your repo)

- [ ] Project overview + screenshot/GIF
- [ ] Tech stack list
- [ ] Setup instructions (backend env vars, DB setup, `npm install` / `mvn spring-boot:run`)
- [ ] API endpoint summary or Postman collection link
- [ ] Architecture decisions section (2-3 short paragraphs: why JWT, why this schema, what you'd do differently at scale)
- [ ] Link to live demo if you deploy it (Render/Railway for backend, Vercel/Netlify for frontend)

---

## 8. Optional: Deploy It

A deployed link makes this far more credible than a repo alone.
- Backend: Render or Railway (free tier Postgres + Spring Boot)
- Frontend: Vercel or Netlify
- Put both links in the resume bullet and README

---

## 9. Resume Bullet Draft (once built, adjust to what you actually did)

> Built an inventory and order management system (Angular, Spring Boot, PostgreSQL) with JWT-based role auth, a server-enforced order status state machine, and optimistic-locking on stock updates to prevent race conditions under concurrent orders.

Keep this honest to what you actually implement. If you skip optimistic locking or the state machine, drop that clause. The bullet should never claim more than the repo can back up.