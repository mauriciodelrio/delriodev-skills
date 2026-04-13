---
name: backend
description: >
  Usa esta skill cuando desarrolles backend con Node.js (NestJS, Express).
  Índice orquestador de sub-skills que cubren estructura de proyecto,
  diseño de API REST, autenticación, middleware, validación, error handling,
  patrones de DB, caching, jobs, testing, seguridad, logging, real-time,
  archivos, diseño de esquemas DB y consumo de APIs externas.
  Cada sub-skill es atómica y enfocada en CÓMO implementar en código,
  no en qué servicio cloud usar (eso lo cubre architecture/).
---

# Backend — Node.js (NestJS / Express)

## Flujo de trabajo del agente

**1.** Identificar qué acción backend se necesita.
**2.** Leer la sub-skill correspondiente (tabla en sección 3).
**3.** Consultar "Skills obligatorias por acción" (sección 5) para saber qué otras skills aplicar en paralelo.
**4.** Aplicar cada skill obligatoria marcada.
**5.** Verificar que el código cumple todas antes de marcar como completado.

## Scope

Esta skill cubre implementación en código backend: cómo estructurar el proyecto, diseñar endpoints REST, implementar auth/middleware/validación, usar ORM/cache/queues en código, testear/loguear/proteger. No cubre: qué DB usar → `architecture/databases`, qué servicio de cache elegir → `architecture/databases`, qué servicio de queue usar → `architecture/messaging-and-events`, dónde deployar → `architecture/compute`, IAM/VPC/WAF → `architecture/networking-and-security`, principios generales (SOLID, DRY) → `clean-code-principles`.

## 1. Stack cubierto

**Frameworks:** NestJS (primera preferencia — estructura opinada, DI, decorators), Express (alternativa ligera — cuando NestJS es overkill), Fastify (bajo NestJS o standalone — cuando performance es crítico).

**Runtime:** Node.js 20+ (LTS), TypeScript strict mode obligatorio.

**ORM / Query Builder:** Prisma (type-safe, migraciones, studio), Drizzle (ligero, SQL-first, más control), TypeORM (legacy, solo si ya existe en el proyecto).

**Validation:** Zod (runtime validation, schema-first), class-validator + class-transformer (NestJS pipes).

**Testing:** Vitest (unit + integration), Supertest (HTTP integration tests), Testcontainers (DB testing con containers reales).

**Package Manager:** pnpm 9+.

## 2. Sub-Skills

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

## 3. Decisión: ¿NestJS o Express?

**¿Cuándo NestJS?** Proyecto mediano-grande (> 10 endpoints), equipo de 2+ devs (estructura opinada = consistencia), necesitas DI/modules/guards/interceptors, API con lógica de negocio compleja, microservicios.

**¿Cuándo Express?** API simple (< 10 endpoints), Lambda functions (lightweight), prototipo rápido, dev solo que prefiere simplicidad.

**¿Cuándo Fastify?** Performance es prioridad (benchmarks importan), se puede usar bajo NestJS como adapter, API con alto throughput.

## 4. Skills obligatorias por acción

Estas reglas aplican siempre que se crea o modifica código backend. Cada sub-skill individual debe consultar esta sección para saber qué otras skills son obligatorias en paralelo.

**Al crear/modificar un endpoint:** testing (unit tests para services/utils + integration tests para endpoints, coverage ≥ 80%), data-validation (DTOs, Zod/class-validator, sanitización HTML), error-handling (error classes tipados, global handler), security (Helmet, rate limiting, sanitización), logging (structured logging, correlation IDs), api-design (REST conventions, status codes, OpenAPI), clean-code-principles (JSDoc, SRP, guard clauses, naming).

**Al crear/modificar auth:** todos los anteriores + auth (JWT, hashing, RBAC, guards), governance/owasp-top-10 (A07 Auth Failures, rate limiting).

**Al crear/modificar lógica de DB:** testing (Testcontainers o mocks), database-patterns (repository, transactions, N+1), database-design (índices, naming, migraciones), clean-code-principles (separación de concerns, DI).

**Al crear/modificar background jobs:** testing (workers y scheduling), background-jobs (BullMQ, retries, dead letter queues), error-handling (retry strategies, failure logging), logging (job lifecycle logging).

**Al consumir APIs externas:** api-consumption (retry, circuit breaker, timeouts), error-handling (error mapping, fallback responses), logging (request/response logging sin PII), security (no exponer secrets, token rotation).

### Cadena de consulta

Cuando una sub-skill se activa, el agente debe: leer la sub-skill solicitada, volver a este índice (`backend/SKILL.md`), consultar "Skills obligatorias por acción" según lo que está haciendo, leer y aplicar cada skill obligatoria, y verificar que el código cumple todas antes de marcar como completado.
