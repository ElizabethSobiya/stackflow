#!/usr/bin/env bash
#
# Validates a DATABASE_URL before it is trusted with a deployment.
#
#   ./scripts/verify-database-url.sh 'postgresql://user:pass@host:5432/postgres'
#   DATABASE_URL='...' ./scripts/verify-database-url.sh
#
# Checks the shape of the string, the specific mistakes Supabase's dashboard invites, and then
# whether a real connection can be opened. The password is never printed and is passed to the
# container through the environment rather than the command line.
set -uo pipefail

URL="${1:-${DATABASE_URL:-}}"
FAILED=0

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; FAILED=1; }

if [ -z "$URL" ]; then
  echo "Usage: $0 '<connection string>'   (or set DATABASE_URL)" >&2
  exit 2
fi

echo
echo "Checking the connection string"

# The bracketed placeholder parses as an IPv6 literal and raises, so it is caught first.
case "$URL" in
  *'[YOUR-PASSWORD]'*)
    fail "The literal [YOUR-PASSWORD] placeholder is still in the string — substitute the real password"
    echo
    echo "Copy the string again from Supabase and replace [YOUR-PASSWORD] with your database password."
    exit 1
    ;;
esac

# Whitespace is invisible in a paste and survives every shape check, so the connection just
# fails with a plain "password authentication failed". Not stripped automatically: the same
# stray character would still be sitting in the platform's environment variable field.
case "$URL" in
  *[[:space:]])
    fail "The string ends in whitespace — remove the trailing space or newline"
    echo; echo "Fix the above before deploying. Nothing was contacted."; exit 1 ;;
  [[:space:]]*)
    fail "The string starts with whitespace — remove the leading space"
    echo; echo "Fix the above before deploying. Nothing was contacted."; exit 1 ;;
esac

# Same reason: brackets left around the password parse as an IPv6 literal and raise.
case "$URL" in
  *:'['*']'@*)
    fail "The password is still wrapped in square brackets — replace the brackets along with
      the placeholder text, so that :[hunter2]@ reads :hunter2@"
    echo
    echo "Fix the above before deploying. Nothing was contacted."
    exit 1
    ;;
esac

# --- shape -------------------------------------------------------------------
eval "$(URL="$URL" python3 - <<'PY'
import os, re, urllib.parse as u, shlex

def emit(k, v):
    print(f"{k}={shlex.quote('' if v is None else str(v))}")

try:
    p = u.urlparse(os.environ["URL"])
    fields = (p.scheme, p.hostname, p.port, (p.path or "").lstrip("/"), p.username, p.password)
except ValueError:
    # Unparseable — report empties and let the shell explain which part is missing.
    fields = ("", None, None, "", None, None)
scheme, host, port, dbname, user, password = fields
emit("SCHEME", scheme)
emit("HOST", host)
emit("PORT", port)
emit("DBNAME", dbname)
emit("USER", user)
emit("HAS_PASSWORD", "yes" if password else "no")
# urlsplit does not percent-decode; libpq does. Report the two ways that disagreement bites,
# without ever emitting the password itself.
pw = password or ""
emit("PW_HAS_SPACE", "yes" if re.search(r"\s", pw) else "no")
emit("PW_BAD_ESCAPE", "yes" if re.search("%(?![0-9A-Fa-f]{2})", pw) else "no")
# Python splits the authority at the LAST @, libpq at the FIRST. When they disagree the shape
# check passes and the connection then fails with a baffling DNS error, so count them here.
authority = os.environ["URL"].split("://", 1)[-1].split("/", 1)[0]
emit("AT_COUNT", authority.count("@"))
PY
)"

if [ "$SCHEME" = "postgres" ] || [ "$SCHEME" = "postgresql" ]; then
  pass "scheme:   $SCHEME"
else
  fail "scheme:   '${SCHEME:-none}' — expected postgres:// or postgresql://"
fi

if [ -n "$HOST" ]; then
  pass "host:     $HOST"
