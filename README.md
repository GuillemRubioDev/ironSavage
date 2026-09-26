# Iron Savage

Tienda online completa (e-commerce) construida con [Vendure](https://www.vendure.io/) (backend/API) y [Next.js](https://nextjs.org/) (tienda de cara al público), con pasarela de pago Redsys, facturación automática, panel de administración y envío de emails transaccionales.

Este documento explica, paso a paso, cómo arrancar el proyecto **desde cero** en un ordenador nuevo — pensado para alguien que se descarga el repositorio por primera vez y no sabe por dónde empezar.

---

## Índice

1. [Qué es esto, técnicamente](#1-qué-es-esto-técnicamente)
2. [Qué hay que instalar antes de nada](#2-qué-hay-que-instalar-antes-de-nada)
3. [Puesta en marcha paso a paso](#3-puesta-en-marcha-paso-a-paso)
4. [Cómo se usa en el día a día](#4-cómo-se-usa-en-el-día-a-día)
5. [Estructura de carpetas](#5-estructura-de-carpetas)
6. [Poner esto en un servidor real (producción)](#6-poner-esto-en-un-servidor-real-producción)
7. [Solución de problemas comunes](#7-solución-de-problemas-comunes)

---

## 1. Qué es esto, técnicamente

Es un **monorepo** (un único repositorio con dos aplicaciones dentro) que usa *npm workspaces*:

```
Iron Savage/
├── apps/
│   ├── server/       ← Backend: API, base de datos, panel de administración, emails, facturas, pagos
│   └── storefront/   ← Frontend: la web de la tienda que ve el cliente
└── package.json       ← Configuración raíz del monorepo
```

| Pieza | Tecnología | Para qué sirve |
|---|---|---|
| Tienda (storefront) | Next.js 16 / React | La web pública: catálogo, carrito, checkout |
| API + lógica de negocio | Vendure 3.7 (Node.js) | Catálogo, pedidos, pagos, facturación, emails |
| Panel de administración | Vendure Dashboard | Gestionar productos, pedidos, clientes, facturas |
| Tareas en segundo plano | Vendure Worker | Envío de emails, generación de facturas, buscador |
| Base de datos | PostgreSQL 16 | Todos los datos de la tienda |
| Pasarela de pago | Redsys | Cobro con tarjeta |

No hace falta entender todo esto para arrancarlo — solo saber que hay **dos aplicaciones** (`server` y `storefront`) y **una base de datos** (PostgreSQL), y que las tres tienen que estar levantadas a la vez para que la tienda funcione.

---

## 2. Qué hay que instalar antes de nada

Instala esto, en este orden, antes de tocar el proyecto:

### 2.1. Git
Para poder descargar (clonar) el repositorio.
- Windows: https://git-scm.com/download/win
- Mac: viene instalado, o `brew install git`
- Linux: `sudo apt install git` (Ubuntu/Debian)

### 2.2. Node.js — versión 20 (LTS)
Es el motor que ejecuta tanto el backend como el frontend. **Usa exactamente la versión 20**, no una más nueva ni una más vieja — es la misma que usa este proyecto en producción y en las pruebas automáticas.

- Descárgalo de https://nodejs.org — elige la versión **LTS** (ahora mismo la 20.x)
- Comprueba que se instaló bien abriendo una terminal y escribiendo:
  ```bash
  node --version
  # debe empezar por v20.x
  npm --version
  # debe salir un número (npm viene incluido con Node)
  ```

### 2.3. Docker Desktop
Es lo que va a hacer funcionar la base de datos (PostgreSQL) sin tener que instalarla manualmente.

- Windows / Mac: https://www.docker.com/products/docker-desktop/ (instálalo y ábrelo una vez para que arranque el motor de Docker)
- Linux: https://docs.docker.com/engine/install/

Comprueba que funciona:
```bash
docker --version
docker compose version
```

### 2.4. Un editor de código (opcional pero recomendado)
[Visual Studio Code](https://code.visualstudio.com/) — gratuito, es el más usado para este tipo de proyectos.

---

## 3. Puesta en marcha paso a paso

Sigue estos pasos **en orden**, sin saltarte ninguno. Todos los comandos se ejecutan desde una terminal.

### Paso 1 — Descargar el proyecto

```bash
git clone https://github.com/GuillemRubioDev/ironSavage.git
cd ironSavage
```

### Paso 2 — Instalar las dependencias

Un único comando, desde la raíz del proyecto, instala todo lo necesario para las dos aplicaciones a la vez:

```bash
npm install
```

Esto puede tardar unos minutos la primera vez. Es normal.

### Paso 3 — Levantar la base de datos

El proyecto trae ya preparado un PostgreSQL listo para desarrollo, corriendo en Docker:

```bash
cd apps/server
docker compose up -d postgres_db
cd ../..
```

Para comprobar que está corriendo:
```bash
docker ps
# debe aparecer un contenedor con "postgres" en el nombre
```

### Paso 4 — Configurar las variables de entorno

Cada aplicación necesita un archivo `.env` con su configuración (contraseñas, URLs, claves). Hay una plantilla de ejemplo para cada una — hay que copiarla y rellenarla.

**Backend** (`apps/server/.env`):
```bash
cp apps/server/.env.example apps/server/.env
```
Ábrelo con tu editor. Para desarrollo local, la mayoría de valores ya sirven tal cual, pero revisa estos:

| Variable | Valor para desarrollo local |
|---|---|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `6543` |
| `DB_NAME` | `vendure` |
| `DB_USERNAME` | `vendure` |
| `DB_PASSWORD` | `jGT9azVWyRPVK3whzCUKjg` *(la contraseña ya fijada en `apps/server/docker-compose.yml` para el Postgres local — tiene que coincidir exactamente)* |
| `COOKIE_SECRET` | cualquier texto largo y aleatorio, p. ej. `mi-secreto-de-desarrollo-12345` |
| `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD` | el usuario/contraseña con los que entrarás al panel de administración |

El resto de variables (Redsys, email, facturación) ya vienen con valores de prueba que funcionan para desarrollo — no hace falta tocarlas para arrancar la primera vez. Solo serán reales cuando se despliegue en producción (ver [sección 6](#6-poner-esto-en-un-servidor-real-producción)).

**Frontend** (`apps/storefront/.env`):
```bash
cp apps/storefront/.env.example apps/storefront/.env
```
Este ya viene listo para desarrollo local tal cual — no necesita cambios.

### Paso 5 — Crear las tablas de la base de datos y los datos mínimos

```bash
cd apps/server
npx vendure migrate --run
npm run seed
cd ../..
```

- `vendure migrate --run` crea todas las tablas necesarias en la base de datos vacía.
- `npm run seed` crea la configuración comercial mínima para que la tienda funcione: país España, zona, moneda EUR, tipo de IVA, método de envío y método de pago. **No** crea productos ni clientes de ejemplo — la tienda empieza vacía, lista para que se añadan productos reales desde el panel.

Es seguro ejecutar estos dos comandos más de una vez — no duplican nada si ya se habían ejecutado antes.

### Paso 6 — Arrancar todo

Desde la raíz del proyecto:

```bash
npm run dev
```

Esto arranca a la vez: el servidor (API), el worker (tareas en segundo plano), el panel de administración y la tienda. Espera a ver en la terminal que los servicios han arrancado sin errores (puede tardar 20-30 segundos la primera vez).

### Paso 7 — Comprobar que funciona

Abre el navegador en:

| Qué | URL |
|---|---|
| Tienda (storefront) | http://localhost:3001 |
| Panel de administración | http://localhost:3000/dashboard |
| API de la tienda (Shop API) | http://localhost:3000/shop-api |
| API de administración (Admin API) | http://localhost:3000/admin-api |

Entra al panel de administración con el usuario/contraseña que pusiste en `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD` en el paso 4.

**Si todo esto carga sin errores, el proyecto está funcionando correctamente.**

---

## 4. Cómo se usa en el día a día

Una vez hecha la puesta en marcha inicial (pasos 1-5), para volver a trabajar en el proyecto **solo hace falta**:

```bash
# Asegúrate de que la base de datos está levantada
cd apps/server && docker compose up -d postgres_db && cd ../..

# Arranca todo
npm run dev
```

### Arrancar solo una parte

```bash
npm run dev:server       # solo el backend (API + panel + worker)
npm run dev:storefront   # solo la tienda
```

### Compilar para producción (build)

```bash
npm run build
```

### Ejecutar la versión compilada

```bash
npm run start
```

### Ejecutar los tests

```bash
npm run test -w server        # tests del backend
npm run test -w storefront    # tests del frontend
```

### Revisar que el código no tiene errores de tipos

```bash
npx tsc --noEmit -p apps/server/tsconfig.json   # backend
npm run check-types -w storefront                # frontend
```

---

## 5. Estructura de carpetas

```
apps/
├── server/
│   ├── src/
│   │   ├── plugins/          ← Toda la lógica de negocio propia (facturación, Redsys, emails...)
│   │   ├── migrations/       ← Historial de cambios en la base de datos
│   │   ├── seed.ts           ← Script que crea la configuración comercial mínima
│   │   └── vendure-config.ts ← Configuración central de Vendure
│   ├── .env                  ← Variables de entorno del backend (no se sube a git)
│   └── docker-compose.yml    ← Base de datos de desarrollo
│
└── storefront/
    ├── src/
    │   ├── app/               ← Rutas de Next.js (una carpeta por página)
    │   ├── features/          ← Cada funcionalidad de la tienda (carrito, checkout, productos...)
    │   ├── site/               ← Composición de página (qué se ve en cada sitio)
    │   └── platform/          ← Utilidades transversales (i18n, conexión a la API...)
    └── .env                   ← Variables de entorno del frontend (no se sube a git)
```

---

## 6. Poner esto en un servidor real (producción)

Este README cubre solo el desarrollo local. Para desplegar la tienda en un servidor real, con dominio propio, HTTPS y credenciales reales, sigue:

- **[`DOCKER_PRODUCTION.md`](./DOCKER_PRODUCTION.md)** — cómo levantar el stack de producción con Docker Compose (DNS, puertos, variables de entorno reales, cómo arrancar)
- **[`PRODUCTION_OPERATIONS.md`](./PRODUCTION_OPERATIONS.md)** — cómo operar el proyecto ya en producción: backups, logs, diagnóstico de problemas de pago/email

Y si necesitas la lista de lo que hay que contratar (dominio, servidor, email, TPV bancario...) antes de poder desplegar nada, pregúntamelo — ya existe ese documento aparte.

---

## 7. Solución de problemas comunes

### `Error: Could not load the "sharp" module...`
La versión de Node no es compatible. Asegúrate de tener exactamente Node 20 (`node --version`).

### El panel de administración carga y luego se queda en blanco
Bug conocido del paquete `@vendure/dashboard`, ya solucionado con un parche que se aplica solo (`patches/`). Si aparece, prueba a borrar `node_modules` y volver a ejecutar `npm install` — el parche se reaplica automáticamente en el `postinstall`.

### `docker compose up` da un error de puerto ocupado
Algo más en tu ordenador está usando el puerto `6543`. Para ver qué es:
```bash
# Windows (PowerShell)
Get-NetTCPConnection -LocalPort 6543

# Mac/Linux
lsof -i :6543
```

### La tienda no ve productos / el panel dice "sin resultados"
Comprueba que ejecutaste el Paso 5 (migraciones + seed) y que el backend (`npm run dev:server`) está corriendo sin errores en la terminal.

### Los emails no llegan
Es normal en desarrollo: por defecto (`EMAIL_PROVIDER=dev`) los emails no se envían de verdad, se escriben como archivos en `apps/server/static/transactional-emails/`. Para enviarlos de verdad hace falta configurar un proveedor SMTP real (ver `apps/server/.env.example`).

### No sé qué comando ejecutar para "X"
Todos los comandos disponibles están en el archivo `package.json` de la raíz (sección `"scripts"`) y en `apps/server/package.json` / `apps/storefront/package.json` para los específicos de cada aplicación.

---

## Más información

- [Documentación de Vendure](https://docs.vendure.io)
- [Documentación de Next.js](https://nextjs.org/docs)
- [Comunidad de Vendure en Discord](https://vendure.io/community)
