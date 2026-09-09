# syntax=docker/dockerfile:1.7
#
# Builds the Vendure server image — also used for the worker container
# (docker-compose.prod.yml overrides CMD to run dist/index-worker.js there)
# and serves the Dashboard (built into dist/dashboard/, served by the same
# process at /dashboard — no separate container needed).
#
# MUST be built with the monorepo ROOT as build context (not apps/server/):
# `docker build -f apps/server/Dockerfile .` from the repo root. npm
# workspaces resolves against the root package-lock.json, so every
# workspace's package.json must be present for `npm ci` to reproduce the
# exact dependency tree the lockfile describes — copying only
# apps/server/package.json would either fail or silently resolve a
# different tree.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/storefront/package.json apps/storefront/package.json
RUN npm ci

# ---- build: compile server + worker (tsc) and the Dashboard (vite) ----
# The Dashboard build statically analyzes vendure-config.ts and each
# plugin's schema extensions to generate its GraphQL types — verified to
# need neither a live server nor a database connection, so it's safe to run
# in this isolated stage. It does, however, *evaluate* vendure-config.ts as
# a module (for that static analysis), which runs the production-safety
# checks in app-environment.ts/production-safety.ts — those intentionally
# require real config (CORS_ORIGIN etc.) outside dev. APP_ENV=dev here is
# build-time only, just to satisfy that check during introspection; it has
# no effect on the runtime image, which gets its real APP_ENV from
# docker-compose.prod.yml.
FROM node:20-alpine AS build
WORKDIR /app
ENV APP_ENV=dev
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/server apps/server
RUN npm run build:server -w server \
 && npm run build:worker -w server \
 && npm run build:dashboard -w server

# ---- prod-deps: a second, dev-dependency-free install for the runtime image ----
# --workspace=server is kept for correctness (it scopes which workspace's
# bin/scripts get linked as the install root) but does NOT prune the
# storefront's dependencies out of this image — verified empirically: `npm
# ci` always installs the full lockfile tree regardless of --workspace, so
# next/@next/react-dom/etc. end up in node_modules here too even though
# nothing in dist/ ever imports them. A real fix (per-workspace pruning)
# needs a different tool (pnpm --filter, turbo prune) or split lockfiles —
# out of scope for this phase; see the Fase 15 report's "problemas
# encontrados" for the accepted ~2.3GB image size this results in.
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/storefront/package.json apps/storefront/package.json
RUN npm ci --omit=dev --workspace=server

# ---- runtime ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
RUN addgroup -S vendure && adduser -S vendure -G vendure
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY apps/server/package.json ./apps/server/package.json
# dist/ contains the compiled server, worker, migrations, AND the Dashboard
# build (vite already outputs there directly — see vite.config.mts) in one
# tree, so a single copy covers all three.
COPY --from=build /app/apps/server/dist ./apps/server/dist
# static/ is where uploaded assets, invoice PDFs, and dev-mode email output
# get written at runtime — created here (not baked with content) so it
# exists with the right ownership before a volume is mounted over it.
RUN mkdir -p apps/server/static && chown -R vendure:vendure /app
USER vendure
WORKDIR /app/apps/server
EXPOSE 3000
CMD ["node", "dist/index.js"]
