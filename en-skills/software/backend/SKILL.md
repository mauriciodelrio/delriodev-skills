---
name: backend
description: >
  Orchestrator index of sub-skills for backend development with Node.js
  (NestJS, Express). Covers project structure, REST API design,
  authentication, middleware, validation, error handling, DB patterns,
  caching, jobs, testing, security, logging, real-time, file handling,
  DB schema design, and external API consumption.
  Each sub-skill is atomic and focused on HOW to implement in code,
  not on which cloud service to use (that's covered by architecture/).
---

# 🔧 Backend — Node.js (NestJS / Express)

## Scope

```
This skill covers backend code IMPLEMENTATION:
  ✅ How to structure the project
  ✅ How to design REST endpoints
  ✅ How to implement auth, middleware, validation
  ✅ How to use ORM, cache, queues in code
  ✅ How to test, log, secure

Does NOT cover:
  ❌ Which DB to use → architecture/databases
  ❌ Which cache service to choose → architecture/databases (Redis decision)
  ❌ Which queue service to use → architecture/messaging-and-events
  ❌ Where to deploy → architecture/compute
  ❌ IAM, VPC, WAF → architecture/networking-and-security
  ❌ General principles (SOLID, DRY) → clean-code-principles
```

---

## Stack Covered

```
Frameworks:
  - NestJS (first preference — opinionated structure, DI, decorators)
  - Express (lightweight alternative — when NestJS is overkill)
  - Fastify (under NestJS or standalone — when performance is critical)

Runtime:
  - Node.js 20+ (LTS)
  - TypeScript strict mode mandatory

ORM / Query Builder:
  - Prisma (type-safe, migrations, studio)
  - Drizzle (lightweight, SQL-first, more control)
  - TypeORM (legacy, only if it already exists in the project)

Validation:
  - Zod (runtime validation, schema-first)
  - class-validator + class-transformer (NestJS pipes)

Testing:
  - Vitest (unit + integration)
  - Supertest (HTTP integration tests)
  - Testcontainers (DB testing with real containers)

Package Manager:
  - pnpm 9+
```

---

## Sub-Skills

| Sub-skill | Scope |
|-----------|-------|
| `project-structure` | Folder organization, NestJS modules, Express layers, DI |
| `api-design` | REST conventions, HTTP methods, status codes, pagination, OpenAPI |
| `auth` | JWT access+refresh, OAuth2, password hashing, RBAC, guards |
| `request-pipeline` | Middleware, guards, interceptors, pipes, CORS, correlation IDs |
| `data-validation` | DTOs, Zod/class-validator, input sanitization, transformation |
| `error-handling` | Error classes, global handler, operational vs programmer errors |
| `database-patterns` | ORM, migrations, seeders, repository, transactions, N+1 |
| `caching` | Redis patterns, invalidation, TTL, HTTP cache, decorator caching |
| `background-jobs` | BullMQ, workers, scheduling, retries, dead letter queues |
| `testing` | Unit, integration, mocking, DB testing, fixtures |
| `security` | Helmet, rate limiting, sanitization, CSRF, audit |
| `logging` | Structured logging (pino), levels, masking, request logging |
| `real-time` | WebSocket, SSE, rooms, scaling with Redis adapter |
| `file-handling` | Multipart uploads, streaming, validation, presigned URL integration |
| `database-design` | Schema modeling, relationships, normalization, indexes, naming |
| `api-consumption` | External API consumption, retry, circuit breaker, webhooks, SDKs |

---

## Decision: NestJS or Express?

```
When NestJS?
  ✅ Medium-to-large project (> 10 endpoints)
  ✅ Team of 2+ devs (opinionated structure = consistency)
  ✅ You need DI, modules, guards, interceptors
  ✅ API with complex business logic
  ✅ Microservices

When Express?
  ✅ Simple API (< 10 endpoints)
  ✅ Lambda functions (lightweight)
  ✅ Quick prototype
  ✅ Solo dev who prefers simplicity

When Fastify?
  ✅ Performance is a priority (benchmarks matter)
  ✅ Can be used under NestJS as an adapter
  ✅ API with high throughput
```
