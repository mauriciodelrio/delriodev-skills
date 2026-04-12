---
name: backend
description: >
  Índice orquestador de sub-skills para desarrollo backend con Node.js
  (NestJS, Express). Cubre estructura de proyecto, diseño de API REST,
  autenticación, middleware, validación, error handling, patrones de DB,
  caching, jobs, testing, seguridad, logging, real-time, archivos,
  diseño de esquemas DB y consumo de APIs externas.
  Cada sub-skill es atómica y enfocada en CÓMO implementar en código,
  no en qué servicio cloud usar (eso lo cubre architecture/).
---

# 🔧 Backend — Node.js (NestJS / Express)

## Scope

```
Esta skill cubre IMPLEMENTACIÓN en código backend:
  ✅ Cómo estructurar el proyecto
  ✅ Cómo diseñar endpoints REST
  ✅ Cómo implementar auth, middleware, validación
  ✅ Cómo usar ORM, cache, queues en código
  ✅ Cómo testear, loguear, proteger

NO cubre:
  ❌ Qué DB usar → architecture/databases
  ❌ Qué servicio de cache elegir → architecture/databases (Redis decision)
  ❌ Qué servicio de queue usar → architecture/messaging-and-events
  ❌ Dónde deployar → architecture/compute
  ❌ IAM, VPC, WAF → architecture/networking-and-security
  ❌ Principios generales (SOLID, DRY) → clean-code-principles
```

---

## Stack Cubierto

```
Frameworks:
  - NestJS (primera preferencia — estructura opinada, DI, decorators)
  - Express (alternativa ligera — cuando NestJS es overkill)
  - Fastify (bajo NestJS o standalone — cuando performance es crítico)

Runtime:
  - Node.js 20+ (LTS)
  - TypeScript strict mode obligatorio

ORM / Query Builder:
  - Prisma (type-safe, migraciones, studio)
  - Drizzle (ligero, SQL-first, más control)
  - TypeORM (legacy, solo si ya existe en el proyecto)

Validation:
  - Zod (runtime validation, schema-first)
  - class-validator + class-transformer (NestJS pipes)

Testing:
  - Vitest (unit + integration)
  - Supertest (HTTP integration tests)
  - Testcontainers (DB testing con containers reales)

Package Manager:
  - pnpm 9+
```

---

## Sub-Skills

| Sub-skill | Alcance |
|-----------|---------|
| `project-structure` | Organización de carpetas, módulos NestJS, layers Express, DI |
| `api-design` | REST conventions, HTTP methods, status codes, pagination, OpenAPI |
| `auth` | JWT access+refresh, OAuth2, password hashing, RBAC, guards |
| `request-pipeline` | Middleware, guards, interceptors, pipes, CORS, correlation IDs |
| `data-validation` | DTOs, Zod/class-validator, input sanitization, transformación |
| `error-handling` | Error classes, global handler, operational vs programmer errors |
| `database-patterns` | ORM, migrations, seeders, repository, transactions, N+1 |
| `caching` | Redis patterns, invalidation, TTL, HTTP cache, decorator caching |
| `background-jobs` | BullMQ, workers, scheduling, retries, dead letter queues |
| `testing` | Unit, integration, mocking, DB testing, fixtures |
| `security` | Helmet, rate limiting, sanitization, CSRF, audit |
| `logging` | Structured logging (pino), levels, masking, request logging |
| `real-time` | WebSocket, SSE, rooms, scaling con Redis adapter |
| `file-handling` | Multipart uploads, streaming, validation, presigned URL integration |
| `database-design` | Modelado de esquemas, relaciones, normalización, índices, naming |
| `api-consumption` | Consumo de APIs externas, retry, circuit breaker, webhooks, SDKs |

---

## Decisión: ¿NestJS o Express?

```
¿Cuándo NestJS?
  ✅ Proyecto mediano-grande (> 10 endpoints)
  ✅ Equipo de 2+ devs (estructura opinada = consistencia)
  ✅ Necesitas DI, modules, guards, interceptors
  ✅ API con lógica de negocio compleja
  ✅ Microservicios

¿Cuándo Express?
  ✅ API simple (< 10 endpoints)
  ✅ Lambda functions (lightweight)
  ✅ Prototipo rápido
  ✅ Dev solo que prefiere simplicidad

¿Cuándo Fastify?
  ✅ Performance es prioridad (benchmarks importan)
  ✅ Se puede usar bajo NestJS como adapter
  ✅ API con alto throughput
```

---

## Skills Obligatorias por Acción

> **Estas reglas aplican SIEMPRE que se crea o modifica código backend.**
> Cada sub-skill individual debe consultar esta sección para saber qué
> otras skills son obligatorias en paralelo.

```
AL CREAR/MODIFICAR UN ENDPOINT:
  1. ☐ testing              → Tests unitarios + integración (coverage ≥ 80%)
  2. ☐ data-validation      → DTOs, Zod/class-validator en inputs
  3. ☐ error-handling       → Error classes tipados, global handler
  4. ☐ security             → Helmet, rate limiting, sanitización
  5. ☐ logging              → Structured logging, correlation IDs
  6. ☐ api-design           → REST conventions, status codes, OpenAPI
  7. ☐ clean-code-principles → JSDoc, SRP, guard clauses, naming

AL CREAR/MODIFICAR AUTH:
  1. ☐ Todos los anteriores +
  2. ☐ auth                 → JWT, hashing, RBAC, guards
  3. ☐ governance/owasp-top-10 → A07 Auth Failures, rate limiting

AL CREAR/MODIFICAR LÓGICA DE DB:
  1. ☐ testing              → Tests con DB real (Testcontainers) o mocks
  2. ☐ database-patterns    → Repository, transactions, N+1 prevention
  3. ☐ database-design      → Índices, naming, migraciones
  4. ☐ clean-code-principles → Separación de concerns, DI

AL CREAR/MODIFICAR BACKGROUND JOBS:
  1. ☐ testing              → Tests de workers y scheduling
  2. ☐ background-jobs      → BullMQ, retries, dead letter queues
  3. ☐ error-handling       → Retry strategies, failure logging
  4. ☐ logging              → Job lifecycle logging

AL CONSUMIR APIs EXTERNAS:
  1. ☐ api-consumption      → Retry, circuit breaker, timeouts
  2. ☐ error-handling       → Error mapping, fallback responses
  3. ☐ logging              → Request/response logging (sin PII)
  4. ☐ security             → No exponer secrets, token rotation
```

### Cadena de Consulta

```
Cuando una sub-skill se activa, el agente DEBE:

  1. Leer la sub-skill solicitada (ej: auth)
  2. Volver a ESTE índice (backend/SKILL.md)
  3. Consultar "Skills Obligatorias por Acción" según lo que está haciendo
  4. Leer y aplicar cada skill obligatoria marcada con ☐
  5. Verificar que el código cumple TODAS antes de marcar como completado

El agente NO marca una tarea como completada si falta alguna skill
obligatoria de esta lista.
```
