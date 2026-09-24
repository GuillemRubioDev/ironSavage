# Operación en producción — runbook

Guía corta para responder "¿qué falló y qué reviso?" sobre el stack de
`docker-compose.prod.yml`. No sustituye a `DOCKER_PRODUCTION.md` (arranque,
DNS, backups) — este documento es solo para diagnóstico cuando algo va mal.

Todos los comandos asumen que estás en la raíz del repo, con:
```bash
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"
```

## Primero, siempre: ¿está vivo, y qué contenedor falla?

```bash
$COMPOSE ps
```
Columna `STATUS` — busca `unhealthy`, `Restarting` o `Exited`. Esto responde
directamente "¿está viva?" y "¿qué servicio falla?" para los 5 servicios.

Logs de cualquier servicio (stdout/stderr del contenedor, con timestamps):
```bash
$COMPOSE logs -f --tail=200 <servicio>       # postgres | vendure-server | vendure-worker | storefront | caddy
```

Los logs de `vendure-server`/`vendure-worker` llevan un contexto de plugin
entre corchetes (p.ej. `[RedsysPlugin]`, `[TransactionalEmailPlugin]`,
`[InvoicingPlugin]`) — útil para filtrar:
```bash
$COMPOSE logs vendure-server | grep RedsysPlugin
```

---

## A) El storefront devuelve 502

Un 502 lo genera **Caddy** cuando no puede alcanzar `storefront:3001` — el
propio storefront nunca ve la petición, así que el storefront no tendrá
nada en sus logs sobre esto.

1. `$COMPOSE logs -f --tail=100 caddy` — el access log (formato `console`,
   filtra el query param `token`) muestra el `status` y la duración de cada
   request. Un 502 aquí confirma que Caddy no pudo conectar con el upstream.
2. `$COMPOSE ps storefront` — ¿está `unhealthy` o reiniciando?
3. `$COMPOSE logs --tail=100 storefront` — ¿crasheó al arrancar? (fallo de
   build, variable de entorno que falta, etc.)
4. Si `storefront` está `healthy` pero Caddy sigue dando 502 intermitente,
   puede ser el `start_period`/reinicio reciente — revisa `docker inspect
   --format='{{json .State.Health}}' $(docker compose -f docker-compose.prod.yml ps -q storefront)`.

## B) Vendure (server) no está healthy

```bash
$COMPOSE ps vendure-server
$COMPOSE logs --tail=200 vendure-server
```
El healthcheck es `wget http://localhost:3000/health` — pero recuerda que
este endpoint es **liveness únicamente** (proceso HTTP arriba), no confirma
que la base de datos responda (ver sección "Healthchecks" más abajo).

- Si el log muestra errores de conexión a Postgres al arrancar → revisa
  `postgres` primero (sección "PostgreSQL" abajo).
- Si el log muestra un error de migración → `runMigrations` falla antes de
  `bootstrap`; desde este cambio el proceso sale con código de error
  (`process.exit(1)`) en vez de quedarse colgado en silencio — Docker lo
  verá como `Exited` y lo reiniciará según la `restart policy`.
- `unhealthy` con el proceso vivo y sin errores en el log → puede estar
  sobrecargado; revisa `docker stats vendure-server`.

## C) El worker falla (jobs no se procesan)

```bash
$COMPOSE ps vendure-worker
$COMPOSE logs --tail=200 vendure-worker
```
El healthcheck ahora golpea un servidor HTTP real que el propio worker
levanta (`worker.startHealthCheckServer` — capacidad nativa de Vendure,
puerto 3020 interno) en vez de solo comprobar que el proceso existe
(`pgrep`), así que un worker colgado/deadlock ya no pasa el healthcheck
como si estuviera bien.

Para ver qué jobs han fallado (usa la propia cola de jobs de Vendure, sin
nada adicional que mantener): entra al **Dashboard de Vendure**
(`https://$API_DOMAIN/admin`) → sección **System → Job Queue** — lista
nativa de jobs con su `state` (`FAILED`, `RETRYING`, etc.), o vía Admin API:
```graphql
query { jobs(options: { filter: { isSettled: { eq: false } } }) { items { id queueName state progress createdAt } } }
```
Si `vendure-worker` está `Exited`/reiniciando en bucle, revisa el log — el
motivo casi siempre es el mismo que en (B): conexión a BD o config.

