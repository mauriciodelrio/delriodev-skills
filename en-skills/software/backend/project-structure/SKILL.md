---
name: project-structure
description: >
  Folder and module organization for Node.js backend. Covers NestJS structure
  (modules, providers, controllers), Express (layers, routers), and shared
  patterns (feature-based, dependency injection, barrel exports).
  The agent adapts the structure based on the project's framework.
---

# 📂 Project Structure — Backend Organization

## Principle

> **The structure should communicate the project's intent.**
> Someone opening the repository for the first time should understand
> what each folder does without reading code.

---

## NestJS — Recommended Structure

```
src/
├── main.ts                          ← App bootstrap
├── app.module.ts                    ← Root module
│
├── common/                          ← Shared across all modules
│   ├── decorators/                  ← Custom decorators
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   ├── filters/                     ← Exception filters
│   │   └── http-exception.filter.ts
│   ├── guards/                      ← Auth guards, role guards
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── interceptors/                ← Response transform, logging
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts
│   ├── pipes/                       ← Validation pipes
│   │   └── zod-validation.pipe.ts
│   ├── middleware/                   ← HTTP middleware
│   │   └── correlation-id.middleware.ts
│   ├── dto/                         ← Shared DTOs
│   │   └── pagination.dto.ts
│   └── constants/                   ← App-wide constants
│       └── index.ts
│
├── config/                          ← Configuration module
│   ├── config.module.ts
│   ├── app.config.ts
│   ├── database.config.ts
│   └── auth.config.ts
│
├── modules/                         ← Feature modules
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── local.strategy.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── register.dto.ts
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.repository.ts       ← Optional: repository pattern
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   └── dto/
│   │       ├── create-user.dto.ts
│   │       └── update-user.dto.ts
│   │
│   └── orders/
│       ├── orders.module.ts
│       ├── orders.controller.ts
│       ├── orders.service.ts
│       ├── orders.repository.ts
│       ├── entities/
│       │   └── order.entity.ts
│       └── dto/
│           └── create-order.dto.ts
│
├── database/                        ← DB schema, migrations, seeds
│   ├── schema/                      ← Prisma schema or Drizzle schemas
│   ├── migrations/
│   └── seeds/
│
├── jobs/                            ← Background jobs (BullMQ)
│   ├── email.processor.ts
│   └── report.processor.ts
│
└── lib/                             ← Utility libraries
    ├── hash.ts
    ├── token.ts
    └── date.ts

test/
├── unit/                            ← Unit tests mirror src/ structure
├── integration/                     ← API integration tests
│   ├── auth.e2e-spec.ts
│   └── users.e2e-spec.ts
└── fixtures/                        ← Test data factories
    └── user.fixture.ts
```

## Express — Recommended Structure

```
src/
├── index.ts                         ← Entry point
├── app.ts                           ← Express app setup
├── server.ts                        ← HTTP server + graceful shutdown
│
├── config/                          ← Environment config
│   ├── index.ts
│   ├── database.ts
│   └── auth.ts
│
├── middleware/                       ← Express middleware
│   ├── auth.middleware.ts
│   ├── error-handler.middleware.ts
│   ├── validate.middleware.ts
│   ├── cors.middleware.ts
│   └── request-logger.middleware.ts
│
├── routes/                          ← Route definitions
│   ├── index.ts                     ← Route aggregator
│   ├── auth.routes.ts
│   ├── users.routes.ts
│   └── orders.routes.ts
│
├── controllers/                     ← Request handlers
│   ├── auth.controller.ts
│   ├── users.controller.ts
│   └── orders.controller.ts
│
├── services/                        ← Business logic
│   ├── auth.service.ts
│   ├── users.service.ts
│   └── orders.service.ts
│
├── repositories/                    ← Data access layer
│   ├── users.repository.ts
│   └── orders.repository.ts
│
├── database/                        ← Schema, migrations, seeds
│   ├── schema/
│   ├── migrations/
│   └── seeds/
│
├── types/                           ← TypeScript types/interfaces
│   ├── express.d.ts                 ← Express request augmentation
│   └── index.ts
│
├── validators/                      ← Zod schemas
│   ├── auth.schema.ts
│   └── users.schema.ts
│
├── errors/                          ← Custom error classes
│   ├── app-error.ts
│   └── not-found.error.ts
│
├── jobs/                            ← Background jobs
│   └── email.processor.ts
│
└── lib/                             ← Utilities
    ├── hash.ts
    ├── token.ts
    └── logger.ts
```

---

## Structure Rules

```
1. FEATURE-BASED, NOT LAYER-BASED
   ✅ modules/users/ (controller + service + dto together)
   ❌ controllers/users.ts + services/users.ts + dto/users.ts
   → Exception: Express can use layers if the project is small (< 5 features)

2. ONE MODULE PER FEATURE (NestJS)
   Each feature has its own module with controller, service, DTOs.
   The module declares imports and exports explicitly.

3. SEPARATE CONCERNS INTO LAYERS
   Controller → receives request, delegates to service, returns response
   Service → business logic, does not know about HTTP
   Repository → data access, queries (optional, the service can use ORM directly)

4. COMMON/ ONLY FOR SHARED
   If something is used in 1 module → it goes in that module.
   If it's used in 2+ modules → it goes in common/.
   Don't put everything in common "just in case".

5. NO MASSIVE BARREL EXPORTS
   ✅ Direct import: import { UsersService } from './users.service'
   ❌ Giant barrel: import { UsersService, OrdersService, ... } from './services'
   Exception: common/decorators/index.ts and common/guards/index.ts are ok.

6. CONFIG SEPARATE FROM CODE
   Environment variables → config module/folder.
   Never use process.env directly in services.
   Always typed and validated at startup.
```

---

## Typed Config

```typescript
// NestJS — config module with validation
// config/app.config.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REDIS_URL: z.string().url().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    process.exit(1);
  }
  return result.data;
}
```

---

## Anti-patterns

```
❌ Empty folders "for structure" → create when there's content
❌ God service (a service with 50+ methods) → split by domain
❌ Controller with business logic → move to service
❌ Service with HTTP logic (req, res) → that belongs in the controller
❌ process.env directly in code → use config module with validation
❌ Circular dependencies between modules → refactor shared logic to common
❌ A single file per layer (routes.ts with 500 lines) → split by feature
```
