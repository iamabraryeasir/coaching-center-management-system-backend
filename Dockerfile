# syntax=docker/dockerfile:1.7

# ==============================================================================
# Coaching Center Management System - Multi-Stage Dockerfile
#
# Stages:
# 1. base      : Alpine Node.js LTS with required system libraries & timezone
# 2. deps      : Clean npm install for build dependencies
# 3. builder   : Generates Prisma Client & bundles TypeScript via tsup
# 4. prod-deps : Production-only node_modules with generated Prisma Client
# 5. dev       : Optional target for local container development with hot-reload
# 6. runner    : Hardened, non-root minimal production runtime
# ==============================================================================

ARG NODE_VERSION=22-alpine

# ------------------------------------------------------------------------------
# Stage 1: Base Runtime Environment
# ------------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base

# Install system dependencies:
# - dumb-init: lightweight PID 1 process supervisor for signal handling (SIGINT/SIGTERM)
# - openssl & libc6-compat: runtime dependencies for Prisma 7 binary engines
# - tzdata: guarantees Bangladesh Standard Time (BST, UTC+6) across all containers
RUN apk add --no-cache \
    dumb-init \
    openssl \
    libc6-compat \
    tzdata

ENV TZ=Asia/Dhaka
WORKDIR /app

# ------------------------------------------------------------------------------
# Stage 2: Development & Build Dependencies
# ------------------------------------------------------------------------------
FROM base AS deps

WORKDIR /app

# Copy dependency manifests for optimal Docker layer caching
COPY package.json package-lock.json ./

# Deterministic install of all dependencies
RUN npm ci

# ------------------------------------------------------------------------------
# Stage 3: Source Compilation & Assets Bundling
# ------------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json tsup.config.ts prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma Client and compile application bundle via tsup (dist/server.js + templates)
RUN npx prisma generate && npm run build

# ------------------------------------------------------------------------------
# Stage 4: Production Dependencies Isolation
# ------------------------------------------------------------------------------
FROM base AS prod-deps

WORKDIR /app

COPY package.json package-lock.json ./

# Install strictly production dependencies and purge cache to minimize image size
RUN npm ci --omit=dev && npm cache clean --force

# Copy Prisma schema and compile production Prisma Client
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npx prisma generate

# ------------------------------------------------------------------------------
# Stage 5: Development Target (Hot Reloading via tsx watch)
# ------------------------------------------------------------------------------
FROM base AS dev

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate

ENV NODE_ENV=development \
    PORT=5000

EXPOSE 5000

CMD ["npm", "run", "dev"]

# ------------------------------------------------------------------------------
# Stage 6: Hardened Production Runner (Default Target)
# ------------------------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production \
    PORT=5000

WORKDIR /app

# Copy production dependencies (including generated Prisma Client)
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules

# Copy compiled production bundle (server.js, source map, ejs templates)
COPY --from=builder --chown=node:node /app/dist ./dist

# Copy Prisma schema and migrations for runtime deployment
COPY --chown=node:node prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node package.json ./

# Copy and configure entrypoint script
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Expose HTTP API Port
EXPOSE 5000

# Container Healthcheck using native Node.js fetch (no external binaries needed)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 5000) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Enforce least privilege execution via non-root system user
USER node

# Supervisor forwards operating system signals cleanly to Node.js
ENTRYPOINT ["/usr/bin/dumb-init", "--", "./docker-entrypoint.sh"]

# Launch production server
CMD ["node", "dist/server.js"]