## D) Un pago Redsys no aparece

Todo el flujo Redsys registra en el log del `vendure-server` bajo el
contexto `[RedsysPlugin]` — sin loguear la clave secreta ni la firma:
```bash
$COMPOSE logs vendure-server | grep RedsysPlugin
```
Busca, por `orderCode`:
- `"Built Redsys payment form for order <code>"` — el cliente inició el
  pago (se generó el formulario hacia Redsys).
- `"Rejected Redsys notification with invalid signature for order <merchantOrder>"`
  — Redsys llamó al callback pero la firma no validó (revisa
  `REDSYS_SECRET_KEY`/`REDSYS_MERCHANT_CODE`/`REDSYS_TERMINAL` en
  `.env.prod` contra el panel de Redsys).
- `"Redsys notification for unknown merchant order <value>"` — llegó un
  callback con un Ds_Merchant_Order que no corresponde a ningún intento de
  pago propio (no debería ocurrir en condiciones normales).
- `"Redsys notification for unknown order <code>"` — el intento sí se
  reconoce, pero el pedido de Vendure al que apunta ya no existe.
- `"payment approved/declined"` — el pago se procesó; si está `declined`,
  el problema es del lado del banco/tarjeta, no del sistema. Un pedido
  puede tener varios intentos (p.ej. tarjeta rechazada y luego un reintento
  aprobado) — cada intento usa un Ds_Merchant_Order distinto entre sí y
  distinto del código de pedido de Vendure (ver nota más abajo).
- Si no aparece **nada** para ese pedido, Redsys nunca llamó al callback —
  comprueba que `REDSYS_NOTIFICATION_URL` es alcanzable desde fuera
  (`curl -I https://$API_DOMAIN/payments/redsys/notify`, ver
  `DOCKER_PRODUCTION.md`).

> Nota: el valor que Redsys usa como `Ds_Merchant_Order` (y por tanto el que
> aparece en su panel/soporte) **no** es el código de pedido de Vendure —
> Redsys rechaza reutilizar el mismo número en un reintento, así que cada
> intento de pago genera uno nuevo. La tabla `redsys_payment_attempt`
> mapea cada uno de vuelta al pedido real; `redsys_transaction.orderCode`
> ya lo incluye para no tener que hacer el cruce a mano.

Para inspeccionar el registro persistido (sin la firma completa, ya que
`rawResponse` se guarda intencionalmente curado, no el payload íntegro —
recuerda que las columnas son camelCase y necesitan comillas dobles en psql):
```bash
$COMPOSE exec postgres psql -U <DB_USERNAME> -d <DB_NAME> \
  -c 'SELECT "orderCode", "merchantOrder", "responseCode", "approved", "createdAt" FROM redsys_transaction ORDER BY "createdAt" DESC LIMIT 20;'
```

## E) Un email no llega

`EmailLog` registra cada intento (tipo, destinatario, éxito/error,
proveedor) — es la fuente funcional principal, sin tokens ni credenciales:
```bash
$COMPOSE exec postgres psql -U <DB_USERNAME> -d <DB_NAME> \
  -c 'SELECT "type", "recipient", "orderId", "success", "error", "provider", "createdAt" FROM email_log ORDER BY "createdAt" DESC LIMIT 20;'
```
También en el log de `vendure-server` bajo `[TransactionalEmailPlugin]`:
```bash
$COMPOSE logs vendure-server | grep TransactionalEmailPlugin
```
- `"[EMAIL DISABLED] Would send..."` → `EMAIL_ENABLED` está en `false`; no es
  un fallo, es config deliberada (revisa `.env.prod`).
- `"Skipping [tipo] for order X — already sent"` → ya se envió antes
  (idempotencia), no es un fallo.
- Un error de proveedor (SMTP) aparece con el mensaje de error del propio
  proveedor — revisa `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`
  (la contraseña nunca se loguea) y que el proveedor no esté bloqueando la
  IP del servidor.

## F) Una factura no aparece

