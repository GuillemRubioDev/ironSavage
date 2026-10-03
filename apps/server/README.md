# tienda suple

Proyecto generado con [`@vendure/create`](https://github.com/vendurehq/vendure/tree/master/packages/create).

Enlaces útiles:

- [Documentación de Vendure](https://www.vendure.io/docs)
- [Comunidad de Vendure en Discord](https://www.vendure.io/community)
- [Vendure en GitHub](https://github.com/vendurehq/vendure)
- [Plantilla de plugin de Vendure](https://github.com/vendurehq/plugin-template)

## Estructura de carpetas

* `/src` contiene el código fuente del servidor Vendure. Todo el código propio y los plugins van aquí.
* `/static` contiene archivos estáticos (no código), como los recursos subidos (p. ej. imágenes), los PDF de factura y
  los emails generados en modo desarrollo.

## Desarrollo

```
npm run dev
```

arranca el servidor Vendure, el [worker](https://www.vendure.io/docs/developer-guide/vendure-worker/) y el dashboard.

## Build

```
npm run build
```

compila el código TypeScript y el dashboard en la carpeta `/dist`.

## Producción

El despliegue de producción de este proyecto está descrito en [`DOCKER_PRODUCTION.md`](../../DOCKER_PRODUCTION.md) y
[`PRODUCTION_OPERATIONS.md`](../../PRODUCTION_OPERATIONS.md), en la raíz del monorepo. Lo de abajo es la referencia
genérica de Vendure.

### Ejecutar directamente

Se pueden ejecutar los archivos compilados con el script `start`:

```
npm run start
```

También se puede usar un gestor de procesos como [pm2](https://pm2.keymetrics.io/) para ejecutar y vigilar los
procesos del servidor y del worker.

### Con Docker

El [Dockerfile](./Dockerfile) de esta carpeta se construye **desde la raíz del monorepo** (ver el comentario al
principio del propio Dockerfile):

```
docker build -f apps/server/Dockerfile -t vendure .
```

Esto construye una imagen con el nombre "vendure". Después se puede ejecutar con:

```
# Servidor
docker run -dp 3000:3000 -e "DB_HOST=host.docker.internal" --name vendure-server vendure npm run start:server

# Worker
docker run -dp 3000:3000 -e "DB_HOST=host.docker.internal" --name vendure-worker vendure npm run start:worker
```

Qué hace cada parte del comando:

- `docker run`: ejecuta la imagen creada con `docker build`.
- `-dp 3000:3000`: `-d` la ejecuta en segundo plano («detached»), sin ocupar la terminal. `-p 3000:3000` expone el
  puerto 3000 del contenedor (en el que escucha Vendure por defecto) como puerto 3000 de tu máquina.
- `-e "DB_HOST=host.docker.internal"`: `-e` define variables de entorno. Aquí `DB_HOST` apunta a un nombre DNS especial
  que crea Docker Desktop y que apunta a la IP de tu máquina. `host.docker.internal` solo existe en Docker Desktop, así
  que solo sirve para desarrollo.
- `--name vendure-server`: un nombre legible para el contenedor.
- `vendure`: la etiqueta puesta al construir la imagen.
- `npm run start:server`: el comando que se ejecuta dentro del contenedor.

### Docker Compose

El archivo [docker-compose.yml](./docker-compose.yml) incluye la configuración de servicios habituales como
PostgreSQL, MySQL, MariaDB, Elasticsearch y Redis.

Para usar Docker Compose hace falta tener Docker instalado. Instrucciones para
[Mac](https://docs.docker.com/desktop/install/mac-install/), [Windows](https://docs.docker.com/desktop/install/windows-install/)
y [Linux](https://docs.docker.com/desktop/install/linux/).

Los servicios se arrancan con:

```shell
docker-compose up <servicio>

# ejemplos:
docker-compose up postgres_db
docker-compose up redis
```

## Plugins

En Vendure, la funcionalidad propia va en [plugins](https://www.vendure.io/docs/plugins/), dentro de la carpeta
`./src/plugins`.

Para crear un plugin nuevo:

```
npx vendure add
```

y elige `[Plugin] Create a new Vendure plugin`.

## Migraciones

Las [migraciones](https://www.vendure.io/docs/developer-guide/migrations/) permiten actualizar el esquema de la base de
datos de forma segura. Hacen falta cada vez que se cambia la configuración de `customFields` o se definen entidades
nuevas en un plugin.

El procedimiento de este proyecto está en [`docs/database-migrations.md`](../../docs/database-migrations.md). En
resumen, para generar una migración nueva:

```
npx vendure migrate --generate NombreDescriptivo
```

El archivo generado queda en `./src/migrations/` y debe subirse al repositorio. En el siguiente arranque del servidor,
la función `runMigrations()` de [index.ts](./src/index.ts) aplica las migraciones pendientes de esa carpeta.

En este proyecto `dbConnectionOptions.synchronize` está desactivado y **no debe activarse**: actualizaría el esquema
solo en cada arranque, sin migraciones, y puede perder datos de producción.

---

También se pueden aplicar las migraciones pendientes a mano, sin arrancar el servidor, con `npx vendure migrate --run`.

---

## Resolución de problemas

### Error: Could not load the "sharp" module using the \[OS\]-x\[Architecture\] runtime al arrancar el servidor Vendure

- Comprueba que tu versión de Node es ^18.17.0 || ^20.3.0 || >=21.0.0, necesaria para la librería Sharp.
- Comprueba que tu gestor de paquetes está actualizado.
- **No recomendado**: si nada de lo anterior lo soluciona, instala sharp indicando el sistema operativo y la
  arquitectura de tu máquina. Por ejemplo: `pnpm install sharp --config.platform=linux --config.architecture=x64` o
  `npm install sharp --os linux --cpu x64`

### El Dashboard se ve un instante (login o ya autenticado) y luego se queda en blanco, sin errores en consola ni en la pestaña Network

**Síntoma:** al abrir `/dashboard` (tanto en `vendure dev server`/`dev dashboard` como en el build de producción), la pantalla carga brevemente y ~300-400ms después se queda completamente en blanco (`<div id="app"></div>` vacío). No aparece ningún error en la consola del navegador ni ninguna petición en rojo en Network — parece un cuelgue silencioso.

**Causa raíz:** es un bug del propio paquete `@vendure/dashboard` (confirmado en la v3.7.2; reproducible incluso sin ninguna extensión propia activa). El hook `useDashboardExtensions()` se invoca desde dos sitios distintos de forma independiente (`App` y, indirectamente, `InnerApp` a través de `useExtendedRouter`), cada uno con su propio `useState(false)`. El segundo sitio (`InnerApp`) suele terminar de resolver un poco más tarde que el primero, y ese cambio hace que `useExtendedRouter` reconstruya una instancia completamente nueva del router justo cuando la página ya se estaba mostrando. `RouterProvider` desmonta entonces todo el árbol sin lanzar ningún error ni volver a ejecutar `beforeLoad`.

**Solución aplicada:** parcheado el paquete con [`patch-package`](https://www.npmjs.com/package/patch-package) — ver `patches/@vendure+dashboard+3.7.2.patch` en la raíz del monorepo. El parche:
- hace que el estado de "extensions loaded" de `useDashboardExtensions()` se comparta entre todos los sitios que lo usan (una sola carga real, no una por componente) — este es el arreglo real;
- memoiza los objetos `context` pasados a `RouterProvider` en `auth.tsx` y `main.tsx` (refuerzo adicional, no la causa raíz, pero evita revalidaciones de ruta innecesarias).

El script `postinstall` del `package.json` raíz ejecuta `patch-package` automáticamente, así que el arreglo se reaplica solo tras cada `npm install`. **Si el bug reaparece después de actualizar `@vendure/dashboard` a una versión nueva**: lo primero es comprobar si esa versión ya lo arregla en origen (mirar el CHANGELOG de Vendure); si no, el parche probablemente ya no aplica limpio contra los nuevos archivos y habrá que regenerarlo repitiendo el mismo arreglo sobre el código nuevo con `npx patch-package @vendure/dashboard --exclude "routeTree\.gen\.ts"` (excluir ese archivo porque es autogenerado y solo mete ruido en el diff).

### Al hacer clic en una ruta de un plugin del Dashboard (ej. Invoices, Home banners) sale "Not Found"

**Síntoma:** las rutas propias definidas por plugins vía `defineDashboardExtension({ routes: [...] })` (p.ej. `/invoices`, `/banners`, `/content-articles`, `/loyalty`) devuelven "Not Found" al navegar, aunque el elemento de menú SÍ aparece en el sidebar y el resto del dashboard funciona con normalidad.

**Causa raíz:** efecto secundario del arreglo del bug anterior (pantalla en blanco). `executeDashboardExtensionCallbacks()` — la función que realmente registra las rutas/pageBlocks/navSections de cada plugin en el router — se disparaba desde un `useEffect` aparte en `App` (app/main.tsx), separado del momento en que `useExtendedRouter` construye el árbol de rutas. Con el bug original, esa desincronización accidentalmente "funcionaba" porque el router se reconstruía una segunda vez más tarde (efecto secundario del propio bug de pantalla en blanco) y para entonces las rutas ya estaban registradas. Al arreglar el bug de la pantalla en blanco (eliminando esa segunda reconstrucción innecesaria), el router pasó a construirse una sola vez, **antes** de que `executeDashboardExtensionCallbacks()` llegara a ejecutarse — así que las rutas de los plugins nunca se añadían.

**Solución aplicada:** (incluida en el mismo parche `patches/@vendure+dashboard+3.7.2.patch`) `executeDashboardExtensionCallbacks()` ahora se ejecuta de forma síncrona, una sola vez, dentro de la misma promesa cacheada de `useDashboardExtensions()` (`use-dashboard-extensions.ts`) — justo antes de marcar las extensiones como cargadas para cualquier consumidor. Esto garantiza que las rutas/pageBlocks/navSections de los plugins ya estén registrados en el momento en que `useExtendedRouter` construye el árbol, sin depender de en qué orden se ejecuten los efectos. Se eliminó la llamada duplicada en `app/main.tsx` para no registrar cada extensión dos veces.

**Nota:** si tras aplicar este arreglo una ruta de un plugin sigue sin funcionar, comprueba primero que la ruta exista realmente — no todos los plugins añaden una página propia (p.ej. `OrderToolsPlugin` solo añade botones sobre la lista de pedidos, no tiene una ruta `/order-tools`), y algunos nombres no coinciden con lo esperado (la ruta de reviews es `/product-reviews`, no `/reviews`).

**Importante para verificar cualquier cambio en este paquete:** `vendure dev server` sirve el dashboard desde el build estático `dist/dashboard` si existe (en vez de código fuente en vivo vía Vite). Si has hecho `npm run build:dashboard -w server` en algún momento, los cambios posteriores en `node_modules/@vendure/dashboard/src` **no se reflejarán** hasta volver a ejecutar ese build — reiniciar el servidor no basta. Para probar cambios rápidamente durante el desarrollo, usa `npm run dev:dashboard -w server` (sirve siempre código fuente en vivo en un puerto Vite aparte, típicamente 5173/5174) y solo reconstruye `dist/dashboard` al final, una vez confirmado el arreglo.

**Cómo diagnosticar si vuelve a pasar algo parecido:** el patrón delator es que el timing coincide con el momento en que `hasSetCustomFieldsMap`/`extensionsLoaded` pasan a `true` la segunda vez tras el primer render estable — se puede confirmar añadiendo un `console.log` temporal en `node_modules/@vendure/dashboard/src/app/main.tsx` (dentro de `InnerApp`) para ver si el objeto `router` cambia de identidad entre renders. **Importante:** `vendure dev dashboard`/`vendure dev server` no recargan en caliente los cambios hechos dentro de `node_modules` — tras editar hay que matar el proceso (puerto 5173/5174 para el dashboard suelto, 3000 para el server principal) y volver a arrancarlo para que se note el cambio.
