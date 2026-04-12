---
name: project-structure
description: >
  Organización de carpetas y módulos para backend Node.js. Cubre estructura
  NestJS (modules, providers, controllers), Express (layers, routers), y
  patrones compartidos (feature-based, dependency injection, barrel exports).
  El agente adapta la estructura según el framework del proyecto.
---

# 📂 Project Structure — Organización Backend

## Principio

> **La estructura debe comunicar la intención del proyecto.**
> Alguien que abre el repositorio por primera vez debe entender
> qué hace cada carpeta sin leer código.

---

## NestJS — Estructura Recomendada

```
src/
├── main.ts                          ← Bootstrap de la app
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

## Express — Estructura Recomendada

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

## Reglas de Estructura

```
1. FEATURE-BASED, NO LAYER-BASED
   ✅ modules/users/ (controller + service + dto juntos)
   ❌ controllers/users.ts + services/users.ts + dto/users.ts
   → Excepción: Express puede usar layers si el proyecto es pequeño (< 5 features)

2. UN MÓDULO POR FEATURE (NestJS)
   Cada feature tiene su propio module con controller, service, DTOs.
   El module declara imports y exports explícitamente.

3. SEPARAR CONCERNS EN LAYERS
   Controller → recibe request, delega a service, retorna response
   Service → lógica de negocio, no conoce HTTP
   Repository → acceso a datos, queries (opcional, el service puede usar ORM directo)

4. COMMON/ SOLO PARA SHARED
   Si algo se usa en 1 módulo → va en ese módulo.
   Si se usa en 2+ módulos → va en common/.
   No poner todo en common "por si acaso".

5. NO BARREL EXPORTS MASIVOS
   ✅ Import directo: import { UsersService } from './users.service'
   ❌ Barrel gigante: import { UsersService, OrdersService, ... } from './services'
   Excepción: common/decorators/index.ts y common/guards/index.ts son ok.

6. CONFIG SEPARADA DEL CÓDIGO
   Variables de entorno → config module/folder.
   Nunca process.env directo en services.
   Siempre tipada y validada al startup.
```

---

## Config Tipada

```typescript
// NestJS — config module con validación
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

## Anti-patrones

```
❌ Carpetas vacías "por estructura" → crear cuando haya contenido
❌ God service (un servicio con 50+ métodos) → dividir por dominio
❌ Controller con lógica de negocio → mover a service
❌ Service con lógica HTTP (req, res) → eso es del controller
❌ process.env directo en código → usar config module con validación
❌ Circular dependencies entre modules → refactorizar shared logic a common
❌ Un solo archivo por layer (routes.ts con 500 líneas) → split por feature
```
