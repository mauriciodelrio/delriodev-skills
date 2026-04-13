---
name: project-structure
description: >
  Use this skill when creating a new Node.js backend project or reorganizing
  folders and modules. Applies NestJS structure (modules, providers,
  controllers) or Express (layers, routers) based on the framework.
  Includes feature-based organization, dependency injection, and barrel exports.
---

# Project Structure — Backend Organization

## Agent workflow

**1.** Detect the project framework (NestJS or Express) by checking `package.json`.
**2.** Apply the corresponding folder structure from sections 1 or 2.
**3.** Verify the code follows the rules in section 3.
**4.** Ensure configuration is typed and validated at startup (section 4).

## 1. NestJS — Recommended Structure

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

## 2. Express — Recommended Structure

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

## 3. Structure Rules

**Feature-based, not layer-based.** Group `modules/users/` with controller + service + dto together, don't separate by layer (`controllers/users.ts` + `services/users.ts`). Exception: Express can use layers if the project is small (< 5 features).

**One module per feature (NestJS).** Each feature has its own module with controller, service, DTOs. The module declares imports and exports explicitly.

**Separate concerns into layers.** Controller receives request, delegates to service, returns response. Service contains business logic, does not know about HTTP. Repository handles data access (optional, the service can use ORM directly).

**common/ only for shared.** If something is used in 1 module, it goes in that module. If used in 2+, it goes in common/. Don't put everything in common "just in case".

**No massive barrel exports.** Use direct import: `import { UsersService } from './users.service'`. Exception: `common/decorators/index.ts` and `common/guards/index.ts` are acceptable.

**Config separate from code.** Environment variables in config module/folder. Never `process.env` directly in services. Always typed and validated at startup.

## 4. Typed Config

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

## 5. Gotchas

- Empty folders "for structure" — create them when there's real content, not before.
- God service (50+ methods) — split by domain; each service covers one feature.
- Controller with business logic — logic belongs in the service, controller only orchestrates.
- Service with HTTP logic (req, res) — that belongs in the controller.
- `process.env` directly in code — always use config module with validation.
- Circular dependencies between modules — extract shared logic to common/.
- A single file per layer (routes.ts with 500 lines) — split by feature.
