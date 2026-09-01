# Engineering Notes

Things that actually went wrong or had to be measured during the build, written down while they were
fresh. These are the specifics worth being able to talk through — a bug is only a good story if you
can say exactly why it happened.

---

## 1. The bug: a read-only transaction silently swallowed every write

**Symptom.** The end-to-end test confirmed an order, got `200 OK`, and then asserted the stock had
dropped from 10 to 6. It was still 10. No exception, no rollback message, no failed constraint. The
order's status change had also vanished — but because `PENDING → CANCELLED` is legal *and*
`CONFIRMED → CANCELLED` is legal, the next step in the test still returned 200 and hid it.

**Cause.** `OrderServiceImpl` carries a class-level `@Transactional(readOnly = true)` — the right
default for a service that is mostly reads. `changeStatus` was intentionally left un-annotated so it
could open a fresh transaction per retry attempt through a `TransactionTemplate`:

```java
@Service
@Transactional(readOnly = true)          // ← class-level default
public class OrderServiceImpl {

    // no annotation, so it inherits readOnly = true
    public OrderResponse changeStatus(...) {
        return OptimisticRetry.execute("order-status-change", 3,
                () -> transactionTemplate.execute(status -> applyStatusChange(...)));
    }
}
```

"Un-annotated" does not mean "no transaction" — it means **the class-level annotation applies**. So
the proxy opened a read-only transaction around the whole method, Hibernate set the session's flush
mode to `MANUAL`, and the inner `TransactionTemplate` (propagation `REQUIRED`) simply *joined* that
read-only transaction rather than starting its own. Every dirty-checked change — the order status,
the stock deduction, the audit rows — was discarded at commit. Silently, because a read-only
transaction has nothing to roll back.

**Fix.** Say out loud that these methods manage their own transactions:

```java
@Transactional(propagation = Propagation.NOT_SUPPORTED)
public OrderResponse changeStatus(...) { ... }
```

`NOT_SUPPORTED` guarantees no inherited transaction is active, so each `TransactionTemplate.execute`
starts a genuine read-write transaction that can be retried cleanly. `StockServiceImpl.adjust`, which
also owns its transactions, needed the same treatment.

**What made it findable.** The integration test asserted on the *effect* (stock went from 10 to 6),
not on the status code. A test that only checked `200 OK` would have passed all the way to
production.

**The lesson.** `@Transactional` on a class is a default that applies to every public method,
including the ones you deliberately left blank — and read-only + `TransactionTemplate` fails by
losing data rather than by throwing.

---

## 2. Optimistic locking, measured

Ten concurrent `POST /api/stock/1/adjust` with `delta: -1`, against one row, starting at 22 units.

**First run — retry with no backoff (3 attempts):**

```
200 200 200 409 409 409 409 409 409 200
quantity 22 → 18   (4 winners, 6 rejected)
```

Correct, and the important part: **no lost updates**. Four requests applied exactly once each and the
audit trail had exactly four movements. That is the whole point of `@Version` — the losers are
rejected instead of overwriting each other. But six 409s out of ten is a poor experience for a race
the user cannot even see: all ten retried in lockstep and kept colliding.

**Second run — exponential backoff with full jitter, 5 attempts:**

```
200 200 200 200 200 200 200 200 200 200
quantity 18 → 8    (10 winners, 0 rejected)
```

Same correctness guarantee, no user-visible failures. The change was ~15 lines in
`OptimisticRetry.backoff()`: sleep a random interval up to `20ms << (attempt - 1)`, capped at 320ms.
Randomising is what matters — without jitter, contending callers wake up together and collide again.

**Why not pessimistic locking?** `SELECT … FOR UPDATE` would serialise every stock write. Conflicts on
one product are rare in this workload, so paying a lock on every request to avoid an occasional retry
is the wrong trade. Optimistic locking is right when conflicts are rare and retries are cheap — which
is exactly this shape of workload.

---

## 3. Retrying inside someone else's transaction does not work

The first version of `StockServiceImpl` retried internally. When `OrderService` called it inside an
order-confirmation transaction, that retry was worse than useless: the first failure had already
marked the surrounding transaction rollback-only, so re-running the work inside it could only fail
again at commit.

