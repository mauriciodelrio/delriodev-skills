---
name: docker
description: >
  Use this skill when generating Dockerfiles, configuring docker-compose for
  local development, implementing dev containers, optimizing images or configuring
  volumes, networking and secrets for Node.js/TypeScript projects. Also when the
  user asks to spin up a development environment with a single command.
---

# Docker & Local Dev

## Agent workflow

1. Use the multi-stage Dockerfile in this skill as the base for every Node.js/TypeScript project
2. Include docker-compose with healthchecks for all services
3. Always generate `.dockerignore` alongside the Dockerfile
4. Follow the Dockerfile rules (layers, alpine, non-root, multi-stage)
5. Validate against the Gotchas section before delivering Docker configuration

---

## Dockerfile — Node.js Multi-Stage

```dockerfile
# ──────────────── BASE ────────────────
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy only lockfile first → dependency cache
COPY pnpm-lock.yaml ./

# ──────────────── DEPS ────────────────
FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ──────────────── BUILD ────────────────
FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client if applicable
RUN npx prisma generate 2>/dev/null || true

RUN pnpm build

# ──────────────── PRODUCTION ────────────────
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Copy only what's needed
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Prisma client if applicable
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

USER appuser

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

---

## Dockerfile Rules

```
1. ALWAYS MULTI-STAGE
   Separate: base → deps → build → production
   Final image only has dist/ + production node_modules.

2. LAYER ORDER = CACHE EFFICIENCY
   Copy lockfile first → install deps → copy code → build
   If only code changes, dependencies are not reinstalled.

3. ALPINE AS BASE
   node:20-alpine (~50MB) vs node:20 (~350MB)
   If you need native deps (sharp, bcrypt): node:20-slim

4. NON-ROOT USER
   NEVER run as root in production.
   Create a dedicated user and use USER before CMD.

5. .dockerignore IS MANDATORY
   node_modules, .git, .env, dist, coverage, .next
   → Reduces build context, prevents secret leaks.

6. DO NOT INSTALL devDependencies IN PRODUCTION
   pnpm install --frozen-lockfile --prod
   Or better: multi-stage where production only receives build deps.

7. HEALTHCHECK DEFINED
   So Docker (and orchestrators) know if the container is healthy.

8. ONE RESPONSIBILITY PER CONTAINER
   ❌ API + Worker + Cron in one container
   ✅ api, worker, scheduler as separate containers
```

---

## .dockerignore

```
node_modules
.git
.gitignore
.env
.env.*
!.env.example
dist
build
coverage
.next
.turbo
*.md
!README.md
.vscode
.DS_Store
docker-compose*.yml
Dockerfile*
```

---

## Docker Compose — Local Development

```yaml
# docker-compose.yml
services:
  # ────── App ──────
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: deps  # Only up to deps for dev (no build)
    command: pnpm dev
    ports:
      - "3000:3000"
      - "9229:9229"  # Debug port
    volumes:
      - .:/app
      - /app/node_modules  # Exclude node_modules from mount
    env_file: .env
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/app_dev
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  # ────── PostgreSQL ──────
  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  # ────── Redis ──────
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # ────── Mail (dev) ──────
  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # Web UI

  # ────── Object Storage (dev) ──────
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"   # Console
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

---

## Compose — Variants

```yaml
# docker-compose.override.yml (auto-merged, dev only)
services:
  api:
    command: pnpm dev:debug  # With inspector
    environment:
      - LOG_LEVEL=debug

# docker-compose.test.yml (for CI/integration tests)
services:
  db:
    environment:
      POSTGRES_DB: app_test
    tmpfs: /var/lib/postgresql/data  # RAM = faster, ephemeral

# Usage:
#   docker compose up                         ← dev (auto-merge override)
#   docker compose -f docker-compose.yml -f docker-compose.test.yml up
```

---

## Dev Containers (VS Code)

