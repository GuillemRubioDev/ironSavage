#!/usr/bin/env bash
#
# Backs up the two pieces of persistent state a fresh deploy can't
# regenerate: the PostgreSQL database (postgres_data) and the uploaded
# assets + generated invoice PDFs (vendure_static).
#
# Runs entirely through `docker compose exec`/`run` — never touches the
# named volumes directly, never requires PostgreSQL (or anything else)
# installed on the host, and never needs the containers stopped.
#
# Usage:
#   ./scripts/backup.sh
#
# Config (env vars, all optional):
#   COMPOSE_FILE            default: docker-compose.prod.yml
#   ENV_FILE                default: .env.prod
#   BACKUP_DIR              default: ./backups
#   BACKUP_RETENTION_DAYS   default: 14
#   COMPOSE_PROJECT_NAME    unset by default (uses the compose file's own
#                           `name:`) — set this to point the script at an
#                           isolated stack, e.g. for a restore rehearsal.
#
# Output:
#   backups/postgres/<UTC timestamp>.dump     (pg_dump, custom format)
#   backups/static/<UTC timestamp>.tar.gz     (vendure_static contents)
#
# A backup is only ever visible under its final name once BOTH artifacts
# have been produced *and* verified — every write starts as a hidden
# `.tmp-*` file next to its final destination and is only renamed into
# place after that verification passes. A failed or partial run always
# exits non-zero and never leaves a half-written file at a "real" name.
#
# IMPORTANT: a backup that only ever lives on this same server does not
# protect against losing the server itself (disk failure, host
# compromise, provider incident). Copying backups/ to off-site storage
# (S3, Backblaze B2, another host, ...) on some schedule is a deliberate
# follow-up, not implemented here — see the phase report's "pendientes".

set -euo pipefail

: "${COMPOSE_FILE:=docker-compose.prod.yml}"
: "${ENV_FILE:=.env.prod}"
: "${BACKUP_DIR:=./backups}"
: "${BACKUP_RETENTION_DAYS:=14}"

# Resolve every relative path against the repo root, regardless of where
# this script is invoked from.
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: docker is not installed / not on PATH." >&2
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: $ENV_FILE not found. Copy .env.prod.example to $ENV_FILE and fill it in." >&2
    exit 1
fi

# Only DB_NAME/DB_USERNAME/DB_PASSWORD are actually needed by this script
# (for -U/-d and PGPASSWORD). Deliberately NOT `source`d: .env.prod is a
# plain KEY=VALUE file, not shell syntax — several of its real values
# (INVOICE_STORE_NAME, INVOICE_STORE_ADDRESS, ...) are unquoted and contain
# spaces/commas, which `source` would mis-parse as separate shell words/
# commands. Pulling out just the keys this script needs, verbatim, sidesteps
# that entirely regardless of how the rest of the file is formatted.
env_value() {
    grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'
}
DB_NAME=$(env_value DB_NAME)
DB_USERNAME=$(env_value DB_USERNAME)
DB_PASSWORD=$(env_value DB_PASSWORD)

: "${DB_NAME:?DB_NAME must be set in $ENV_FILE}"
: "${DB_USERNAME:?DB_USERNAME must be set in $ENV_FILE}"
: "${DB_PASSWORD:?DB_PASSWORD must be set in $ENV_FILE}"

COMPOSE=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
if [ -n "${COMPOSE_PROJECT_NAME:-}" ]; then
    COMPOSE=(docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
fi

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
POSTGRES_DIR="$BACKUP_DIR/postgres"
STATIC_DIR="$BACKUP_DIR/static"
mkdir -p "$POSTGRES_DIR" "$STATIC_DIR"
chmod 750 "$BACKUP_DIR" "$POSTGRES_DIR" "$STATIC_DIR" 2>/dev/null || true

TMP_DUMP="$POSTGRES_DIR/.tmp-$TIMESTAMP.dump"
FINAL_DUMP="$POSTGRES_DIR/$TIMESTAMP.dump"
TMP_STATIC="$STATIC_DIR/.tmp-$TIMESTAMP.tar.gz"
FINAL_STATIC="$STATIC_DIR/$TIMESTAMP.tar.gz"

# Anything that fails before the final `mv`s below must not leave a
# half-written file lying around under any name.
cleanup_partial() {
    rm -f "$TMP_DUMP" "$TMP_STATIC"
}
trap cleanup_partial ERR

echo "==> Checking postgres is reachable ..."
"${COMPOSE[@]}" exec -T postgres pg_isready -U "$DB_USERNAME" -d "$DB_NAME" >/dev/null

echo "==> Dumping PostgreSQL ($DB_NAME) ..."
"${COMPOSE[@]}" exec -T -e PGPASSWORD="$DB_PASSWORD" postgres \
    pg_dump -U "$DB_USERNAME" -d "$DB_NAME" -Fc > "$TMP_DUMP"

if [ ! -s "$TMP_DUMP" ]; then
    echo "ERROR: pg_dump produced an empty file." >&2
    exit 1
fi

echo "==> Verifying dump integrity (pg_restore --list) ..."
"${COMPOSE[@]}" exec -T postgres pg_restore --list < "$TMP_DUMP" > /dev/null

echo "==> Archiving vendure_static ..."
# A one-off container using the vendure-server *service definition* (so it
# mounts the real vendure_static volume) without needing to know that
# volume's actual generated name, and without needing vendure-server itself
# to be running.
"${COMPOSE[@]}" run --rm --no-deps -T vendure-server \
    sh -c "tar czf - -C /app/apps/server/static ." > "$TMP_STATIC"

if [ ! -s "$TMP_STATIC" ]; then
    echo "ERROR: static archive is empty." >&2
    exit 1
fi

echo "==> Verifying static archive integrity ..."
"${COMPOSE[@]}" run --rm --no-deps -T vendure-server \
    sh -c "tar tzf -" < "$TMP_STATIC" > /dev/null

# Both artifacts exist and have been verified — only now do they become
# "real" backups.
mv "$TMP_DUMP" "$FINAL_DUMP"
mv "$TMP_STATIC" "$FINAL_STATIC"
chmod 640 "$FINAL_DUMP" "$FINAL_STATIC" 2>/dev/null || true
trap - ERR

echo "==> Backup complete:"
for f in "$FINAL_DUMP" "$FINAL_STATIC"; do
    size=$(du -h "$f" | cut -f1)
    echo "    $f  ($size)"
done

echo "==> Applying retention (deleting backups older than ${BACKUP_RETENTION_DAYS}d) ..."
if ! find "$POSTGRES_DIR" -maxdepth 1 -name '*.dump' -mtime "+$BACKUP_RETENTION_DAYS" -print -delete; then
    echo "WARNING: retention cleanup for postgres/ hit an error (today's backup already succeeded and is safe)." >&2
fi
if ! find "$STATIC_DIR" -maxdepth 1 -name '*.tar.gz' -mtime "+$BACKUP_RETENTION_DAYS" -print -delete; then
    echo "WARNING: retention cleanup for static/ hit an error (today's backup already succeeded and is safe)." >&2
fi

echo "==> Done."
