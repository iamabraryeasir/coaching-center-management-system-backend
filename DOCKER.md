# Docker & Container Architecture Guide

This document outlines the container architecture, security design, and operational procedures for running the **Coaching Center Management System Backend** in Dockerized production and development environments.

---

## 1. Architectural Highlights & Best Practices

The container architecture adheres to Cloud Native standards and Senior Software Architecture principles:

- **Multi-Stage Build Pipeline**:
  - `base`: Lightweight `node:22-alpine` equipped with system dependencies (`dumb-init`, `openssl`, `libc6-compat`, `tzdata`).
  - `deps`: Dedicated dependency caching stage running `npm ci`.
  - `builder`: Compiles TypeScript via `tsup`, executes `prisma generate`, and copies EJS email templates.
  - `prod-deps`: Pure production dependency installation (`npm ci --omit=dev`) with fresh Prisma client generation.
  - `dev`: Development target with `tsx watch` for instantaneous hot-reloading when mounted with host volumes.
  - `runner`: Hardened, minimal production runtime container containing solely the compiled `dist/` bundle and production `node_modules`.

- **Security & Least Privilege**:
  - **Non-Root Execution**: Runs under the unprivileged `node` user (UID/GID `1000`) rather than `root`.
  - **Zero Credential Baking**: No secrets, `.env` files, or API credentials exist in container image layers.
  - **PID 1 Signal Handling**: Managed via `dumb-init` to guarantee clean process reaping and transparent forwarding of `SIGTERM` and `SIGINT` signals for graceful shutdown of HTTP, PostgreSQL pool, and Redis connections.

- **Prisma 7 & Engine Hardening on Alpine**:
  - Installs `openssl` and `libc6-compat` required by Prisma's native query and migration engines.
  - Copies `prisma.config.ts` and `prisma/` folder into the runtime stage to enable runtime zero-downtime migration deployments.

- **Zero-Dependency Native Healthchecks**:
  - Utilizes Node.js native `fetch()` to probe `/health` periodically. Eliminates the necessity of installing `curl` or `wget` inside the container image, minimizing the vulnerability attack surface.

- **Timezone Locking**:
  - Configured with `tzdata` and `ENV TZ=Asia/Dhaka` to match the institution's official Bangladesh Standard Time (BST, UTC+6).

---

## 2. File Structure

```text
├── Dockerfile              # Multi-stage production & development container build definition
├── .dockerignore           # Context exclusion rules (prevents build cache bloat & secret leaks)
├── docker-entrypoint.sh    # Pre-flight container bootstrapper (DB probe, auto-migration)
├── docker-compose.yml      # Full production/staging stack (API, PostgreSQL 17, Redis 7)
├── docker-compose.dev.yml  # Local development stack with live volume-bound hot-reloading
├── .env.docker.example     # Docker Compose environment template with inter-service hostnames
└── DOCKER.md               # This architectural reference guide
```

---

## 3. Quickstart: Running with Docker Compose

### 3.1 Production / Staging Evaluation Stack

Spin up the entire stack including PostgreSQL 17, Redis 7, and the compiled Backend API:

```bash
# 1. Copy the Docker environment template (or verify your .env file)
cp .env.docker.example .env

# 2. Build and launch all services in detached mode
docker compose up -d --build

# 3. Stream real-time logs from the API container
docker compose logs -f api

# 4. Inspect container health status
docker compose ps
```

The API will automatically wait for PostgreSQL readiness, run pending Prisma migrations, seed initial administrator credentials, and bind to `http://localhost:5000`.

### 3.2 Local Development with Live Code Reloading

If you prefer developing inside containers with hot-reloading:

```bash
# Launch the development stack (mounts ./src and uses tsx watch)
docker compose -f docker-compose.dev.yml up --build
```

Any code changes saved in `./src` will trigger instant hot-reload inside the container without requiring image rebuilds.

---

## 4. Operational Runbook

### 4.1 Running Prisma Migrations Manually

While migrations run automatically on container startup when `RUN_MIGRATIONS=true`, you can trigger them manually:

```bash
docker compose exec api npx prisma migrate deploy
```

### 4.2 Running Database Seeding

To execute the seed script (`prisma/seed.ts`):

```bash
# In the development stack:
docker compose -f docker-compose.dev.yml exec api npm run prisma:seed
```

### 4.3 Opening Interactive Prisma Studio

To visualize and manage database records through Prisma Studio inside Docker:

```bash
docker compose exec api npx prisma studio --port 5555 --hostname 0.0.0.0
```
Then visit `http://localhost:5555` in your browser.

### 4.4 Accessing the Database Shell

Connect directly to the running PostgreSQL database:

```bash
docker compose exec postgres psql -U postgres -d coaching_management_db
```

### 4.5 Inspecting Redis

Ping or query keys in the Redis container:

```bash
docker compose exec redis redis-cli ping
docker compose exec redis redis-cli keys '*'
```

---

## 5. Standalone Docker Image Build & Run

If deploying to a container registry (e.g. AWS ECR, GCP Artifact Registry, Docker Hub):

```bash
# 1. Build the production image
docker build -t coaching-backend-api:latest .

# 2. Run the standalone container
docker run -d \
  --name coaching-api \
  -p 5000:5000 \
  --env-file .env \
  coaching-backend-api:latest
```

---

## 6. Production Orchestration Checklist (Kubernetes / ECS)

1. **Database Migrations in CI/CD**:
   - In distributed multi-replica environments (e.g., Kubernetes ReplicaSets), disable `RUN_MIGRATIONS=true` in the API Pods.
   - Run migrations as a one-off Kubernetes `Job` or CI/CD deployment stage (`npx prisma migrate deploy`) prior to rolling out new application Pods.
2. **Resource Requests & Limits**:
   - Set container memory limits (recommended baseline: requests `256Mi`, limits `512Mi` or `1Gi`).
   - Set CPU requests (recommended baseline: requests `250m`, limits `1000m`).
3. **Secrets Management**:
   - Inject `DATABASE_URL`, `JWT_ACCESS_SECRET`, `STRIPE_SECRET_KEY`, etc., via Kubernetes Secrets, AWS Secrets Manager, or HashiCorp Vault.
