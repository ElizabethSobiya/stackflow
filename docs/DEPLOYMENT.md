# Deployment

Two deployable units: the **API** (a container) and the **web app** (static files). They can live on
the same host or different ones — the only thing that has to line up is the pair of URLs they know
about each other.

```
   Browser ──▶ web app (static)  ──fetch──▶  API (container) ──▶ PostgreSQL
                API_BASE_URL                 CORS_ALLOWED_ORIGINS
```

Get those two variables right and everything else is defaults.

---

## Step 1 — the database (Supabase)

Render's free Postgres is deleted 30 days after creation, which is fine for a demo and wrong for a
link on a CV. Supabase's free tier keeps the data instead.

1. [supabase.com](https://supabase.com) → **New project**. Pick a region near where the API will run
   (`render.yaml` uses Render's `frankfurt`, so EU Central is a good match — every request crosses
   that gap).
2. Save the database password it generates. If you set your own, avoid `@ / : ?` or percent-encode
   them; the URL is parsed as a URI (`%40` for `@` is decoded correctly, a raw `@` is not).
3. **Connect** (top of the dashboard) → copy the **Session pooler** string. It looks like:

   ```
   postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```

**Take the session pooler specifically — not the other two options:**

| Option | Why not |
| --- | --- |
| Direct connection | IPv6-only unless you buy the IPv4 add-on; a host without IPv6 egress simply cannot reach it |
| Transaction pooler (port **6543**) | Hands back a different backend per statement. The JDBC driver's server-side prepared statements break, and Flyway takes a *session-level* advisory lock while migrating, which a transaction pooler cannot hold |
| **Session pooler (port 5432)** | ✅ IPv4, one backend per client for the life of the connection — what a JDBC pool and Flyway expect |

Keep `DB_POOL_SIZE` small (5, the default in `prod`). The free pooler allows a limited number of
client connections and a greedy pool is the fastest way to exhaust it.

**Free-tier caveat worth planning for:** a Supabase project is **paused after one week with no
activity**, and a paused project is restorable from the dashboard for 90 days. Data is not lost, but
a dormant demo needs one click to wake up. If the link is going on a CV, either open it occasionally
or say in the README that the demo may need a moment to wake.

### Prove the connection string before deploying

Two minutes here saves a slow cycle of Render builds. From the repository root, with your own string:

```bash
# 1. is the string well-formed, and does it actually connect?
./scripts/verify-database-url.sh 'postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres'
```

That checks the shape, catches the three mistakes below, then opens a real connection — without
printing the password.

| It reports | Because |
| --- | --- |
| `[YOUR-PASSWORD]` still present | The dashboard copies a placeholder, not your password |
| Port 6543 | Transaction pooler — breaks prepared statements and Flyway's migration lock |
| Host `db.*.supabase.co` | Direct connection, IPv6-only without the paid add-on |
| Unencoded `@` in the password | Tools disagree on which `@` splits the URL; encode it as `%40` |

```bash
export SUPABASE_URL='postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres'

# 2. can the app? (this also creates the schema)
cd backend
DATABASE_URL="$SUPABASE_URL" \
SPRING_PROFILES_ACTIVE=prod \
JWT_SECRET="$(openssl rand -base64 48)" \
CORS_ALLOWED_ORIGINS=http://localhost:4200 \
./mvnw spring-boot:run
```

Look for `Successfully applied 1 migration` in the output, then `curl localhost:8080/actuator/health`.
Supabase's **Table Editor** should now list `users`, `products`, `orders` and the rest.

Swap `prod` for `dev` on that run if you want the demo catalog and orders seeded into the deployed
database — an interviewer opening a populated dashboard beats an empty one. The seeder only fires
against a database with no users, so it cannot double up later.

The connection string is a credential: keep it in the shell, in Render's environment variables, or in
a local `.env` (already git-ignored). Never in a committed file.

---

## Step 2 — the API (Render)

`render.yaml` declares the API and the static site. The database is external, so Render only needs
to be told where it is.

1. Push this repository to GitHub.
2. Render → **New** → **Blueprint** → pick the repo and the branch to deploy.
3. Render prompts for the three values marked `sync: false`:
   - `stackflow-api` → **`DATABASE_URL`** = the Supabase session-pooler string from step 1
   - `stackflow-api` → **`CORS_ALLOWED_ORIGINS`** = the frontend's origin, e.g.
     `https://stackflow-web.onrender.com` (no trailing slash)
   - `stackflow-web` → **`API_BASE_URL`** = `https://stackflow-api.onrender.com/api`
4. **Apply.** The first build takes 5–10 minutes — the jar is compiled inside the image.

These two URLs are circular: each service wants the other's address. Use the names Render will
assign, and correct them afterwards if you renamed a service.

`JWT_SECRET` is generated by Render and never leaves it. Flyway creates the schema on first boot;
there is no migration step to run by hand.

**Deploying only the API** (no blueprint): **New** → **Web Service** → Docker runtime, Dockerfile
path `./backend/Dockerfile`, Docker context `./backend`, health check path `/actuator/health`, then
add the environment variables from the table below.

**Free-tier behaviour:** the API sleeps after ~15 minutes of inactivity, so the first request after a
pause takes 30–60 seconds while the container wakes. The UI shows its loading states throughout; it
is not broken. Open the health URL a minute before a live demo.

---

## Step 3 (alternative) — web app on Vercel or Netlify

Instead of Render's static site — delete `stackflow-web` from the blueprint, or ignore it.

**Vercel** — [`frontend/vercel.json`](../frontend/vercel.json) is already set up:

1. Vercel → **Add New Project** → import the repo.
2. Set **Root Directory** to `frontend`. The build command, output directory and SPA rewrites come
   from `vercel.json`.
3. Add an environment variable: `API_BASE_URL = https://<your-api>.onrender.com/api`
4. Deploy, then set `CORS_ALLOWED_ORIGINS` on the API to the Vercel URL and redeploy the API.

**Netlify** — [`frontend/netlify.toml`](../frontend/netlify.toml) carries the same settings; set the
base directory to `frontend` and add the same `API_BASE_URL` variable.

> `API_BASE_URL` is read at **build** time, not at runtime — static files have no server left to read
> an environment variable. Changing it means triggering a rebuild, not just a restart.

---

## Anywhere else that runs containers

Both images are plain Dockerfiles with no host-specific assumptions.

```bash
docker build -t stackflow-api ./backend
docker run -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e DATABASE_URL='postgres://user:pass@host:5432/stackflow' \
  -e JWT_SECRET='at-least-32-bytes-of-random-value-here' \
  -e CORS_ALLOWED_ORIGINS='https://app.example.com' \
  stackflow-api
```

The API listens on `$PORT` when the platform sets one (Render, Railway, Heroku, Fly all do) and
falls back to 8080. `DATABASE_URL` in the `postgres://…` form is translated to JDBC automatically, so
Railway and Fly need no extra configuration either.

---

## Environment variables

### API

| Variable | Required | Notes |
| --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | yes | `prod` — disables seeding, Swagger and verbose logging |
| `DATABASE_URL` | yes* | Platform form (`postgres://user:pass@host:port/db`), translated to JDBC on startup. For Supabase use the **session pooler** string (port 5432). |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | yes* | Use these instead if your platform gives you JDBC parts. Explicit values always win over `DATABASE_URL`. |
| `JWT_SECRET` | yes | **At least 32 bytes.** The app refuses to start with a shorter one rather than signing tokens weakly. |
| `CORS_ALLOWED_ORIGINS` | yes | Exact frontend origin(s), comma-separated, no trailing slash. Wildcards are rejected. |
| `PORT` | no | Injected by the platform; defaults to 8080 |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | no | ISO-8601 durations, default `PT15M` / `P7D` |
| `DB_POOL_SIZE` | no | Default 5 in prod — managed free-tier databases (Supabase's pooler included) cap connections hard |
| `ENABLE_API_DOCS` | no | `true` exposes Swagger UI on a deployed environment; off by default |

\* one of the two forms.

### Web app (build time)

| Variable | Required | Notes |
| --- | --- | --- |
| `API_BASE_URL` | yes, unless same-origin | Absolute URL **including `/api`**. Unset keeps the same-origin `/api` default used by the bundled nginx image. |

---

## After the first deploy

1. **Create the admin.** Open the deployed app and register. The first account on an empty database
   becomes ADMIN; everyone after is STAFF. Do this immediately — the rule is "first registration",
   not "first person you trust".
2. **Check the health probe:** `https://<api>/actuator/health` → `{"status":"UP"}`.
3. **Confirm the schema:** the API logs `Successfully applied N migrations` on its first boot. Flyway
   runs automatically; there is no manual migration step.
4. **Add a product, place an order, confirm it.** That exercises the database, the transaction
   boundary and the stock path in one pass.

## When something is wrong

| Symptom | Cause |
| --- | --- |
| Login works, every other call fails in the browser with a CORS error | `CORS_ALLOWED_ORIGINS` does not exactly match the frontend origin — check scheme and trailing slash |
| Requests go to `https://app.example.com/api/...` instead of the API host | `API_BASE_URL` was not set at build time; set it and **rebuild**, not restart |
| API exits at startup with "secret must be at least 32 bytes" | `JWT_SECRET` is too short — this is deliberate |
| `FATAL: role "stackflow" does not exist` | The API reached a different database than you think; check `DATABASE_URL` |
| First request after idle takes ~30s | Free-tier cold start, not a bug |
| `relation "users" does not exist` | Flyway did not run — usually a second database or `spring.flyway.enabled=false` |
| Startup hangs, then `connection timed out` reaching Supabase | The direct-connection string was used; it is IPv6-only. Switch to the session pooler. |
| `prepared statement "S_1" already exists`, or Flyway blocks on a lock | The transaction pooler (port 6543) was used. Switch to the session pooler on 5432. |
| API was fine, now every request 500s after a quiet week | The Supabase project auto-paused; restore it from the dashboard |
