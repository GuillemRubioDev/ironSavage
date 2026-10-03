#!/usr/bin/env bash
#
# Hace copia de seguridad de los dos datos persistentes que un despliegue nuevo
# no puede regenerar: la base de datos PostgreSQL (postgres_data) y los recursos
# subidos + los PDF de factura generados (vendure_static).
#
# Funciona solo con `docker compose exec`/`run`: nunca toca los volúmenes
# directamente, no necesita PostgreSQL (ni nada más) instalado en el servidor y
# no hace falta parar los contenedores.
#
# Uso:
#   ./scripts/backup.sh
#
# Configuración (variables de entorno, todas opcionales):
#   COMPOSE_FILE            por defecto: docker-compose.prod.yml
#   ENV_FILE                por defecto: .env.prod
#   BACKUP_DIR              por defecto: ./backups
#   BACKUP_RETENTION_DAYS   por defecto: 14
#   COMPOSE_PROJECT_NAME    sin definir por defecto (usa el `name:` del
#                           compose); defínela para apuntar a un sistema
#                           aislado, p. ej. para ensayar una restauración.
#
# Resultado:
#   backups/postgres/<fecha UTC>.dump     (pg_dump, formato custom)
#   backups/static/<fecha UTC>.tar.gz     (contenido de vendure_static)
#
# Una copia solo aparece con su nombre definitivo cuando LOS DOS archivos se han
# generado *y* verificado: todo se escribe primero como un archivo oculto
# `.tmp-*` junto a su destino y solo se renombra cuando pasa la verificación.
# Una ejecución fallida o a medias siempre termina con código de error y nunca
# deja un archivo a medio escribir con un nombre «real».
#
# IMPORTANTE: una copia que solo está en este mismo servidor no protege si se
# pierde el servidor (fallo de disco, intrusión, incidencia del proveedor).
# Copiar backups/ a un almacenamiento externo (S3, Backblaze B2, otro servidor…)
# de forma periódica es un paso pendiente, no implementado aquí.

set -euo pipefail

: "${COMPOSE_FILE:=docker-compose.prod.yml}"
: "${ENV_FILE:=.env.prod}"
: "${BACKUP_DIR:=./backups}"
: "${BACKUP_RETENTION_DAYS:=14}"

# Todas las rutas relativas se resuelven desde la raíz del repo, se ejecute
# el script desde donde se ejecute.
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: docker no está instalado o no está en el PATH." >&2
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: no se encuentra $ENV_FILE. Copia .env.prod.example a $ENV_FILE y rellénalo." >&2
    exit 1
fi

# Este script solo necesita DB_NAME/DB_USERNAME/DB_PASSWORD (para -U/-d y
# PGPASSWORD). A propósito NO se hace `source`: .env.prod es un archivo
# CLAVE=VALOR, no sintaxis de shell, y varios valores reales (INVOICE_STORE_NAME,
# INVOICE_STORE_ADDRESS…) van sin comillas y con espacios o comas, que `source`
# interpretaría como palabras o comandos sueltos. Sacar solo las claves necesarias,
# tal cual, evita el problema tenga el resto del archivo el formato que tenga.
env_value() {
    grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'
}
DB_NAME=$(env_value DB_NAME)
DB_USERNAME=$(env_value DB_USERNAME)
DB_PASSWORD=$(env_value DB_PASSWORD)

: "${DB_NAME:?Falta DB_NAME en $ENV_FILE}"
: "${DB_USERNAME:?Falta DB_USERNAME en $ENV_FILE}"
: "${DB_PASSWORD:?Falta DB_PASSWORD en $ENV_FILE}"

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

# Si algo falla antes de los `mv` finales, no debe quedar ningún archivo a
# medio escribir con ningún nombre.
cleanup_partial() {
    rm -f "$TMP_DUMP" "$TMP_STATIC"
}
trap cleanup_partial ERR

echo "==> Comprobando que postgres responde..."
"${COMPOSE[@]}" exec -T postgres pg_isready -U "$DB_USERNAME" -d "$DB_NAME" >/dev/null

echo "==> Volcando PostgreSQL ($DB_NAME)..."
"${COMPOSE[@]}" exec -T -e PGPASSWORD="$DB_PASSWORD" postgres \
    pg_dump -U "$DB_USERNAME" -d "$DB_NAME" -Fc > "$TMP_DUMP"

if [ ! -s "$TMP_DUMP" ]; then
    echo "ERROR: pg_dump ha generado un archivo vacío." >&2
    exit 1
fi

echo "==> Verificando la integridad del volcado (pg_restore --list)..."
"${COMPOSE[@]}" exec -T postgres pg_restore --list < "$TMP_DUMP" > /dev/null

echo "==> Empaquetando vendure_static..."
# Un contenedor puntual con la *definición del servicio* vendure-server (así monta
# el volumen vendure_static real) sin necesitar el nombre generado del volumen ni
# que vendure-server esté arrancado.
"${COMPOSE[@]}" run --rm --no-deps -T vendure-server \
    sh -c "tar czf - -C /app/apps/server/static ." > "$TMP_STATIC"

if [ ! -s "$TMP_STATIC" ]; then
    echo "ERROR: el archivo de estáticos está vacío." >&2
    exit 1
fi

echo "==> Verificando la integridad del archivo de estáticos..."
"${COMPOSE[@]}" run --rm --no-deps -T vendure-server \
    sh -c "tar tzf -" < "$TMP_STATIC" > /dev/null

# Los dos archivos existen y están verificados: solo ahora pasan a ser copias
# «reales».
mv "$TMP_DUMP" "$FINAL_DUMP"
mv "$TMP_STATIC" "$FINAL_STATIC"
chmod 640 "$FINAL_DUMP" "$FINAL_STATIC" 2>/dev/null || true
trap - ERR

echo "==> Copia de seguridad completada:"
for f in "$FINAL_DUMP" "$FINAL_STATIC"; do
    size=$(du -h "$f" | cut -f1)
    echo "    $f  ($size)"
done

echo "==> Aplicando la retención (borrando copias de más de ${BACKUP_RETENTION_DAYS} días)..."
if ! find "$POSTGRES_DIR" -maxdepth 1 -name '*.dump' -mtime "+$BACKUP_RETENTION_DAYS" -print -delete; then
    echo "AVISO: error al limpiar copias antiguas de postgres/ (la copia de hoy ya se ha hecho y está a salvo)." >&2
fi
if ! find "$STATIC_DIR" -maxdepth 1 -name '*.tar.gz' -mtime "+$BACKUP_RETENTION_DAYS" -print -delete; then
    echo "AVISO: error al limpiar copias antiguas de static/ (la copia de hoy ya se ha hecho y está a salvo)." >&2
fi

echo "==> Hecho."
