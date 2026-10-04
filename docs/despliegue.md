# Ramas, entornos y despliegue

## Resumen

| Rama | Dónde se ejecuta | Cómo llega |
|---|---|---|
| `master` | **Servidor de producción** (la tienda real) | Automático al hacer merge, tras pasar el CI y con aprobación manual |
| `develop` | **Servidor de desarrollo** (pruebas del equipo, con contraseña) | Automático al hacer merge, tras pasar el CI |
| cualquier otra (`feature/...`, `fix/...`) | **El ordenador de cada persona** (`npm run dev`) | No se despliega |

```
feature/mi-cambio ──PR──▶ develop ──(CI ✔)──▶ servidor de desarrollo
                              │
                              └──PR──▶ master ──(CI ✔ + aprobación)──▶ servidor de producción
```

## Flujo de trabajo del día a día

1. Actualiza `develop` y crea tu rama a partir de ella:
   ```bash
   git checkout develop && git pull
   git checkout -b feature/nombre-corto
   ```
2. Trabaja en local con `npm run dev` (ver «Entorno local» más abajo).
3. Sube la rama y abre un **PR contra `develop`**. El CI (`ci.yml` y `build-images.yml`)
   se ejecuta en el PR; no se puede hacer merge si falla.
4. Al hacer merge en `develop`, `deploy.yml` vuelve a pasar el CI y despliega en el
   servidor de desarrollo. Pruébalo allí.
5. Cuando `develop` esté lista para salir, abre un **PR de `develop` a `master`**. Al hacer
   merge, `deploy.yml` pasa el CI y espera la **aprobación** de un revisor del environment
   `production` antes de desplegar en producción.

Correcciones urgentes en producción (`hotfix`): rama desde `master`, PR a `master`, y
después merge de `master` en `develop` para no perder el arreglo.

Nunca se hace push directo a `develop` ni a `master` (la protección de ramas lo impide,
ver más abajo).

## Entorno local (resto de ramas)

Cada persona trabaja con su propia base de datos y su propio `.env`, nunca con los
servidores:

```bash
npm install
cd apps/server && docker compose up -d postgres_db && cd ../..   # Postgres local
cp apps/server/.env.example apps/server/.env                     # y rellénalo
npm run dev                                                      # servidor + storefront
```

La primera vez, o para empezar con una base de datos vacía, sigue «Crear una base de
datos completamente nueva» en [database-migrations.md](database-migrations.md).

## Cómo funciona el despliegue

- [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) se dispara con cada push a
  `develop` o `master` (y a mano desde la pestaña Actions). Primero ejecuta el CI completo
  y, si pasa, entra por SSH en el servidor del environment que toca.
- En el servidor se ejecuta [`scripts/deploy.sh`](../scripts/deploy.sh), tomado de la propia
  rama que se despliega. El script:
  1. comprueba que la rama es la del servidor (`DEPLOY_BRANCH` en su `.env.prod`), así
     producción nunca recibe `develop` por error;
  2. en producción, hace copia de seguridad con `scripts/backup.sh`;
  3. deja el repositorio en el commit exacto;
  4. construye y arranca los contenedores en el orden de [DOCKER_PRODUCTION.md](../DOCKER_PRODUCTION.md)
     (las migraciones se aplican solas al arrancar el servidor).
- Hay unos segundos sin servicio mientras se recrea el contenedor del servidor.
- El servidor de desarrollo añade `docker-compose.dev-server.yml`, que cambia Caddy por
  [`Caddyfile.dev`](../Caddyfile.dev): la tienda pide usuario y contraseña y las dos webs
  envían `X-Robots-Tag: noindex`. La API queda sin contraseña para que lleguen las
  notificaciones de Redsys.

### Volver a una versión anterior

En el servidor, con un commit que ya esté en la rama:

```bash
cd /opt/ironsavage
./scripts/deploy.sh master <sha-anterior>
```

Las migraciones de base de datos no se deshacen solas: si el problema es una migración,
restaura la copia previa al despliegue con `scripts/restore.sh` (ver `backups/postgres/`).

## Conectar a la base de datos de desarrollo (DBeaver, psql…)

En el servidor de desarrollo, Postgres escucha en `127.0.0.1:5432`: solo es accesible desde el
propio servidor, nunca desde internet. Se conecta con un **túnel SSH** que pasa por el usuario
`deploy` con tu clave.

En DBeaver: **Nueva conexión → PostgreSQL**.

- Pestaña **SSH**: marca *Use SSH Tunnel*.
  - Host: la IP del servidor · Puerto: `22` · Usuario: `deploy`
  - Autenticación: *Public Key* · Clave privada: tu clave SSH del servidor (p. ej. `~/.ssh/ironsavage_dev`)
- Pestaña **Principal**:
  - Host: `localhost` · Puerto: `5432`
  - Base de datos, usuario y contraseña: `DB_NAME`, `DB_USERNAME` y `DB_PASSWORD` del `.env.prod` del servidor.

Con psql, abre primero el túnel y conecta a tu puerto local:

```bash
ssh -N -L 15432:127.0.0.1:5432 deploy@<ip-del-servidor>
psql -h localhost -p 15432 -U vendure vendure
```

Es la base de datos del entorno de desarrollo: lo que cambies se ve en la tienda de desarrollo.
En producción Postgres **no** se publica; si algún día hace falta, mejor con un usuario de solo lectura.

## Preparar un servidor (una vez por servidor)

Lo mismo para desarrollo y producción; cambian el `.env.prod` y los dominios.

