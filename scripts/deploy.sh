#!/usr/bin/env bash
#
# Despliega una rama en ESTE servidor (desarrollo o producción). Lo lanza el
# workflow .github/workflows/deploy.yml por SSH, pero también se puede ejecutar a
# mano en el servidor, p. ej. para volver a un commit anterior:
#
#   ./scripts/deploy.sh master            # último commit de origin/master
#   ./scripts/deploy.sh master <sha>      # un commit concreto (debe estar en origin/master)
#
# Qué hace, en orden:
#   1. Comprueba que la rama es la que le toca a este servidor (DEPLOY_BRANCH del
#      .env.prod): el servidor de producción nunca despliega develop, ni al revés.
#   2. En producción, hace copia de seguridad con scripts/backup.sh antes de tocar
#      nada (las migraciones se aplican solas al arrancar el servidor nuevo).
#   3. Deja el repositorio exactamente en ese commit.
#   4. Construye y arranca los contenedores en el orden que exige el storefront
#      (ver DOCKER_PRODUCTION.md): primero postgres + servidor + worker, espera a que
#      el servidor esté sano, luego compila el storefront contra él y arranca el resto.
#
# Configuración (en el .env.prod de cada servidor, que nunca se sube al repo):
#   DEPLOY_ENV      production | development
#   DEPLOY_BRANCH   master | develop
# Variables de entorno opcionales:
#   ENV_FILE        por defecto: .env.prod
#
# Aviso: el contenedor del servidor se recrea, así que hay unos segundos sin
# servicio en cada despliegue. Una migración no se deshace volviendo a un commit
# anterior: para eso está scripts/restore.sh con la copia del paso 2.

set -euo pipefail

: "${ENV_FILE:=.env.prod}"

BRANCH="${1:-}"
SHA="${2:-}"

fail() {
    echo "ERROR: $*" >&2
    exit 1
}

log() {
    echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] $*"
}

[ -n "$BRANCH" ] || fail "Uso: $0 <rama> [sha]"

# Siempre desde la raíz del repositorio, se lance desde donde se lance.
if [ -z "${DEPLOY_REPO_DIR:-}" ]; then
    cd "$(dirname "$0")"
    DEPLOY_REPO_DIR="$(git rev-parse --show-toplevel 2>/dev/null)" || fail "Hay que ejecutarlo dentro del repositorio clonado en el servidor."
fi
REPO_DIR="$DEPLOY_REPO_DIR"
cd "$REPO_DIR"

# El `git checkout` de abajo puede reescribir este mismo archivo mientras bash lo
# está leyendo (bash lee los scripts poco a poco). Para evitarlo, el script se
# ejecuta siempre desde una copia temporal fuera del repositorio.
if [ "${DEPLOY_FROM_COPY:-}" != "1" ]; then
    SELF_COPY="$(mktemp)"
    cp "$0" "$SELF_COPY"
    DEPLOY_FROM_COPY=1 DEPLOY_REPO_DIR="$REPO_DIR" exec bash "$SELF_COPY" "$@"
fi
trap 'rm -f "$0"' EXIT

[ -f "$ENV_FILE" ] || fail "No existe $ENV_FILE en $REPO_DIR (ver .env.prod.example y docs/despliegue.md)."

env_value() {
    grep -E "^$1=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//'
}

DEPLOY_ENV="$(env_value DEPLOY_ENV)"
DEPLOY_BRANCH="$(env_value DEPLOY_BRANCH)"

case "$DEPLOY_ENV" in
    production|development) ;;
    *) fail "DEPLOY_ENV debe ser 'production' o 'development' en $ENV_FILE (ahora: '${DEPLOY_ENV}')." ;;
esac

[ -n "$DEPLOY_BRANCH" ] || fail "Falta DEPLOY_BRANCH en $ENV_FILE."
[ "$BRANCH" = "$DEPLOY_BRANCH" ] || fail "Este servidor ($DEPLOY_ENV) solo despliega la rama '$DEPLOY_BRANCH', no '$BRANCH'."

log "Despliegue de '$BRANCH' en $DEPLOY_ENV"

git fetch --prune origin
if [ -z "$SHA" ]; then
    SHA="$(git rev-parse "origin/$BRANCH")"
fi
git cat-file -e "$SHA^{commit}" 2>/dev/null || fail "El commit $SHA no existe en el repositorio."
git merge-base --is-ancestor "$SHA" "origin/$BRANCH" || fail "El commit $SHA no pertenece a origin/$BRANCH."

COMPOSE_FILES=(-f docker-compose.prod.yml)
if [ "$DEPLOY_ENV" = "development" ]; then
    # Protege la tienda de desarrollo con contraseña y la oculta a los buscadores.
    COMPOSE_FILES+=(-f docker-compose.dev-server.yml)
fi
compose() {
    docker compose "${COMPOSE_FILES[@]}" --env-file "$ENV_FILE" "$@"
}

# --- 1. Copia de seguridad (solo producción y solo si ya hay algo que copiar) ---
if [ "$DEPLOY_ENV" = "production" ] && [ -n "$(compose ps -q postgres 2>/dev/null)" ]; then
    log "Copia de seguridad previa al despliegue"
    ENV_FILE="$ENV_FILE" bash ./scripts/backup.sh
fi

# --- 2. Código ---
PREVIOUS_SHA="$(git rev-parse HEAD)"
log "Commit actual: $PREVIOUS_SHA -> nuevo: $SHA"
# -f: el servidor no debe tener cambios propios en archivos del repo; .env.prod,
# backups/ y demás archivos ignorados no se tocan.
git checkout -f -B "$BRANCH" "$SHA"

wait_healthy() {
    local service="$1" id status
    id="$(compose ps -q "$service")"
    [ -n "$id" ] || fail "El servicio $service no está arrancado."
    for _ in $(seq 1 60); do
        status="$(docker inspect --format='{{.State.Health.Status}}' "$id" 2>/dev/null || echo starting)"
        if [ "$status" = "healthy" ]; then
            log "$service sano"
            return 0
        fi
        sleep 5
    done
    compose logs --tail 100 "$service" >&2 || true
    fail "$service no ha llegado a estar sano. Para volver al commit anterior: ./scripts/deploy.sh $BRANCH $PREVIOUS_SHA"
}

# --- 3. Servidor Vendure + worker (las migraciones se ejecutan al arrancar) ---
log "Construyendo vendure-server y vendure-worker"
compose build vendure-server vendure-worker
compose up -d postgres vendure-server vendure-worker
wait_healthy vendure-server

# --- 4. Storefront (necesita el servidor sano para el `next build`) y Caddy ---
log "Construyendo storefront"
DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 compose build storefront
compose up -d storefront caddy
# El Caddyfile se monta como archivo suelto: al reemplazarlo git, el contenedor
# sigue viendo el antiguo. Si cambió algo de Caddy, se recrea el contenedor (los
# certificados están en el volumen caddy_data y se conservan).
if ! git diff --quiet "$PREVIOUS_SHA" "$SHA" -- Caddyfile Caddyfile.dev docker-compose.dev-server.yml; then
    log "Cambios en la configuración de Caddy: recreando el contenedor"
    compose up -d --force-recreate caddy
fi
wait_healthy storefront
wait_healthy vendure-worker

# --- 5. Limpieza de imágenes antiguas sin uso (no toca volúmenes ni datos) ---
docker image prune -f >/dev/null

echo "$SHA" > .deployed-sha
log "Despliegue terminado: $BRANCH @ $SHA"
