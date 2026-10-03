# syntax=docker/dockerfile:1.7
#
# Construye la imagen del servidor Vendure. Se usa también para el contenedor
# del worker (docker-compose.prod.yml cambia el CMD para ejecutar
# dist/index-worker.js) y sirve el dashboard (compilado en dist/dashboard/ y
# servido por el mismo proceso en /dashboard; no hace falta otro contenedor).
#
# Hay que construirla con la RAÍZ del monorepo como contexto (no apps/server/):
# `docker build -f apps/server/Dockerfile .` desde la raíz. Los workspaces de
# npm se resuelven con el package-lock.json de la raíz, así que deben estar los
# package.json de todos los workspaces para que `npm ci` reproduzca exactamente
# el árbol de dependencias del lockfile. Copiar solo apps/server/package.json
# fallaría o resolvería otro árbol sin avisar.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/storefront/package.json apps/storefront/package.json
# El `postinstall` de la raíz ejecuta patch-package, que aplica patches/ sobre
# node_modules (p. ej. @vendure/dashboard, que se compila en la etapa build).
# Sin este COPY no encuentra los parches y el dashboard de la imagen se compila
# sin parchear, sin avisar.
COPY patches ./patches
# npm no sube todo a la raíz: si un workspace necesita otra versión que la de la
# raíz (p. ej. vite 7.3.6 del servidor), la instala en apps/<workspace>/node_modules.
# La etapa build también copia esas; el mkdir mantiene válido ese COPY si en el
# futuro el lockfile lo sube todo a la raíz.
RUN npm ci && mkdir -p apps/server/node_modules

# ---- build: compila servidor + worker (tsc) y el dashboard (vite) ----
# El build del dashboard analiza vendure-config.ts y las extensiones de esquema
# de cada plugin para generar sus tipos GraphQL. Comprobado: no necesita ni
# servidor arrancado ni base de datos, así que puede ir en esta etapa aislada.
# Eso sí, *evalúa* vendure-config.ts como módulo, lo que ejecuta las
# comprobaciones de app-environment.ts/production-safety.ts, que a propósito
# exigen configuración real (CORS_ORIGIN, etc.) fuera de dev. El APP_ENV=dev de
# aquí es solo para el build, para pasar esa comprobación; no afecta a la imagen
# final, que recibe su APP_ENV real desde docker-compose.prod.yml.
FROM node:20-alpine AS build
WORKDIR /app
ENV APP_ENV=dev
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/server apps/server
# Dependencias anidadas en el workspace (ver la etapa deps): sin ellas el build
# del dashboard ni siquiera carga vite.config.mts ("Cannot find package 'vite'").
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
RUN npm run build:server -w server \
 && npm run build:worker -w server \
 && npm run build:dashboard -w server

# ---- prod-deps: segunda instalación, sin dependencias de desarrollo, para la imagen final ----
# --workspace=server se mantiene por corrección (define qué workspace enlaza sus
# bin/scripts como raíz de la instalación), pero NO quita de la imagen las
# dependencias del storefront. Comprobado: `npm ci` instala siempre el árbol
# completo del lockfile, con o sin --workspace, así que next/@next/react-dom/etc.
# acaban también aquí aunque dist/ no los importe. Arreglarlo de verdad (podar por
# workspace) requiere otra herramienta (pnpm --filter, turbo prune) o lockfiles
# separados; queda fuera de esta fase. Ver «problemas encontrados» del informe de
# la Fase 15, donde se acepta el tamaño de imagen resultante (~2,3 GB).
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/storefront/package.json apps/storefront/package.json
# Aquí se quita el `postinstall` de la raíz (patch-package): es una
# devDependency, así que con --omit=dev no se instala y `npm ci` falla con
# "patch-package: not found". En ejecución no hace falta: el único paquete
# parcheado (@vendure/dashboard) ya está compilado en dist/ por la etapa build.
# Quitar solo este script (en vez de --ignore-scripts) mantiene los scripts de
# instalación de cada dependencia como antes.
RUN npm pkg delete scripts.postinstall \
 && npm ci --omit=dev --workspace=server \
 && mkdir -p apps/server/node_modules

# ---- runtime (imagen final) ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
RUN addgroup -S vendure && adduser -S vendure -G vendure
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY apps/server/package.json ./apps/server/package.json
# Dependencias de producción anidadas en el workspace, si las hay (ver la etapa deps).
COPY --from=prod-deps /app/apps/server/node_modules ./apps/server/node_modules
# dist/ contiene el servidor, el worker y las migraciones compilados, Y el build
# del dashboard (vite ya lo genera ahí, ver vite.config.mts), así que una sola
# copia cubre los tres.
COPY --from=build /app/apps/server/dist ./apps/server/dist
# En static/ se escriben en ejecución los recursos subidos, los PDF de factura y
# los emails del modo dev. Se crea aquí (vacío) para que exista con el
# propietario correcto antes de montar un volumen encima.
RUN mkdir -p apps/server/static && chown -R vendure:vendure /app
USER vendure
WORKDIR /app/apps/server
EXPOSE 3000
CMD ["node", "dist/index.js"]
