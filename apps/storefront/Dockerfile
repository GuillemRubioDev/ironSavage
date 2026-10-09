# syntax=docker/dockerfile:1.7
#
# Hay que construirla con la RAÍZ del monorepo como contexto (no
# apps/storefront/): `docker build -f apps/storefront/Dockerfile .` desde la
# raíz, por el mismo motivo que apps/server/Dockerfile.
#
# IMPORTANTE: `next build` prerenderiza páginas al compilar y varias (p. ej.
# /carrito, /noticias/[slug]) piden datos a la Shop API de Vendure mientras lo
# hace. Este build necesita que VENDURE_SHOP_API_URL sea accesible de verdad, no
# solo que esté definida. En docker-compose.prod.yml eso significa compilar en la
# misma red que un vendure-server ya arrancado y sano, no con un `docker compose
# build` aislado. Ver la nota «problemas encontrados» del informe de la Fase 15.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/storefront/package.json apps/storefront/package.json
# npm instala en apps/storefront/node_modules las versiones propias del workspace
# cuando difieren de las de la raíz (p. ej. recharts, lucide-react, typescript: la
# raíz tiene otras que trae @vendure/dashboard). La etapa build también las copia;
# el mkdir mantiene válido ese COPY si algún día se suben a la raíz.
RUN npm ci && mkdir -p apps/storefront/node_modules

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/storefront apps/storefront
COPY --from=deps /app/apps/storefront/node_modules ./apps/storefront/node_modules
# Solo las variables NEXT_PUBLIC_* se incrustan en el bundle del navegador; el
# resto son variables de entorno normales en ejecución (ver
# docker-compose.prod.yml) y no hacen falta al compilar.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SITE_NAME
# ID de medición de Google Analytics 4 (G-XXXXXXX). Vacío = sin analítica.
ARG NEXT_PUBLIC_GA_ID
# Entorno del servidor (DEPLOY_ENV): "development" muestra el indicador "Develop"
# en la esquina superior izquierda; "production" no muestra nada.
ARG NEXT_PUBLIC_DEPLOY_ENV=production
ENV NEXT_PUBLIC_DEPLOY_ENV=$NEXT_PUBLIC_DEPLOY_ENV
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_NAME=$NEXT_PUBLIC_SITE_NAME
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID
# Valores reales, que lee al compilar el prerenderizado descrito arriba.
ARG VENDURE_SHOP_API_URL
ARG VENDURE_CHANNEL_TOKEN
ENV VENDURE_SHOP_API_URL=$VENDURE_SHOP_API_URL
ENV VENDURE_CHANNEL_TOKEN=$VENDURE_CHANNEL_TOKEN
# Lo lee next.config.ts para que next/image pueda cargar las imágenes de producto
# servidas desde la URL pública de recursos de Vendure (ASSET_URL_PREFIX).
ARG API_DOMAIN
ENV API_DOMAIN=$API_DOMAIN
RUN npm run build -w storefront

# ---- runtime (imagen final) ----
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
WORKDIR /app
# La salida standalone de Next.js está en el .next/ del propio workspace
# (apps/storefront/.next/standalone/, no /app/.next/standalone/) y, *dentro* de
# ella, la ruta se repite respecto a la raíz del monorepo detectada
# (.../standalone/apps/storefront/server.js). Copiar su contenido a /app deja
# node_modules y apps/storefront/server.js uno al lado del otro, que es donde los
# espera el CMD de abajo. No incluye .next/static ni public/, que el modo
# standalone nunca incluye: se copian aparte, como indica la propia receta de
# despliegue standalone de Next.
COPY --from=build --chown=nextjs:nextjs /app/apps/storefront/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /app/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=build --chown=nextjs:nextjs /app/apps/storefront/public ./apps/storefront/public
# Caché de next/image (las versiones AVIF/WebP de cada imagen y ancho). Se monta en
# un volumen (storefront_image_cache en docker-compose.prod.yml) para que no se
# pierda en cada despliegue; la carpeta tiene que existir y ser de nextjs para que
# Docker cree el volumen con ese dueño.
RUN mkdir -p apps/storefront/.next/cache/images && chown -R nextjs:nextjs apps/storefront/.next/cache
USER nextjs
EXPOSE 3001
ENV PORT=3001
# El server.js standalone de Next escucha en $HOSTNAME si está definida, y en
# 0.0.0.0 solo si no lo está. Pero Docker siempre define HOSTNAME con el ID del
# contenedor, así que sin esto escucharía solo en la IP del contenedor y no en
# todas las interfaces: inaccesible por `localhost` (rompe el healthcheck),
# aunque otros contenedores sí lleguen por el nombre del servicio (que resuelve
# justo a esa IP).
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/storefront/server.js"]