```bash
$COMPOSE logs vendure-server | grep InvoicingPlugin
```
- Éxito: `"Generated invoice <serie>-<numero> for order <code>"`.
- Fallo (incluye tanto fallo al generar el número como al generar el PDF —
  ambos pasan por el mismo `catch`): `"Failed to generate invoice for order
  <code>: <error>"`. El texto del error indica cuál de los dos fue.
- La factura solo se genera cuando el pedido llega a `PaymentSettled` — si
  el pedido está en otro estado, todavía no debería tener factura (no es un
  fallo).

Ver el registro en el **Dashboard** (`Invoices`, plugin nativo del
proyecto) o vía Admin API (`query { invoices { items { orderCode series
number hasPdf } } }`).

## G) El backup diario falló

`scripts/backup.sh` sale con código **distinto de 0** ante cualquier fallo
(Postgres no responde, dump vacío, verificación de integridad fallida,
archivo estático vacío) y no dejará un archivo a medias con nombre "real"
(usa `.tmp-*` + `mv` solo tras verificar). Comprobación manual:
```bash
./scripts/backup.sh; echo "exit code: $?"
```
Si lo ejecutas por cron, que el propio cron te avise del fallo es lo más
simple posible — nada nuevo que mantener:
```cron
0 3 * * * cd /ruta/al/repo && ./scripts/backup.sh >> /var/log/tienda-backup.log 2>&1 || mail -s "BACKUP FALLIDO tienda-suple" tu@email.com < /var/log/tienda-backup.log
```
(`mail` requiere un MTA local configurado — si no lo tienes, sustituye por
cualquier notificador que ya uses; el punto importante es `|| <algo>` sobre
el código de salida de `backup.sh`, no una herramienta concreta.)

Revisa también que existan backups recientes:
```bash
ls -la backups/postgres/ backups/static/ | tail -5
```

## H) El disco casi se llena

```bash
docker system df -v                 # qué ocupan imágenes/contenedores/volúmenes de Docker
docker exec $(docker compose -f docker-compose.prod.yml ps -q postgres) du -sh /var/lib/postgresql/data
du -sh backups/
df -h /                              # espacio real del filesystem del host
```
Qué ocupa espacio de forma creciente (ver también "Disco" más abajo):
`postgres_data` (BD, crece con pedidos/clientes), `vendure_static` (assets +
PDFs de facturas, crece con catálogo/facturación), `backups/` (crece hasta
el límite de `BACKUP_RETENTION_DAYS`, 14 días por defecto), logs de Docker
(acotados por la política de rotación — ver abajo), `caddy_data`
(certificados, no crece de forma relevante).

Liberar espacio de forma segura si hace falta:
```bash
docker image prune -f          # imágenes de builds antiguos, no las que están en uso
docker builder prune -f        # cache de build de BuildKit
```
**No** borres `backups/postgres`/`backups/static` manualmente sin revisar
antes qué cubre `BACKUP_RETENTION_DAYS` — es tu única copia si el servidor
falla.

---

## Healthchecks: liveness vs readiness

- `postgres`: `pg_isready` — liveness+readiness real (Postgres nativo).
- `vendure-server`: `/health` — **liveness únicamente**. Es el endpoint
  nativo de Vendure y, deliberadamente, no comprueba la BD ni nada externo
  (la propia librería lo documenta como tal — el chequeo de BD vía
  `TypeORMHealthCheckStrategy` está `@deprecated` en Vendure, que recomienda
  exactamente el patrón que ya usa este proyecto: healthchecks a nivel de
  infraestructura/Docker independientes por servicio, no anidados). Si
  `vendure-server` está `healthy` pero Postgres cae *después*, el síntoma
  aparece como errores en el log de `vendure-server`, no como `unhealthy`
  inmediato — por eso el paso (B) de este runbook manda revisar Postgres.
- `vendure-worker`: `/health` en el puerto 3020, vía
  `worker.startHealthCheckServer()` — capacidad nativa de Vendure (desde
  v1.2.0), antes sin usar en este proyecto. Liveness del proceso HTTP del
  worker, no de la cola en sí.
- `storefront`: `wget http://127.0.0.1:3001/` — golpea la home real, así que
  es más bien readiness (si el render fallara por no poder hablar con
  `vendure-server`, esto también fallaría).
