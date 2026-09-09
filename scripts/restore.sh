#!/usr/bin/env bash
#
# Restores PostgreSQL + vendure_static from a backup pair produced by
# scripts/backup.sh. NEVER runs automatically — it requires both file
# paths explicitly, prints exactly what it's about to overwrite, and
# requires typing a confirmation phrase before touching anything.
#
# THIS OVERWRITES THE TARGET DATABASE AND STATIC FILES. There is no undo.
# Point it at the real production stack only when that is genuinely what
# you mean to overwrite — never at a developer's local/dev database (this
# script only ever talks to the docker-compose.prod.yml stack in the first
# place, but double-check ENV_FILE/COMPOSE_FILE below if you've overridden
# them).
#
# Usage:
#   ./scripts/restore.sh <database.dump> <static.tar.gz>
#
# Config (env vars, all optional):
#   COMPOSE_FILE            default: docker-compose.prod.yml
#   ENV_FILE                default: .env.prod
#   COMPOSE_PROJECT_NAME    unset by default — set this to target an
#                           isolated/rehearsal stack instead of real prod.

set -euo pipefail

: "${COMPOSE_FILE:=docker-compose.prod.yml}"
: "${ENV_FILE:=.env.prod}"

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
    cat >&2 <<'EOF'
Usage: ./scripts/restore.sh <database.dump> <static.tar.gz>

Restores PostgreSQL and vendure_static from a backup pair produced by
scripts/backup.sh. THIS OVERWRITES the target database and static files —
there is no undo. Requires typed confirmation before doing anything.
EOF
}

DUMP_FILE="${1:-}"
STATIC_FILE="${2:-}"

if [ -z "$DUMP_FILE" ] || [ -z "$STATIC_FILE" ]; then
    usage
    exit 1
fi
if [ ! -f "$DUMP_FILE" ]; then
    echo "ERROR: dump file not found: $DUMP_FILE" >&2
    exit 1
fi
if [ ! -s "$DUMP_FILE" ]; then
    echo "ERROR: dump file is empty: $DUMP_FILE" >&2
    exit 1
fi
if [ ! -f "$STATIC_FILE" ]; then
    echo "ERROR: static archive not found: $STATIC_FILE" >&2
    exit 1
fi
if [ ! -s "$STATIC_FILE" ]; then
    echo "ERROR: static archive is empty: $STATIC_FILE" >&2
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: docker is not installed / not on PATH." >&2
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: $ENV_FILE not found." >&2
    exit 1
fi

# Deliberately NOT `source`d — see the matching comment in backup.sh: .env.prod
# is a plain KEY=VALUE file, not shell syntax, and several of its real values
# are unquoted with spaces/commas, which `source` mis-parses as separate
# shell words. Pull out just the keys this script needs, verbatim.
env_value() {
    grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'
}
DB_NAME=$(env_value DB_NAME)
DB_USERNAME=$(env_value DB_USERNAME)
DB_PASSWORD=$(env_value DB_PASSWORD)
APP_ENV=$(env_value APP_ENV)

: "${DB_NAME:?DB_NAME must be set in $ENV_FILE}"
: "${DB_USERNAME:?DB_USERNAME must be set in $ENV_FILE}"
: "${DB_PASSWORD:?DB_PASSWORD must be set in $ENV_FILE}"

COMPOSE=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
if [ -n "${COMPOSE_PROJECT_NAME:-}" ]; then
    COMPOSE=(docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
fi

echo "=============================================================="
echo "  DANGER — THIS WILL OVERWRITE DATA, PERMANENTLY"
echo "=============================================================="
echo "  Compose file : $COMPOSE_FILE"
echo "  Env file     : $ENV_FILE"
echo "  Project      : ${COMPOSE_PROJECT_NAME:-<default: name: in $COMPOSE_FILE>}"
echo "  Target DB    : $DB_NAME (user: $DB_USERNAME)"
echo "  APP_ENV      : ${APP_ENV:-<unset>}"
echo "  Dump file    : $DUMP_FILE"
echo "  Static file  : $STATIC_FILE"
echo "--------------------------------------------------------------"
echo "  Every table in '$DB_NAME' will be dropped and replaced with"
echo "  the contents of the dump above. Every file currently in"
echo "  vendure_static will be deleted and replaced with the"
echo "  contents of the archive above. Neither step can be undone."
echo "=============================================================="
read -r -p "Type RESTORE (all caps) to continue, anything else to abort: " CONFIRM
if [ "$CONFIRM" != "RESTORE" ]; then
    echo "Aborted — nothing was touched." >&2
    exit 1
fi

echo "==> Checking postgres is reachable ..."
"${COMPOSE[@]}" exec -T postgres pg_isready -U "$DB_USERNAME" -d "$DB_NAME" >/dev/null

echo "==> Restoring PostgreSQL ($DB_NAME) ..."
"${COMPOSE[@]}" exec -T -e PGPASSWORD="$DB_PASSWORD" postgres \
    pg_restore -U "$DB_USERNAME" -d "$DB_NAME" --clean --if-exists --no-owner --no-privileges \
    < "$DUMP_FILE"

echo "==> Restoring vendure_static ..."
"${COMPOSE[@]}" run --rm --no-deps -T vendure-server sh -c '
    set -e
    rm -rf /app/apps/server/static/*
    tar xzf - -C /app/apps/server/static
' < "$STATIC_FILE"

echo "=============================================================="
echo "  Restore complete."
echo "  If vendure-server / vendure-worker were already running,"
echo "  restart them now so nothing keeps a stale in-memory view of"
echo "  the data that was just replaced:"
echo "    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE restart vendure-server vendure-worker"
echo "=============================================================="
