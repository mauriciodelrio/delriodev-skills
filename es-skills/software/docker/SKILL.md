---
name: docker
description: >
  Usa esta skill cuando generes Dockerfiles, configures docker-compose para
  desarrollo local, implementes dev containers, optimices imágenes o configures
  volumes, networking y secrets para proyectos Node.js/TypeScript. También
  cuando el usuario pida levantar un entorno de desarrollo con un solo comando.
---

# Docker & Local Dev

## Flujo de trabajo del agente

1. Usar el Dockerfile multi-stage de esta skill como base para todo proyecto Node.js/TypeScript
2. Incluir docker-compose con healthchecks para todos los servicios
3. Siempre generar `.dockerignore` junto al Dockerfile
4. Seguir las reglas de Dockerfile (capas, alpine, non-root, multi-stage)
5. Validar contra la sección Gotchas antes de entregar configuración Docker

---

## Dockerfile — Node.js Multi-Stage

```dockerfile
# ──────────────── BASE ────────────────
FROM node:20-alpine AS base

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar solo lockfile primero → cache de dependencias
COPY pnpm-lock.yaml ./

# ──────────────── DEPS ────────────────
FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ──────────────── BUILD ────────────────
FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generar Prisma client si aplica
RUN npx prisma generate 2>/dev/null || true

RUN pnpm build

# ──────────────── PRODUCTION ────────────────
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Usuario no-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Copiar solo lo necesario
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Prisma client si aplica
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

USER appuser

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

---

## Reglas de Dockerfile

```
1. MULTI-STAGE SIEMPRE
   Separar: base → deps → build → production
   Imagen final solo tiene dist/ + node_modules de producción.

2. ORDEN DE CAPAS = CACHE EFFICIENCY
   Copiar lockfile primero → instalar deps → copiar código → build
   Si solo cambia código, no reinstala dependencias.

3. ALPINE COMO BASE
   node:20-alpine (~50MB) vs node:20 (~350MB)
   Si necesitas native deps (sharp, bcrypt): node:20-slim

4. USUARIO NO-ROOT
   NUNCA correr como root en producción.
   Crear user dedicado y usar USER antes de CMD.

5. .dockerignore OBLIGATORIO
   node_modules, .git, .env, dist, coverage, .next
   → Reduce contexto de build, evita leak de secrets.

6. NO INSTALAR devDependencies EN PRODUCCIÓN
   pnpm install --frozen-lockfile --prod
   O mejor: multi-stage donde production solo recibe deps de build.

7. HEALTHCHECK DEFINIDO
   Para que Docker (y orquestadores) sepan si el container está sano.

8. UNA RESPONSABILIDAD POR CONTAINER
   ❌ API + Worker + Cron en un container
   ✅ api, worker, scheduler como containers separados
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

## Docker Compose — Desarrollo Local

```yaml
# docker-compose.yml
services:
  # ────── App ──────
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: deps  # Solo hasta deps para dev (no build)
    command: pnpm dev
    ports:
      - "3000:3000"
      - "9229:9229"  # Debug port
    volumes:
      - .:/app
      - /app/node_modules  # Excluir node_modules del mount
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

## Compose — Variantes

```yaml
# docker-compose.override.yml (auto-merged, solo dev)
services:
  api:
    command: pnpm dev:debug  # Con inspector
    environment:
      - LOG_LEVEL=debug

# docker-compose.test.yml (para CI/integration tests)
services:
  db:
    environment:
      POSTGRES_DB: app_test
    tmpfs: /var/lib/postgresql/data  # RAM = más rápido, efímero

# Uso:
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

## Optimización de Imágenes

```
TÉCNICAS:
  1. Multi-stage (ya cubierto) → imagen final mínima
  2. Alpine base → ~50MB vs ~350MB
  3. .dockerignore agresivo → menos contexto = build más rápido
  4. Orden de COPY → maximizar cache hits
  5. Combinar RUN commands → menos layers
     RUN apk add --no-cache python3 make g++ && \
         pnpm install --frozen-lockfile && \
         apk del python3 make g++

VERIFICAR TAMAÑO:
  docker images --format "{{.Repository}}:{{.Tag}} {{.Size}}"
  
  Target:
    Development image: < 500MB (con devDeps)
    Production image:  < 200MB (solo runtime)
    Alpine + minimal:  < 100MB
```

---

## Networking entre Servicios

```
Docker Compose crea una red por defecto.
Los servicios se comunican por NOMBRE del servicio.

  api → db:5432         (no localhost:5432)
  api → redis:6379      (no localhost:6379)
  api → minio:9000

DESDE EL HOST:
  localhost:3000 → api
  localhost:5432 → db
  localhost:6379 → redis

REGLA: En .env para desarrollo:
  DATABASE_URL=postgresql://postgres:postgres@db:5432/app_dev    ← dentro de Docker
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_dev ← fuera de Docker
```

---

## Volumes

```
TIPOS:
  Named volumes (datos persistentes):
    postgres_data:/var/lib/postgresql/data
    → Sobreviven docker compose down
    → Se borran con docker compose down -v

  Bind mounts (código en dev):
    .:/app
    → Tu código local se monta en el container
    → Hot reload funciona

  Exclusión de node_modules:
    /app/node_modules (anonymous volume)
    → Evita conflicto entre node_modules del host y del container
    → Especialmente importante en macOS (filesystem diferente)
```

---

## Secrets en Docker

```
DESARROLLO:
  env_file + .env → ok para local

PRODUCCIÓN:
  ❌ NUNCA variables de entorno con secrets en docker-compose
  ❌ NUNCA ARG/ENV con secrets en Dockerfile (quedan en layers)
  
  ✅ Docker secrets (Swarm) o mount de secret files
  ✅ AWS Secrets Manager / Vault → app lee al startup
  ✅ BuildKit secrets para build-time:
     RUN --mount=type=secret,id=npmrc,target=/root/.npmrc pnpm install
```

---

## Comandos Frecuentes

```bash
# Levantar todo
docker compose up -d

# Levantar y rebuild
docker compose up -d --build

# Ver logs
docker compose logs -f api

# Ejecutar comando en container corriendo
docker compose exec api pnpm prisma migrate dev

# Ejecutar un one-off
docker compose run --rm api pnpm test

# Limpiar todo (volumes incluidos)
docker compose down -v

# Ver tamaño de imágenes
docker system df
```

---

## Gotchas

- Siempre fijar versión de imagen base (`node:20-alpine`, nunca `node:alpine` ni `latest`). Las imágenes `latest` causan builds no reproducibles.
- Nunca correr como root en producción. Crear usuario dedicado y usar `USER` antes de `CMD`.
- El orden de `COPY` importa para cache: lockfile primero → install deps → copiar código → build. `COPY . .` al inicio invalida todo el cache.
- En producción usar `--frozen-lockfile` siempre. Sin lockfile el build no es reproducible.
- Nunca poner secrets en `ENV`/`ARG` del Dockerfile — quedan en image layers. Usar BuildKit secrets o inyección en runtime.
- Un container = un proceso. Nunca API + Worker + Cron en el mismo container.
- Sin `.dockerignore` el build context incluye `node_modules` y `.git` — builds lentos y posible leak de secrets.
- Siempre definir `healthcheck` en compose. Sin él la app arranca antes de que la DB esté lista.
- Bind mounts solo en desarrollo, nunca en producción.
- En macOS el anonymous volume `/app/node_modules` es obligatorio para evitar conflictos de filesystem entre host y container.
