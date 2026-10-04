# Instrucciones del proyecto (tienda suple / Iron Savage)

Proyecto generado con `@vendure/create`. El equipo es hispanohablante: los comentarios, la documentación y las
explicaciones del proyecto van en español.

## Estructura del monorepo

- Backend Vendure: `apps/server`
- Storefront Next.js: `apps/storefront`
- Arrancar las dos apps: `npm run dev`
- Arrancar solo el servidor: `npm run dev:server`
- Arrancar solo el storefront: `npm run dev:storefront`
- El código propio del backend va en `apps/server/src/plugins`
- La configuración del backend está en `apps/server/src/vendure-config.ts`
- Los recursos estáticos del backend (imágenes subidas, PDF de factura, emails de desarrollo) están en `apps/server/static`

## Desarrollo con Vendure

- Implementa la funcionalidad propia como plugin de Vendure siempre que se pueda.
- Usa `npx vendure add` para generar plugins, entidades, servicios, extensiones de API y colas de trabajos.
- Lee las variables de entorno en `vendure-config.ts` y pásalas a los plugins con las opciones de `Plugin.init()`.
- Crea las colas de trabajos en `onModuleInit()` u `onApplicationBootstrap()` y reutiliza la cola al añadir trabajos.
- Pasa el `RequestContext` a los servicios de Vendure y a los métodos de `TransactionalConnection` cuando lo tengas.
- No subas valores de `.env` ni datos generados en ejecución.
- No uses `dbConnectionOptions.synchronize: true` con datos de producción.

## Ramas y despliegue

- `master` = producción, `develop` = servidor de desarrollo; cualquier otra rama se prueba solo en local.
- El trabajo nuevo sale de `develop` y vuelve a ella por PR; `develop` pasa a `master` por PR.
- Nunca hagas push directo a `develop` ni a `master`: cada push a ellas despliega (`.github/workflows/deploy.yml`).
- Guía completa: `docs/despliegue.md`.

## Comandos

- Desarrollo: `npm run dev`
- Build: `npm run build`

## Comprobaciones de calidad

- Ejecuta `npm run build` tras cambiar código del backend.
- Ejecuta los tests del paquete o la funcionalidad que hayas cambiado.
