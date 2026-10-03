#!/usr/bin/env bash
#
# Restaura PostgreSQL + vendure_static desde una pareja de copias generada por
# scripts/backup.sh. NUNCA se ejecuta solo: exige las dos rutas de archivo,
# muestra exactamente lo que va a sobrescribir y pide escribir una frase de
# confirmación antes de tocar nada.
#
# ESTO SOBRESCRIBE LA BASE DE DATOS Y LOS ARCHIVOS ESTÁTICOS DE DESTINO. No se
# puede deshacer. Úsalo contra producción solo si de verdad quieres sobrescribirla;
# nunca contra la base local de un desarrollador (el script solo habla con el
# sistema de docker-compose.prod.yml, pero revisa ENV_FILE/COMPOSE_FILE si los
# has cambiado).
#
# Uso:
#   ./scripts/restore.sh <base.dump> <static.tar.gz>
#
# Configuración (variables de entorno, todas opcionales):
#   COMPOSE_FILE            por defecto: docker-compose.prod.yml
#   ENV_FILE                por defecto: .env.prod
#   COMPOSE_PROJECT_NAME    sin definir por defecto; defínela para apuntar a un
#                           sistema aislado de ensayo en vez de a producción.

set -euo pipefail

: "${COMPOSE_FILE:=docker-compose.prod.yml}"
: "${ENV_FILE:=.env.prod}"

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
    cat >&2 <<'EOF'
Uso: ./scripts/restore.sh <base.dump> <static.tar.gz>

Restaura PostgreSQL y vendure_static desde una pareja de copias generada por
scripts/backup.sh. ESTO SOBRESCRIBE la base de datos y los archivos estáticos
de destino y no se puede deshacer. Pide confirmación escrita antes de hacer nada.
EOF
}

DUMP_FILE="${1:-}"
STATIC_FILE="${2:-}"

if [ -z "$DUMP_FILE" ] || [ -z "$STATIC_FILE" ]; then
    usage
    exit 1
fi
if [ ! -f "$DUMP_FILE" ]; then
    echo "ERROR: no se encuentra el volcado: $DUMP_FILE" >&2
    exit 1
fi
if [ ! -s "$DUMP_FILE" ]; then
    echo "ERROR: el volcado está vacío: $DUMP_FILE" >&2
    exit 1
fi
if [ ! -f "$STATIC_FILE" ]; then
    echo "ERROR: no se encuentra el archivo de estáticos: $STATIC_FILE" >&2
    exit 1
fi
if [ ! -s "$STATIC_FILE" ]; then
    echo "ERROR: el archivo de estáticos está vacío: $STATIC_FILE" >&2
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: docker no está instalado o no está en el PATH." >&2
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: no se encuentra $ENV_FILE." >&2
    exit 1
fi

# A propósito NO se hace `source` (ver el comentario equivalente en backup.sh):
# .env.prod es un archivo CLAVE=VALOR, no sintaxis de shell, y varios valores
# reales van sin comillas y con espacios o comas, que `source` interpreta mal.
# Se sacan solo las claves que necesita este script, tal cual.
env_value() {
    grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'
}
DB_NAME=$(env_value DB_NAME)
DB_USERNAME=$(env_value DB_USERNAME)
DB_PASSWORD=$(env_value DB_PASSWORD)
APP_ENV=$(env_value APP_ENV)

: "${DB_NAME:?Falta DB_NAME en $ENV_FILE}"
: "${DB_USERNAME:?Falta DB_USERNAME en $ENV_FILE}"
: "${DB_PASSWORD:?Falta DB_PASSWORD en $ENV_FILE}"

COMPOSE=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
if [ -n "${COMPOSE_PROJECT_NAME:-}" ]; then
    COMPOSE=(docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
fi

echo "=============================================================="
echo "  PELIGRO: ESTO SOBRESCRIBE DATOS DE FORMA PERMANENTE"
echo "=============================================================="
echo "  Compose       : $COMPOSE_FILE"
echo "  Archivo .env  : $ENV_FILE"
echo "  Proyecto      : ${COMPOSE_PROJECT_NAME:-<por defecto: name: de $COMPOSE_FILE>}"
echo "  Base destino  : $DB_NAME (usuario: $DB_USERNAME)"
echo "  APP_ENV       : ${APP_ENV:-<sin definir>}"
echo "  Volcado       : $DUMP_FILE"
echo "  Estáticos     : $STATIC_FILE"
echo "--------------------------------------------------------------"
echo "  Se borrarán todas las tablas de '$DB_NAME' y se sustituirán"
echo "  por el contenido del volcado indicado. Se borrarán todos los"
echo "  archivos de vendure_static y se sustituirán por el contenido"
echo "  del archivo indicado. Ninguno de los dos pasos se puede deshacer."
echo "=============================================================="
read -r -p "Escribe RESTAURAR (en mayúsculas) para continuar; cualquier otra cosa cancela: " CONFIRM
if [ "$CONFIRM" != "RESTAURAR" ]; then
    echo "Cancelado: no se ha tocado nada." >&2
    exit 1
fi

echo "==> Comprobando que postgres responde..."
"${COMPOSE[@]}" exec -T postgres pg_isready -U "$DB_USERNAME" -d "$DB_NAME" >/dev/null

echo "==> Restaurando PostgreSQL ($DB_NAME)..."
"${COMPOSE[@]}" exec -T -e PGPASSWORD="$DB_PASSWORD" postgres \
    pg_restore -U "$DB_USERNAME" -d "$DB_NAME" --clean --if-exists --no-owner --no-privileges \
    < "$DUMP_FILE"

echo "==> Restaurando vendure_static..."
"${COMPOSE[@]}" run --rm --no-deps -T vendure-server sh -c '
    set -e
    rm -rf /app/apps/server/static/*
    tar xzf - -C /app/apps/server/static
' < "$STATIC_FILE"

echo "=============================================================="
echo "  Restauración completada."
echo "  Si vendure-server o vendure-worker ya estaban arrancados,"
echo "  reinícialos ahora para que ninguno conserve en memoria los"
echo "  datos que se acaban de sustituir:"
echo "    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE restart vendure-server vendure-worker"
echo "=============================================================="
