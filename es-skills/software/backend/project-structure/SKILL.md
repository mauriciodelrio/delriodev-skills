---
name: project-structure
description: >
  Usa esta skill cuando crees un proyecto backend Node.js nuevo o necesites
  reorganizar carpetas y módulos. Aplica la estructura NestJS (modules,
  providers, controllers) o Express (layers, routers) según el framework.
  Incluye feature-based organization, dependency injection y barrel exports.
---

# Project Structure — Organización Backend

## Flujo de trabajo del agente

**1.** Detectar el framework del proyecto (NestJS o Express) revisando `package.json`.
**2.** Aplicar la estructura de carpetas correspondiente de las secciones 1 o 2.
**3.** Verificar que el código cumple las reglas de la sección 3.
**4.** Asegurar que la configuración esté tipada y validada al startup (sección 4).

## 1. NestJS — Estructura Recomendada

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

## 2. Express — Estructura Recomendada

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

## 3. Reglas de Estructura

**Feature-based, no layer-based.** Agrupar `modules/users/` con controller + service + dto juntos, no separar por capa (`controllers/users.ts` + `services/users.ts`). Excepción: Express puede usar layers si el proyecto es pequeño (< 5 features).

**Un módulo por feature (NestJS).** Cada feature tiene su propio module con controller, service, DTOs. El module declara imports y exports explícitamente.

**Separar concerns en layers.** Controller recibe request, delega a service, retorna response. Service contiene lógica de negocio, no conoce HTTP. Repository maneja acceso a datos (opcional, el service puede usar ORM directo).

**common/ solo para shared.** Si algo se usa en 1 módulo, va en ese módulo. Si se usa en 2+, va en common/. No poner todo en common "por si acaso".

**No barrel exports masivos.** Usar import directo: `import { UsersService } from './users.service'`. Excepción: `common/decorators/index.ts` y `common/guards/index.ts` son aceptables.

**Config separada del código.** Variables de entorno en config module/folder. Nunca `process.env` directo en services. Siempre tipada y validada al startup.

## 4. Config Tipada

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

## 5. Gotchas

- Carpetas vacías "por estructura" — crearlas cuando haya contenido real, no antes.
- God service (50+ métodos) — dividir por dominio; cada service cubre una feature.
- Controller con lógica de negocio — la lógica va en el service, el controller solo orquesta.
- Service con lógica HTTP (req, res) — eso pertenece al controller.
- `process.env` directo en código — siempre usar config module con validación.
- Circular dependencies entre modules — extraer shared logic a common/.
- Un solo archivo por layer (routes.ts con 500 líneas) — split por feature.