**Recomendado:** desarrollo con 2 vCPU y 4 GB de RAM (el `next build` necesita memoria),
producción con 4 vCPU y 8 GB. Ubuntu 24.04 LTS.

1. **DNS:** registros A/AAAA de los dos dominios del servidor apuntando a su IP. Por ejemplo:
   - producción: `tienda.tudominio.es` y `api.tudominio.es`
   - desarrollo: `dev.tudominio.es` y `api-dev.tudominio.es`
2. **Docker** y git:
   ```bash
   curl -fsSL https://get.docker.com | sh
   apt-get install -y git
   ```
3. **Usuario de despliegue** (sin contraseña, solo con clave):
   ```bash
   adduser --disabled-password --gecos "" deploy
   usermod -aG docker deploy
   ```
4. **Cortafuegos:** abrir solo 22, 80 y 443.
   ```bash
   ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
   ```
5. **Acceso de GitHub Actions al servidor.** En tu ordenador, genera un par de claves
   exclusivo para ese servidor:
   ```bash
   ssh-keygen -t ed25519 -C "github-deploy-dev" -f deploy_dev -N ""
   ```
   Copia `deploy_dev.pub` en `/home/deploy/.ssh/authorized_keys` del servidor. La privada
   (`deploy_dev`) irá al secreto `DEPLOY_SSH_KEY` de GitHub; después bórrala de tu ordenador.
6. **Acceso del servidor al repositorio** (el repo es privado). Como `deploy`:
   ```bash
   ssh-keygen -t ed25519 -C "ironsavage-servidor" -f ~/.ssh/id_ed25519 -N ""
   cat ~/.ssh/id_ed25519.pub
   ```
   Añade esa clave pública en GitHub → repo → Settings → **Deploy keys** (solo lectura).
7. **Clonar** (como `deploy`):
   ```bash
   sudo mkdir -p /opt/ironsavage && sudo chown deploy:deploy /opt/ironsavage
   git clone git@github.com:GuillemRubioDev/ironSavage.git /opt/ironsavage
   ```
8. **`.env.prod`:** `cp .env.prod.example .env.prod` y rellénalo con los valores de ese
   servidor (ver la tabla siguiente). Nunca se sube al repositorio.
9. **Primer despliegue** a mano, para ver que todo arranca:
   ```bash
   cd /opt/ironsavage
   ./scripts/deploy.sh develop     # o master en producción
   ```
10. **Configuración comercial mínima** (solo la primera vez, es idempotente):
    ```bash
    docker compose -f docker-compose.prod.yml --env-file .env.prod exec vendure-server node dist/seed.js
    ```

### Diferencias del `.env.prod` entre servidores

| Variable | Desarrollo | Producción |
|---|---|---|
| `DEPLOY_ENV` / `DEPLOY_BRANCH` | `development` / `develop` | `production` / `master` |
| `APP_ENV` | `test` | `production` |
| `PUBLIC_DOMAIN` / `API_DOMAIN` | dominios de desarrollo | dominios reales |
| `REDSYS_*` | comercio de pruebas, `REDSYS_ENVIRONMENT=test` | datos del banco, `REDSYS_ENVIRONMENT=production` |
| `EMAIL_PROVIDER` | `dev`, o SMTP de pruebas (p. ej. Mailtrap) | `smtp` real |
| `NEXT_PUBLIC_GA_ID` | vacío | ID real de GA4 |
| `DEV_BASIC_AUTH_USER` / `DEV_BASIC_AUTH_HASH` | usuario y hash de la contraseña del equipo | no se usan |
| Secretos (`COOKIE_SECRET`, `DB_PASSWORD`, `SUPERADMIN_PASSWORD`, `REVALIDATION_SECRET`…) | propios | propios y **distintos** de desarrollo |

El hash de la contraseña de desarrollo se genera con
`docker run --rm caddy:2-alpine caddy hash-password --plaintext 'la-contraseña'`, y en el
`.env.prod` cada `$` se escribe `$$`.

**Datos personales:** no copies la base de datos de producción a desarrollo sin
anonimizarla antes (RGPD). Desarrollo trabaja con datos de prueba.

## Configurar GitHub (una vez)

Todo en el repositorio → **Settings**.

### Environments

Settings → Environments → crear `development` y `production`.

En **cada uno**, añade estos secretos (Environment secrets):

| Secreto | Valor |
|---|---|
| `DEPLOY_HOST` | IP o nombre del servidor |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_PATH` | `/opt/ironsavage` |
| `DEPLOY_PORT` | (opcional) puerto SSH si no es 22 |
| `DEPLOY_SSH_KEY` | la clave **privada** del paso 5 (todo el contenido del archivo) |
| `DEPLOY_KNOWN_HOSTS` | salida de `ssh-keyscan -H <ip-del-servidor>` ejecutado desde tu ordenador |

Mientras un environment no tenga estos secretos, el workflow se salta el despliegue con un
aviso en vez de fallar.

En `production`, además:
- **Required reviewers:** añade a quien deba aprobar cada salida a producción.
- **Deployment branches:** «Selected branches» → solo `master`.

En `development`: **Deployment branches** → solo `develop`.

### Protección de ramas

Settings → Branches (o Rules → Rulesets) → una regla para `master` y otra para `develop`:
- Require a pull request before merging.
- Require status checks to pass → `Typecheck, tests, builds` (CI) y
  `Build vendure + storefront images`.
- Block force pushes y no permitir borrar la rama.

### Rama por defecto

Puede seguir siendo `master`. Si se prefiere que los PR se abran contra `develop` por
defecto, cámbiala a `develop` en Settings → General → Default branch.
