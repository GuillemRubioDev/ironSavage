# syntax=docker/dockerfile:1.7
#
# MUST be built with the monorepo ROOT as build context (not
# apps/storefront/): `docker build -f apps/storefront/Dockerfile .` from the
# repo root — same reasoning as apps/server/Dockerfile.
#
# IMPORTANT: `next build` prerenders pages at build time, and several of
# them (e.g. /carrito, /noticias/[slug]) fetch from the Vendure Shop API
# while doing so — this image's build step needs VENDURE_SHOP_API_URL to
# actually be reachable, not just set. In docker-compose.prod.yml this means
# building on the same network as an already-running vendure-server, after
# it's healthy — not a cold, network-isolated `docker compose build`. See
# the "problemas encontrados" note in the Fase 15 report for why.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/storefront/package.json apps/storefront/package.json
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/storefront apps/storefront
# Only NEXT_PUBLIC_* values are actually baked into the client bundle;
# everything else the app reads is a normal runtime env var (see
# docker-compose.prod.yml) and does not need to be present at build time.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SITE_NAME
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_NAME=$NEXT_PUBLIC_SITE_NAME
# Real values, read at build time by the prerendering step described above.
ARG VENDURE_SHOP_API_URL
ARG VENDURE_CHANNEL_TOKEN
ENV VENDURE_SHOP_API_URL=$VENDURE_SHOP_API_URL
ENV VENDURE_CHANNEL_TOKEN=$VENDURE_CHANNEL_TOKEN
# Read by next.config.ts to allow next/image to load product images served
# from the public Vendure asset URL (ASSET_URL_PREFIX) — see that file.
ARG API_DOMAIN
ENV API_DOMAIN=$API_DOMAIN
RUN npm run build -w storefront

# ---- runtime ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
WORKDIR /app
# Next.js standalone output lives under the workspace's own .next/ (i.e.
# apps/storefront/.next/standalone/, not /app/.next/standalone/), and *within*
# that traced output the path is mirrored again relative to the monorepo
# root it detected (.../standalone/apps/storefront/server.js) — copying its
# contents to /app reproduces node_modules + apps/storefront/server.js
# alongside each other, matching how the runtime CMD below expects to find
# them. Deliberately omits .next/static and public/, which standalone mode
# never includes — those are copied in separately, same as Next's own
# documented standalone deployment recipe.
COPY --from=build --chown=nextjs:nextjs /app/apps/storefront/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /app/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=build --chown=nextjs:nextjs /app/apps/storefront/public ./apps/storefront/public
USER nextjs
EXPOSE 3001
ENV PORT=3001
# Next's standalone server.js binds to $HOSTNAME if set, defaulting to
# 0.0.0.0 only when it's unset — but Docker always sets HOSTNAME to the
# container ID, so without this override it silently binds to just that
# container's own IP instead of all interfaces, making it unreachable via
# `localhost` (breaks the healthcheck) even though other containers can
# still reach it by service name (that name happens to resolve to the same
# IP it bound to).
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/storefront/server.js"]