The rule that came out of it: **retry belongs to whoever owns the transaction boundary.**

- `OrderServiceImpl.changeStatus` owns the boundary → it retries.
- `StockService.deductForOrder` joins the caller's transaction → it does not retry; it just throws and
  lets the owner redo the whole unit of work.
- `StockService.adjust` is called directly by a controller with no ambient transaction → it owns the
  boundary, so it retries.

This is also why the batch deduction is a plain loop inside one transaction: all lines succeed or none
do, and an insufficient-stock failure on line three rolls back lines one and two.

---

## 4. Angular signals: `computed` over non-signal state is a trap

`FieldError` originally derived its message with a `computed()` that read `control.errors` and
`control.touched`. Those are plain properties on `AbstractControl`, not signals — so the computed
cached its first result (`null`, before the user had typed anything) and never recomputed. Validation
messages simply never appeared.

`computed()` only re-evaluates when a **signal** it read changes. Reading non-reactive state inside one
is a silent correctness bug, not an error. The fix was to make it an ordinary method: the component is
`OnPush`, Angular marks it dirty when the form emits DOM events, and a method re-evaluates on every
check.

Rule of thumb adopted for this codebase: `computed()` for signal-derived state, plain methods for
anything reading Angular Forms until signal forms land.

---

## 5. Zoneless testing: `fakeAsync` is gone

The app runs zoneless (no `zone.js`), which is what makes signal-driven change detection worthwhile.
The cost shows up in tests: `fakeAsync`/`tick` need `zone-testing.js` and throw without it.

The replacement, used in `paged-query.spec.ts`:

```ts
function settle(ms = 60): void {
  TestBed.tick();                 // flush effects — toObservable() emits
  vi.advanceTimersByTime(ms);     // drive RxJS debounceTime with Vitest fake timers
  TestBed.tick();                 // flush effects caused by the response
}
```

Slightly more explicit than `tick()`, and it makes the two distinct mechanisms — Angular's effect
scheduler and the RxJS scheduler — visible instead of conflating them.

---

## 6. Alpine has no arm64 Temurin 17

The first backend image used `eclipse-temurin:17-jdk-alpine`, which built fine in CI examples and
failed immediately here:

```
failed to resolve source metadata for docker.io/library/eclipse-temurin:17-jdk-alpine:
no match for platform in manifest: not found
```

Temurin publishes Alpine variants for amd64 only, so that tag breaks on every Apple Silicon and arm64
CI runner. Switched to `eclipse-temurin:17-jdk-jammy` / `17-jre-jammy`, which are multi-arch. Slightly
larger images, universally buildable — the right trade for a project meant to be cloned and run by
someone else.

---

## 7. Environment quirk worth recording

The dev machine already ran a native Postgres on 5432, so `docker compose up postgres` bound the port
without complaint (different interface) and the API cheerfully connected to the *wrong* database,
failing with `FATAL: role "stackflow" does not exist`. The compose file now takes
`STACKFLOW_DB_PORT`, and the README documents the override. Worth a paragraph because "it works on my
machine" usually means "my machine had exactly one Postgres".

---

## 8. Verification status

| Checked | How |
| --- | --- |
| Backend unit + integration tests | `./mvnw test` — 59 passing |
| Frontend unit tests | `npm run test:ci` — 14 passing |
| Real Postgres boot, Flyway migration, dev seeding | `spring-boot:run` against the compose container |
| Auth, catalog, stock, orders, dashboard endpoints | `curl` against the running API |
| Concurrency behaviour | 10 parallel stock adjustments (§2) |
| Production build | `ng build` — 300 kB initial, 84 kB transferred, every feature lazy-chunked |
| Full container stack | `docker compose --profile full up --build` — nginx on :8081 served the SPA and proxied a real login through to the API container and Postgres |
| **UI in a browser** | **Not verified visually** — no browser automation was available in this environment. The dev server serves the app and the API integration is covered by tests and curl, but the rendered screens have not been eyeballed. |
