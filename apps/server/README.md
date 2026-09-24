# tienda suple

This project was generated with [`@vendure/create`](https://github.com/vendurehq/vendure/tree/master/packages/create).

Useful links:

- [Vendure docs](https://www.vendure.io/docs)
- [Vendure Discord community](https://www.vendure.io/community)
- [Vendure on GitHub](https://github.com/vendurehq/vendure)
- [Vendure plugin template](https://github.com/vendurehq/plugin-template)

## Directory structure

* `/src` contains the source code of your Vendure server. All your custom code and plugins should reside here.
* `/static` contains static (non-code) files such as assets (e.g. uploaded images) and email templates.

## Development

```
npm run dev
```

will start the Vendure server, [worker](https://www.vendure.io/docs/developer-guide/vendure-worker/) and Dashboard.

## Build

```
npm run build
```

will compile the TypeScript sources and build the Dashboard into the `/dist` directory.

## Production

For production, there are many possibilities which depend on your operational requirements as well as your production
hosting environment.

### Running directly

You can run the built files directly with the `start` script:

```
npm run start
```

You could also consider using a process manager like [pm2](https://pm2.keymetrics.io/) to run and manage
the server & worker processes.

### Using Docker

We've included a sample [Dockerfile](./Dockerfile) which you can build with the following command:

```
docker build -t vendure .
```

This builds an image and tags it with the name "vendure". We can then run it with:

```
# Run the server
docker run -dp 3000:3000 -e "DB_HOST=host.docker.internal" --name vendure-server vendure npm run start:server

# Run the worker
docker run -dp 3000:3000 -e "DB_HOST=host.docker.internal" --name vendure-worker vendure npm run start:worker
```

Here is a breakdown of the command used above:

- `docker run` - run the image we created with `docker build`
- `-dp 3000:3000` - the `-d` flag means to run in "detached" mode, so it runs in the background and does not take
control of your terminal. `-p 3000:3000` means to expose port 3000 of the container (which is what Vendure listens
on by default) as port 3000 on your host machine.
- `-e "DB_HOST=host.docker.internal"` - the `-e` option allows you to define environment variables. In this case we
are setting the `DB_HOST` to point to a special DNS name that is created by Docker desktop which points to the IP of
the host machine. Note that `host.docker.internal` only exists in a Docker Desktop environment and thus should only be
used in development.
- `--name vendure-server` - we give the container a human-readable name.
- `vendure` - we are referencing the tag we set up during the build.
- `npm run start:server` - this last part is the actual command that should be run inside the container.

### Docker Compose

We've included a [docker-compose.yml](./docker-compose.yml) file which includes configuration for commonly-used
services such as PostgreSQL, MySQL, MariaDB, Elasticsearch and Redis.

To use Docker Compose, you will need to have Docker installed on your machine. Here are installation
instructions for [Mac](https://docs.docker.com/desktop/install/mac-install/), [Windows](https://docs.docker.com/desktop/install/windows-install/),
and [Linux](https://docs.docker.com/desktop/install/linux/).

You can start the services with:

```shell
docker-compose up <service>

# examples:
docker-compose up postgres_db
docker-compose up redis
```

## Plugins

In Vendure, your custom functionality will live in [plugins](https://www.vendure.io/docs/plugins/).
These should be located in the `./src/plugins` directory.

To create a new plugin run:

```
npx vendure add
```

and select `[Plugin] Create a new Vendure plugin`.

## Migrations

[Migrations](https://www.vendure.io/docs/developer-guide/migrations/) allow safe updates to the database schema. Migrations
will be required whenever you make changes to the `customFields` config or define new entities in a plugin.

To generate a new migration, run:

```
npx vendure migrate
```

The generated migration file will be found in the `./src/migrations/` directory, and should be committed to source control.
Next time you start the server, and outstanding migrations found in that directory will be run by the `runMigrations()`
function in the [index.ts file](./src/index.ts).

If, during initial development, you do not wish to manually generate a migration on each change to customFields etc, you
can set `dbConnectionOptions.synchronize` to `true`. This will cause the database schema to get automatically updated
on each start, removing the need for migration files. Note that this is **not** recommended once you have production
data that you cannot lose.

---

You can also run any pending migrations manually, without starting the server via the "vendure migrate" command.

---

## Troubleshooting

### Error: Could not load the "sharp" module using the \[OS\]-x\[Architecture\] runtime when running Vendure server.

- Make sure your Node version is ^18.17.0 || ^20.3.0 || >=21.0.0 to support the Sharp library.
- Make sure your package manager is up to date.
- **Not recommended**: if none of the above helps to resolve the issue, install sharp specifying your machines OS and Architecture. For example: `pnpm install sharp --config.platform=linux --config.architecture=x64` or `npm install sharp --os linux --cpu x64`

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
