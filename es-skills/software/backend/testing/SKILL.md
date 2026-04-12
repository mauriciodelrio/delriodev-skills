---
name: testing
description: >
  Testing de backend Node.js. Cubre unit tests (services, utils),
  integration tests (API con supertest), mocking (DI, repositories),
  testing de base de datos (testcontainers, test DB), fixtures,
  factories, y estrategia de testing por capa.
---

# 🧪 Testing — Tests Backend

## Principio

> **Testea el comportamiento, no la implementación.**
> Un test debe fallar cuando el feature se rompe,
> no cuando haces un refactor interno.

---

## Estrategia de Testing por Capa

```
UNIT TESTS (70%) — Rápidos, aislados
  ✅ Services: lógica de negocio pura
  ✅ Utils / helpers: funciones puras
  ✅ Validators: schemas de validación
  ❌ NO testear controllers como unit → testearlos como integration
  ❌ NO testear código del framework (guards, pipes) → ya está testeado

INTEGRATION TESTS (25%) — HTTP request → response
  ✅ Endpoints completos: request → middleware → controller → service → DB → response
  ✅ Flujos de auth: login → access → refresh → logout
  ✅ Validación: enviar body inválido → esperar 400
  ✅ Permisos: user sin rol → esperar 403

E2E TESTS (5%) — Solo flujos críticos de negocio
  ✅ Registro → login → crear recurso → verificar
  ✅ Checkout completo (si aplica)
  → Pocos pero críticos
```

---

## Stack de Testing

```
Vitest (PREFERIDO):
  ✅ Rápido (ESM nativo, threads)
  ✅ Compatible con API de Jest
  ✅ In-source testing disponible
  ✅ Mismo config que el proyecto (vite.config)

Jest (si ya existe en el proyecto):
  ✅ Ecosistema maduro
  ❌ Más lento que Vitest
  ❌ Configuración CJS/ESM puede ser problemática

Supertest:
  ✅ Integration tests HTTP
  ✅ Enviar requests a Express/NestJS sin levantar servidor

Testcontainers:
  ✅ DB real en container para integration tests
  ✅ Redis, PostgreSQL, etc. efímeros
  ✅ Tests más confiables que mocks de DB
```

---

## Unit Tests — Services

```typescript
// users.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockRepo: { findByEmail: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  let mockHashService: { hash: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    // Mock de dependencias (inyectadas)
    mockRepo = {
      findByEmail: vi.fn(),
      create: vi.fn(),
    };
    mockHashService = {
      hash: vi.fn(),
    };
    service = new UsersService(mockRepo as any, mockHashService as any);
  });

  describe('register', () => {
    it('should create a user when email is available', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockHashService.hash.mockResolvedValue('hashed_password');
      mockRepo.create.mockResolvedValue({
        id: 'usr_123',
        email: 'test@example.com',
        name: 'Test',
      });

      const result = await service.register({
        email: 'test@example.com',
        password: 'StrongPass1',
        name: 'Test',
      });

      expect(result.id).toBe('usr_123');
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password: 'hashed_password',
        }),
      );
    });

    it('should throw ConflictError when email exists', async () => {
      mockRepo.findByEmail.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({ email: 'test@example.com', password: 'Pass1234', name: 'Test' }),
      ).rejects.toThrow(ConflictError);
    });
  });
});
```

---

## Integration Tests — Supertest

```typescript
// users.e2e-spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Users API', () => {
  let app: Express;
  let authToken: string;

  beforeAll(async () => {
    app = await createApp({ testing: true });
    // Seed test data + get auth token
    authToken = await getTestToken(app);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/users', () => {
    it('should create a user and return 201', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'New User',
          email: 'new@example.com',
          password: 'StrongPass1',
        })
        .expect(201);

      expect(res.body.data).toMatchObject({
        name: 'New User',
        email: 'new@example.com',
      });
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Bad',
          email: 'not-an-email',
          password: 'StrongPass1',
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 for duplicate email', async () => {
      // Primer usuario
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'A', email: 'dup@example.com', password: 'StrongPass1' });

      // Duplicado
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'B', email: 'dup@example.com', password: 'StrongPass1' })
        .expect(409);
    });

    it('should return 401 without auth token', async () => {
      await request(app)
        .post('/api/users')
        .send({ name: 'X', email: 'x@example.com', password: 'StrongPass1' })
        .expect(401);
    });
  });

  describe('GET /api/users', () => {
    it('should return paginated list', async () => {
      const res = await request(app)
        .get('/api/users?page=1&pageSize=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toHaveProperty('totalItems');
      expect(res.body.meta).toHaveProperty('totalPages');
    });
  });
});
```

