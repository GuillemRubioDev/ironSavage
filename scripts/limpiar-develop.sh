#!/usr/bin/env bash
#
# Limpia el SERVIDOR DE DESARROLLO: deja la base de datos sin clientes, pedidos,
# facturas ni catálogo (ver scripts/sql/limpiar-develop.sql) y borra del volumen
# vendure_static los archivos de las imágenes y facturas eliminadas.
#
# Uso, en el servidor de develop, desde la carpeta del proyecto (/opt/ironsavage):
#   ./scripts/limpiar-develop.sh
#
# Pasos: copia de seguridad (scripts/backup.sh) → SQL en una transacción → borrado
# de archivos → reinicio de Vendure y recreación de la tienda (para vaciar su caché).
# Si la copia o el SQL fallan, se detiene sin tocar nada más.

set -euo pipefail
cd "$(dirname "$0")/.."

DC=(docker compose -f docker-compose.prod.yml -f docker-compose.dev-server.yml --env-file .env.prod)

if [ ! -f docker-compose.dev-server.yml ] || [ ! -f .env.prod ]; then
    echo "Ejecútalo en la carpeta del proyecto del servidor de desarrollo." >&2
    exit 1
fi

read -r -p "Esto BORRA clientes, pedidos, facturas y catálogo de develop. Escribe 'develop' para seguir: " respuesta
[ "$respuesta" = "develop" ] || { echo "Cancelado."; exit 1; }

echo "== 1/4 Copia de seguridad =="
COMPOSE_FILE=docker-compose.prod.yml ./scripts/backup.sh

echo "== 2/4 Limpieza de la base de datos =="
"${DC[@]}" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -v confirmar=develop' < scripts/sql/limpiar-develop.sql

echo "== 3/4 Borrado de archivos de imágenes y facturas eliminadas =="
lista=$(mktemp)
"${DC[@]}" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "SELECT ruta FROM limpieza_archivos"' > "$lista"
echo "$(wc -l < "$lista") archivos"
"${DC[@]}" exec -T vendure-server sh -c 'cd /app/apps/server/static && while IFS= read -r f; do rm -f -- "$f"; done && rm -rf assets/cache' < "$lista"
rm -f "$lista"
"${DC[@]}" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DROP TABLE limpieza_archivos"'

echo "== 4/4 Reinicio de Vendure y de la tienda =="
"${DC[@]}" restart vendure-server vendure-worker
"${DC[@]}" up -d --force-recreate storefront

echo "Hecho. La siguiente factura de prueba será A-000001."
