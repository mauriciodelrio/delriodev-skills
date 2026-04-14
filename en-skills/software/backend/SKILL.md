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

This skill covers backend code implementation: how to structure the project, design REST endpoints, implement auth/middleware/validation, use ORM/cache/queues in code, test/log/secure. Does not cover: which DB to use → [`databases`](../databases/SKILL.md), which cache service to choose → [`databases`](../databases/SKILL.md), which queue service to use → [`messaging-and-events`](../messaging-and-events/SKILL.md), where to deploy → [`compute`](../compute/SKILL.md), IAM/VPC/WAF → [`networking-and-security`](../networking-and-security/SKILL.md), general principles (SOLID, DRY) → [`clean-code-principles`](../clean-code-principles/SKILL.md).

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
| [`project-structure`](../project-structure/SKILL.md) | Folder organization, NestJS modules, Express layers, DI |
| [`api-design`](../api-design/SKILL.md) | REST conventions, HTTP methods, status codes, pagination, OpenAPI |
| [`auth`](../auth/SKILL.md) | JWT access+refresh, OAuth2, password hashing, RBAC, guards |
| [`request-pipeline`](../request-pipeline/SKILL.md) | Middleware, guards, interceptors, pipes, CORS, correlation IDs |
| [`data-validation`](../data-validation/SKILL.md) | DTOs, Zod/class-validator, input sanitization, transformation |
| [`error-handling`](../error-handling/SKILL.md) | Error classes, global handler, operational vs programmer errors |
| [`database-patterns`](../database-patterns/SKILL.md) | ORM, migrations, seeders, repository, transactions, N+1 |
| [`caching`](../caching/SKILL.md) | Redis patterns, invalidation, TTL, HTTP cache, decorator caching |
| [`background-jobs`](../background-jobs/SKILL.md) | BullMQ, workers, scheduling, retries, dead letter queues |
| [`testing`](../testing/SKILL.md) | Unit, integration, mocking, DB testing, fixtures |
| [`security`](../security/SKILL.md) | Helmet, rate limiting, sanitization, CSRF, audit |
| [`logging`](../logging/SKILL.md) | Structured logging (pino), levels, masking, request logging |
| [`real-time`](../real-time/SKILL.md) | WebSocket, SSE, rooms, scaling with Redis adapter |
| [`file-handling`](../file-handling/SKILL.md) | Multipart uploads, streaming, validation, presigned URL integration |
| [`database-design`](../database-design/SKILL.md) | Schema modeling, relationships, normalization, indexes, naming |
| [`api-consumption`](../api-consumption/SKILL.md) | External API consumption, retry, circuit breaker, webhooks, SDKs |

## 3. Decision: NestJS or Express?

**When NestJS?** Medium-to-large project (> 10 endpoints), team of 2+ devs (opinionated structure = consistency), you need DI/modules/guards/interceptors, API with complex business logic, microservices.

**When Express?** Simple API (< 10 endpoints), Lambda functions (lightweight), quick prototype, solo dev who prefers simplicity.

**When Fastify?** Performance is a priority (benchmarks matter), can be used under NestJS as an adapter, API with high throughput.

## 4. Mandatory skills by action

These rules apply always when creating or modifying backend code. Each individual sub-skill must consult this section to know which other skills are mandatory in parallel.

**When creating/modifying an endpoint:** [`testing`](../testing/SKILL.md) (unit tests for services/utils + integration tests for endpoints, coverage ≥ 80%), [`data-validation`](../data-validation/SKILL.md) (DTOs, Zod/class-validator, HTML sanitization), [`error-handling`](../error-handling/SKILL.md) (typed error classes, global handler), [`security`](../security/SKILL.md) (Helmet, rate limiting, sanitization), [`logging`](../logging/SKILL.md) (structured logging, correlation IDs), [`api-design`](../api-design/SKILL.md) (REST conventions, status codes, OpenAPI), [`clean-code-principles`](../clean-code-principles/SKILL.md) (JSDoc, SRP, guard clauses, naming).

**When creating/modifying auth:** all of the above + [`auth`](../auth/SKILL.md) (JWT, hashing, RBAC, guards), [`owasp-top-10`](../owasp-top-10/SKILL.md) (A07 Auth Failures, rate limiting).

**When creating/modifying DB logic:** [`testing`](../testing/SKILL.md) (Testcontainers or mocks), [`database-patterns`](../database-patterns/SKILL.md) (repository, transactions, N+1), [`database-design`](../database-design/SKILL.md) (indexes, naming, migrations), [`clean-code-principles`](../clean-code-principles/SKILL.md) (separation of concerns, DI).

**When creating/modifying background jobs:** [`testing`](../testing/SKILL.md) (workers and scheduling), [`background-jobs`](../background-jobs/SKILL.md) (BullMQ, retries, dead letter queues), [`error-handling`](../error-handling/SKILL.md) (retry strategies, failure logging), [`logging`](../logging/SKILL.md) (job lifecycle logging).

**When consuming external APIs:** [`api-consumption`](../api-consumption/SKILL.md) (retry, circuit breaker, timeouts), [`error-handling`](../error-handling/SKILL.md) (error mapping, fallback responses), [`logging`](../logging/SKILL.md) (request/response logging, no PII), [`security`](../security/SKILL.md) (don't expose secrets, token rotation).

### Consultation chain

When a sub-skill is activated, the agent must: read the requested sub-skill, return to this index (`backend/SKILL.md`), consult "Mandatory skills by action" based on what it's doing, read and apply each mandatory skill, and verify that the code meets all of them before marking as completed.
