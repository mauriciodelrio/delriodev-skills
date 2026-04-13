---
name: backend
description: >
  Use this skill when developing backend with Node.js (NestJS, Express).
  Orchestrator index of sub-skills covering project structure, REST API
  design, authentication, middleware, validation, error handling, DB
  patterns, caching, jobs, testing, security, logging, real-time, file
  handling, DB schema design, and external API consumption.
  Each sub-skill is atomic and focused on HOW to implement in code,
  not on which cloud service to use (that's covered by architecture/).
---

# Backend — Node.js (NestJS / Express)

## Agent workflow

**1.** Identify which backend action is needed.
**2.** Read the corresponding sub-skill (table in section 3).
**3.** Consult "Mandatory skills by action" (section 5) to know which other skills to apply in parallel.
**4.** Apply each mandatory skill listed.
**5.** Verify that the code meets all of them before marking as completed.

## Scope

This skill covers backend code implementation: how to structure the project, design REST endpoints, implement auth/middleware/validation, use ORM/cache/queues in code, test/log/secure. Does not cover: which DB to use → `architecture/databases`, which cache service to choose → `architecture/databases`, which queue service to use → `architecture/messaging-and-events`, where to deploy → `architecture/compute`, IAM/VPC/WAF → `architecture/networking-and-security`, general principles (SOLID, DRY) → `clean-code-principles`.

## 1. Stack covered

**Frameworks:** NestJS (first preference — opinionated structure, DI, decorators), Express (lightweight alternative — when NestJS is overkill), Fastify (under NestJS or standalone — when performance is critical).

**Runtime:** Node.js 20+ (LTS), TypeScript strict mode mandatory.

**ORM / Query Builder:** Prisma (type-safe, migrations, studio), Drizzle (lightweight, SQL-first, more control), TypeORM (legacy, only if it already exists in the project).

**Validation:** Zod (runtime validation, schema-first), class-validator + class-transformer (NestJS pipes).

**Testing:** Vitest (unit + integration), Supertest (HTTP integration tests), Testcontainers (DB testing with real containers).

**Package Manager:** pnpm 9+.

## 2. Sub-Skills

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

## 3. Decision: NestJS or Express?

**When NestJS?** Medium-to-large project (> 10 endpoints), team of 2+ devs (opinionated structure = consistency), you need DI/modules/guards/interceptors, API with complex business logic, microservices.

**When Express?** Simple API (< 10 endpoints), Lambda functions (lightweight), quick prototype, solo dev who prefers simplicity.

**When Fastify?** Performance is a priority (benchmarks matter), can be used under NestJS as an adapter, API with high throughput.

## 4. Mandatory skills by action

These rules apply always when creating or modifying backend code. Each individual sub-skill must consult this section to know which other skills are mandatory in parallel.

**When creating/modifying an endpoint:** testing (coverage ≥ 80%), data-validation (DTOs, Zod/class-validator), error-handling (typed error classes, global handler), security (Helmet, rate limiting, sanitization), logging (structured logging, correlation IDs), api-design (REST conventions, status codes, OpenAPI), clean-code-principles (JSDoc, SRP, guard clauses, naming).

**When creating/modifying auth:** all of the above + auth (JWT, hashing, RBAC, guards), governance/owasp-top-10 (A07 Auth Failures, rate limiting).

**When creating/modifying DB logic:** testing (Testcontainers or mocks), database-patterns (repository, transactions, N+1), database-design (indexes, naming, migrations), clean-code-principles (separation of concerns, DI).

**When creating/modifying background jobs:** testing (workers and scheduling), background-jobs (BullMQ, retries, dead letter queues), error-handling (retry strategies, failure logging), logging (job lifecycle logging).

**When consuming external APIs:** api-consumption (retry, circuit breaker, timeouts), error-handling (error mapping, fallback responses), logging (request/response logging, no PII), security (don't expose secrets, token rotation).

### Consultation chain

When a sub-skill is activated, the agent must: read the requested sub-skill, return to this index (`backend/SKILL.md`), consult "Mandatory skills by action" based on what it's doing, read and apply each mandatory skill, and verify that the code meets all of them before marking as completed.