- `caddy`: sin healthcheck propio — no lo necesita como consumidor (es el
  único servicio expuesto al exterior); su salud se ve reflejada en el
  `curl` externo de `DOCKER_PRODUCTION.md`.

Endpoint público `/health` de `vendure-server`: responde siempre
`{"status":"ok"}` sin exponer config, stack traces ni credenciales —
correcto para exponerlo tal cual.

## Restart policies

Los 5 servicios usan `restart: unless-stopped` — reinician ante fallo o
reinicio del host, pero no si se paran manualmente (`docker compose stop`).
Ningún servicio usa `restart: always` (que ignoraría una parada manual) ni
depende de una condición que pueda quedar en bucle infinito indefinido sin
visibilidad: los reinicios se ven en `docker compose ps` (columna
`STATUS`/reinicios) y en `docker inspect --format='{{.RestartCount}}'`.

## Rotación de logs de Docker

Todos los servicios usan el driver `json-file` con `max-size: 10m` y
`max-file: 5` (definido una vez como ancla YAML `x-logging` en
`docker-compose.prod.yml`, reutilizada en cada servicio) — tope de 50MB por
servicio, ~250MB en el peor caso con los 5 activos. Evita que un contenedor
ruidoso o en bucle de crash llene el disco, sin perder demasiado historial
de diagnóstico para el volumen actual de la tienda. Verificar:
```bash
docker inspect $(docker compose -f docker-compose.prod.yml ps -q vendure-server) --format='{{json .HostConfig.LogConfig}}'
```

## Correlación

Sin tracing distribuido — no hace falta al volumen de esta tienda. Los
logs ya comparten identificadores estables entre sí para seguir un caso
concreto: `orderCode` (Redsys, facturación, emails), `type`+`recipient`
(emails), `series-number` (facturas). Para seguir un pedido de principio a
fin: `grep <orderCode>` sobre `docker compose logs vendure-server`.

## Alertas

Sin plataforma externa (Datadog/PagerDuty/etc.) — no está justificado para
el volumen inicial de esta tienda; añadiría infraestructura a mantener sin
beneficio claro todavía. **Recomendado para AHORA** (gratis, sin nuevo
servicio, solo cron + lo que ya existe):

| Alerta | Cómo (AHORA) |
|---|---|
| Backup falló | cron con `\|\| notificación` sobre `backup.sh` — ver (G) |
| Contenedor caído/reiniciando en bucle | cron periódico: `docker compose ps --format json \| jq` y avisar si algo no está `running`/`healthy` |
| Disco casi lleno | cron con `df` y un umbral (p.ej. 85%) |
| Redsys/emails fallando repetidamente | `grep -c` periódico sobre los logs (ver D/E) por encima de un umbral |

Estas 4 se pueden montar con un único script de cron + `mail`/webhook a
Slack (un `curl` a un *incoming webhook* es suficiente, sin servicio nuevo)
si se decide implementarlas — no incluido en esta fase por ser
configuración específica del servidor real (destinatario, MTA/webhook), no
código de la aplicación.

**MÁS ADELANTE** (solo si el volumen de tráfico/pagos lo justifica): un
uptime-checker externo ligero y autoalojable (p.ej. Uptime Kuma) para las
CRÍTICAS (storefront/Vendure/Postgres/backup) con notificación push —
un único contenedor adicional, sin agentes en cada servicio. No añadir
antes de que haga falta.

## Disco: qué ocupa cada volumen

| Volumen/ruta | Contenido | Crece con |
|---|---|---|
| `postgres_data` | Base de datos completa | Pedidos, clientes, catálogo |
| `vendure_static` | Assets subidos + PDFs de factura | Catálogo, facturación |
| `backups/` | Dumps + tars de `backup.sh` | Acotado por `BACKUP_RETENTION_DAYS` (14d) |
| `caddy_data` | Certificados TLS | No crece de forma relevante |
| Logs de Docker (`json-file`) | stdout/stderr de cada contenedor | Acotado por `max-size`/`max-file` (ver arriba) |

Comando simple, sin daemon nuevo: `docker system df -v` (Docker) + `df -h`
(host) — suficiente para este volumen; no se justifica un exportador de
métricas de disco dedicado todavía.