```jsonc
// .devcontainer/devcontainer.json
{
  "name": "Node.js Dev",
  "dockerComposeFile": "../docker-compose.yml",
  "service": "api",
  "workspaceFolder": "/app",
  
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "20"
    }
  },
  
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "prisma.prisma"
      ],
      "settings": {
        "editor.formatOnSave": true
      }
    }
  },
  
  "postCreateCommand": "pnpm install",
  "remoteUser": "node"
}
```

---

## Image Optimization

```
TECHNIQUES:
  1. Multi-stage (already covered) → minimal final image
  2. Alpine base → ~50MB vs ~350MB
  3. Aggressive .dockerignore → less context = faster build
  4. COPY order → maximize cache hits
  5. Combine RUN commands → fewer layers
     RUN apk add --no-cache python3 make g++ && \
         pnpm install --frozen-lockfile && \
         apk del python3 make g++

CHECK SIZE:
  docker images --format "{{.Repository}}:{{.Tag}} {{.Size}}"
  
  Target:
    Development image: < 500MB (with devDeps)
    Production image:  < 200MB (runtime only)
    Alpine + minimal:  < 100MB
```

---

## Networking Between Services

```
Docker Compose creates a default network.
Services communicate by SERVICE NAME.

  api → db:5432         (not localhost:5432)
  api → redis:6379      (not localhost:6379)
  api → minio:9000

FROM THE HOST:
  localhost:3000 → api
  localhost:5432 → db
  localhost:6379 → redis

RULE: In .env for development:
  DATABASE_URL=postgresql://postgres:postgres@db:5432/app_dev    ← inside Docker
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_dev ← outside Docker
```

---

## Volumes

```
TYPES:
  Named volumes (persistent data):
    postgres_data:/var/lib/postgresql/data
    → Survive docker compose down
    → Deleted with docker compose down -v

  Bind mounts (code in dev):
    .:/app
    → Your local code is mounted in the container
    → Hot reload works

  node_modules exclusion:
    /app/node_modules (anonymous volume)
    → Avoids conflict between host and container node_modules
    → Especially important on macOS (different filesystem)
```

---

## Secrets in Docker

```
DEVELOPMENT:
  env_file + .env → ok for local

PRODUCTION:
  ❌ NEVER environment variables with secrets in docker-compose
  ❌ NEVER ARG/ENV with secrets in Dockerfile (they remain in layers)
  
  ✅ Docker secrets (Swarm) or secret file mounts
  ✅ AWS Secrets Manager / Vault → app reads at startup
  ✅ BuildKit secrets for build-time:
     RUN --mount=type=secret,id=npmrc,target=/root/.npmrc pnpm install
```

---

## Common Commands

```bash
# Start everything
docker compose up -d

# Start and rebuild
docker compose up -d --build

# View logs
docker compose logs -f api

# Execute command in running container
docker compose exec api pnpm prisma migrate dev

# Run a one-off
docker compose run --rm api pnpm test

# Clean everything (including volumes)
docker compose down -v

# View image sizes
docker system df
```

---

## Gotchas

- Always pin base image version (`node:20-alpine`, never `node:alpine` or `latest`). `latest` images cause non-reproducible builds.
- Never run as root in production. Create a dedicated user and use `USER` before `CMD`.
- `COPY` order matters for cache: lockfile first → install deps → copy code → build. `COPY . .` at the start invalidates all cache.
- In production always use `--frozen-lockfile`. Without a lockfile the build is not reproducible.
- Never put secrets in Dockerfile `ENV`/`ARG` — they remain in image layers. Use BuildKit secrets or runtime injection.
- One container = one process. Never API + Worker + Cron in the same container.
- Without `.dockerignore` the build context includes `node_modules` and `.git` — slow builds and potential secret leaks.
- Always define `healthcheck` in compose. Without it the app starts before the DB is ready.
- Bind mounts only in development, never in production.
- On macOS the anonymous volume `/app/node_modules` is mandatory to avoid filesystem conflicts between host and container.
