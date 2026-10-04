# Docker de producción (local verification)

Stack: `postgres` (privado) → `vendure-server` + `vendure-worker` (privados,
sólo red interna) → `storefront` (privado) → `caddy` (único servicio público,
80/443). Ver `docker-compose.prod.yml` y `Caddyfile`.

## DNS necesarios (producción real)

Dos registros A/AAAA apuntando a la IP del servidor, antes de arrancar:

- `PUBLIC_DOMAIN` (ej. `tienda.example.com`) → storefront
- `API_DOMAIN` (ej. `api.tienda.example.com`) → Vendure (Shop API, Admin API, Dashboard)

Caddy pide certificados Let's Encrypt para ambos automáticamente en el primer
arranque — sin DNS resuelto, esa petición fallará (reintenta solo, no bloquea
el resto del stack).

## Puertos a abrir en el servidor

Solo **80** y **443** (el proxy). Todo lo demás (`5432`, `3000`, `3001`) es
exclusivamente interno a la red Docker `tienda-net` — ningún otro puerto debe
abrirse en el firewall.

## Variables a configurar

Copiar `.env.prod.example` → `.env.prod` (nunca se commitea) y rellenar, como
mínimo: `PUBLIC_DOMAIN`, `API_DOMAIN`, `CADDY_EMAIL`, `CORS_ORIGIN`,
`STOREFRONT_URL`, `ASSET_URL_PREFIX`, `REDSYS_NOTIFICATION_URL`,
`NEXT_PUBLIC_SITE_URL` (todas deben usar `https://` + el dominio real, no
`localhost`), más los secretos (`DB_PASSWORD`, `COOKIE_SECRET`,
`SUPERADMIN_PASSWORD`, `REDSYS_SECRET_KEY` reales, SMTP).

## Cómo arrancar

En los servidores reales esto lo hace `scripts/deploy.sh` en cada despliegue (ver
[docs/despliegue.md](docs/despliegue.md)). Estos son los pasos a mano:

```bash
cp .env.prod.example .env.prod   # y rellenar valores reales
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d postgres vendure-server vendure-worker
# esperar a que vendure-server esté healthy
DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 docker compose -f docker-compose.prod.yml --env-file .env.prod build storefront
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d storefront caddy
```

No es un único `docker compose up -d --build`: `next build` prerenderiza
páginas haciendo fetch real al Shop API, así que necesita `vendure-server` ya
arrancado y sano.

## Comprobar HTTPS

```bash
curl -Iv https://$PUBLIC_DOMAIN/
curl -Iv https://$API_DOMAIN/health
```
Debe devolver un certificado válido (Let's Encrypt en producción real).

## Comprobar que HTTP redirige a HTTPS

```bash
curl -I http://$PUBLIC_DOMAIN/
# Location: https://$PUBLIC_DOMAIN/  (301/308)
```

## Comprobar que storefront/API funcionan

```bash
curl -I https://$PUBLIC_DOMAIN/
curl https://$API_DOMAIN/shop-api -X POST -H 'content-type: application/json' -d '{"query":"{__typename}"}'
```

## Comprobar que Redsys puede alcanzar el callback

`REDSYS_NOTIFICATION_URL` (`https://$API_DOMAIN/payments/redsys/notify`) debe
ser accesible desde fuera antes de operar en `REDSYS_ENVIRONMENT=production`:

```bash
curl -I https://$API_DOMAIN/payments/redsys/notify
```
(un 404/405 es correcto — confirma que la ruta es alcanzable; Redsys hace un
POST real que el plugin sí procesa).

## Detener

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod down       # conserva volúmenes
docker compose -f docker-compose.prod.yml --env-file .env.prod down -v    # también borra datos (solo pruebas)
```

## Datos a respaldar

`postgres_data` (BD completa) y `vendure_static` (assets/facturas). `caddy_data`
guarda los certificados TLS — perderlo fuerza una reemisión (no crítico, pero
evitable).

Backup y restore: `scripts/backup.sh` / `scripts/restore.sh` (Fase 16.4).
Ejecutar `./scripts/backup.sh` con este mismo `docker-compose.prod.yml` y
`.env.prod` — no requiere PostgreSQL instalado en el host, todo corre vía
`docker compose exec`/`run`. Ver el informe de la Fase 16.4 para la prueba
real destroy→restore.

## Pendiente para producción real

- Backup off-site: por ahora `backups/` queda solo en este mismo servidor.
  Un backup que solo vive en el mismo servidor NO protege frente a la
  pérdida total del servidor — copiar `backups/` a almacenamiento externo
  (S3, Backblaze B2, otro host) en algún punto es un pendiente deliberado,
  no implementado todavía.
- `caddy` corre como root (imagen oficial) para poder enlazar 80/443 y
  gestionar certificados en `/data` — no forzado a no-root por la complejidad
  que añadiría (capabilities/setcap) frente al beneficio; `vendure-server`,
  `vendure-worker` y `storefront` sí corren sin privilegios.
- Verificado localmente con dominios `*.localhost` (Caddy usa su CA interna
  automáticamente ahí, sin tocar la config de producción) — la emisión real
  de Let's Encrypt solo se puede probar con DNS público apuntando al servidor.