else
  fail "host:     could not be parsed — an unencoded @ : / ? or # in the password will do this (@ becomes %40)"
fi

[ -n "$USER" ] && pass "user:     $USER" || fail "user:     missing"
[ -n "$DBNAME" ] && pass "database: $DBNAME" || fail "database: missing"
[ "$HAS_PASSWORD" = "yes" ] && pass "password: set (not shown)" || fail "password: missing"

if [ "${PW_HAS_SPACE:-no}" = "yes" ]; then
  warn "The password contains a space. If that is not deliberate it is a paste artefact, and
      authentication will fail with no hint that whitespace is the reason."
fi

if [ "${PW_BAD_ESCAPE:-no}" = "yes" ]; then
  fail "The password contains a % that is not a valid percent-escape. A literal % must be
      written as %25, otherwise it is read as the start of an escape sequence."
fi

if [ "${AT_COUNT:-1}" -gt 1 ]; then
  fail "The password contains an unencoded @ — percent-encode it as %40.
      (Tools disagree on which @ separates the password from the host, so this fails later
      with a confusing \"could not translate host name\" error rather than a bad-password one.)"
fi

# --- Supabase-specific traps -------------------------------------------------
case "$HOST" in
  db.*.supabase.co)
    fail "This is the DIRECT connection, which is IPv6-only without the paid add-on.
      Use Connect → Session pooler instead (host ends in .pooler.supabase.com)."
    ;;
  *.pooler.supabase.com)
    if [ "$PORT" = "6543" ]; then
      fail "Port 6543 is the TRANSACTION pooler: it breaks JDBC prepared statements and the
      session-level advisory lock Flyway takes while migrating. Use port 5432 (session mode)."
    elif [ "$PORT" = "5432" ]; then
      pass "port:     5432 (Supabase session pooler — the right one)"
    else
      warn "port:     $PORT is unusual for the Supabase pooler; session mode is 5432"
    fi
    ;;
  *)
    [ -n "$PORT" ] && pass "port:     $PORT" || warn "port:     not specified, 5432 assumed"
    ;;
esac

if [ "$FAILED" -ne 0 ]; then
  echo
  echo "Fix the above before deploying. Nothing was contacted."
  exit 1
fi

# --- reachability ------------------------------------------------------------
echo
echo "Opening a connection"

# Inside the container, localhost is the container. Rewrite it so a local database can be
# checked with the same script that checks a remote one.
case "$HOST" in
  localhost|127.0.0.1)
    export PGCONNSTRING="${URL//$HOST/host.docker.internal}"
    warn "testing $HOST via host.docker.internal (the container has its own localhost)"
    ;;
  *)
    export PGCONNSTRING="$URL"
    ;;
esac
run_psql() {
  # -e PGCONNSTRING with no value inherits from this shell, keeping the password out of argv.
  docker run --rm -i -e PGCONNSTRING postgres:16-alpine \
    sh -c 'psql "$PGCONNSTRING" -tAc "'"$1"'"' 2>&1
}

if ! command -v docker >/dev/null 2>&1; then
  warn "docker not found — skipping the live connection test"
  exit 0
fi

if ! OUTPUT=$(run_psql "select version()"); then
  fail "could not connect:"
  printf '      %s\n' "$OUTPUT" | head -4
  echo
  echo "  Common causes: wrong password, IP restrictions on the database, or the project is paused."
  exit 1
fi

pass "connected: $(echo "$OUTPUT" | head -1 | cut -c1-60)…"

TABLES=$(run_psql "select count(*) from information_schema.tables where table_schema='public'" | tr -d '[:space:]')
if [ "${TABLES:-0}" -gt 0 ] 2>/dev/null; then
  pass "schema:   $TABLES table(s) in public — the app has already migrated this database"
else
  pass "schema:   empty; Flyway will create it on first boot"
fi

echo
echo "Good to use. Set this as DATABASE_URL in Render."