---

## NestJS — Testing Module

```typescript
// users.service.spec.ts (NestJS)
import { Test, TestingModule } from '@nestjs/testing';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaClient>(),
        },
      ],
    }).compile();

    service = module.get(UsersService);
    prisma = module.get(PrismaService);
  });

  it('should find user by id', async () => {
    const mockUser = { id: 'usr_123', email: 'test@example.com', name: 'Test' };
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await service.findById('usr_123');
    expect(result).toEqual(mockUser);
  });
});
```

---

## Database Testing

```typescript
// Opción 1: Testcontainers (DB real en container)
import { PostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
  process.env.DATABASE_URL = container.getConnectionUri();
  // Ejecutar migraciones
  execSync('npx prisma migrate deploy');
}, 60_000); // Timeout largo para primera vez

afterAll(async () => {
  await container.stop();
});

// Opción 2: Test database separada
// DATABASE_URL_TEST en .env.test
// Limpiar entre tests con truncate
beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE users, orders CASCADE`;
});
```

---

## Fixtures y Factories

```typescript
// test/fixtures/user.fixture.ts
import { faker } from '@faker-js/faker';

export function createUserFixture(overrides?: Partial<User>): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

// Uso
const user = createUserFixture({ role: 'ADMIN' });
const users = Array.from({ length: 10 }, () => createUserFixture());

// Factory con DB insert
export async function createTestUser(prisma: PrismaClient, overrides?: Partial<User>) {
  return prisma.user.create({
    data: {
      email: faker.internet.email(),
      name: faker.person.fullName(),
      password: await hashPassword('TestPass1'),
      ...overrides,
    },
  });
}
```

---

## Mocking

```
REGLAS DE MOCKING:
  1. Mockear dependencias externas (DB, Redis, APIs, email)
  2. NO mockear la unidad bajo test
  3. NO mockear tipos de TypeScript → mockear implementaciones
  4. Preferir dependency injection → facilita mocking
  5. En integration tests: preferir DB real sobre mocks de Prisma

HERRAMIENTAS:
  vi.fn()          → mock function
  vi.spyOn()       → spy on existing method
  vi.mock()        → mock de módulo entero
  vitest-mock-extended → mockDeep para Prisma
```

---

## Configuración

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts', 'src/main.ts'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    // Separar unit e integration
    typecheck: { enabled: true },
  },
});

// scripts en package.json
// "test": "vitest run"
// "test:watch": "vitest"
// "test:cov": "vitest run --coverage"
// "test:e2e": "vitest run --config vitest.e2e.config.ts"
```

---

## Anti-patrones

```
❌ Testear implementación interna → el test falla en cada refactor
❌ Mockear todo → test pasa pero feature está rota
❌ Test sin assertions → test que nunca falla no sirve
❌ Shared mutable state entre tests → tests que fallan solo juntos
❌ Tests que dependen de orden → cada test debe ser independiente
❌ Ignorar test flaky → arreglarlo o eliminarlo
❌ Integration test sin cleanup → datos de un test contaminan otro
❌ Test de happy path solamente → testear también errores y edge cases
❌ describe/it genéricos ("should work") → describir comportamiento esperado
❌ Snapshot tests para JSON responses → frágiles, usar assertions específicas
```

---

## Skills Relacionadas

> **Consultar el índice maestro [`backend/SKILL.md`](../SKILL.md) → "Skills Obligatorias por Acción"** para la cadena completa.

| Skill | Por qué |
|-------|--------|
| `error-handling` | Tests de error paths, no solo happy path |
| `data-validation` | Tests de schemas y DTOs |
| `clean-code-principles` | Naming expresivo, test builders, AAA pattern |
| `frontend/testing-rules` | Mismos principios para lógica compartida |
