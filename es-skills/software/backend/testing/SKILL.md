---
name: testing
description: >
  Usa esta skill cuando escribas tests para backend Node.js. Cubre
  unit tests (services, utils), integration tests (API con supertest),
  mocking (DI, repositories), testing de base de datos (testcontainers,
  test DB), fixtures, factories y estrategia por capa.
---

# Testing — Tests Backend

## Flujo de trabajo del agente

**1.** Identificar el tipo de test según la capa (sección 1).
**2.** Elegir herramientas del stack (sección 2).
**3.** Escribir unit tests para services/utils (sección 3) e integration tests para endpoints (secciones 4–5).
**4.** Configurar DB testing y fixtures si necesario (secciones 6–7).
**5.** Aplicar reglas de mocking (sección 8).
**6.** Configurar coverage (provider, thresholds ≥ 80%, scripts) y ajustes de vitest (sección 9).
**7.** Verificar contra la lista de gotchas (sección 10).

## 1. Estrategia de testing por capa

**Unit tests (70%)** — rápidos, aislados: services (lógica de negocio pura), utils/helpers (funciones puras), validators (schemas). No testear controllers como unit (usar integration), ni código del framework (guards, pipes).

**Integration tests (25%)** — HTTP request → response: endpoints completos (request → middleware → controller → service → DB → response), flujos de auth, validación (body inválido → 400), permisos (sin rol → 403).

**E2E tests (5%)** — solo flujos críticos: registro → login → crear recurso → verificar, checkout completo. Pocos pero críticos.

## 2. Stack de testing

**Vitest (preferido):** rápido (ESM nativo, threads), compatible con API de Jest, in-source testing disponible, mismo config que el proyecto.

**Jest:** ecosistema maduro, pero más lento que Vitest. Config CJS/ESM puede ser problemática.

**Supertest:** integration tests HTTP, envía requests a Express/NestJS sin levantar servidor.

**Testcontainers:** DB real en container para integration tests (Redis, PostgreSQL efímeros). Más confiable que mocks de DB.

## 3. Unit Tests — Services

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

## 4. Integration Tests — Supertest

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

## 5. NestJS — Testing Module

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

## 6. Database Testing

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

## 7. Fixtures y Factories

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

## 8. Mocking

Mockear dependencias externas (DB, Redis, APIs, email). No mockear la unidad bajo test. No mockear tipos de TypeScript, mockear implementaciones. Preferir dependency injection para facilitar mocking. En integration tests preferir DB real sobre mocks de Prisma.

**Herramientas:** `vi.fn()` (mock function), `vi.spyOn()` (spy on existing method), `vi.mock()` (mock de módulo entero), `vitest-mock-extended` (mockDeep para Prisma).

## 9. Configuración

**devDependency requerida:** `@vitest/coverage-v8` (debe coincidir con la versión major de `vitest`). Sin ella, `--coverage` ejecuta pero no produce datos.

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

## 10. Gotchas

- Testear implementación interna — el test falla en cada refactor.
- Mockear todo — test pasa pero feature está rota.
- Test sin assertions — test que nunca falla no sirve.
- Shared mutable state entre tests — tests que fallan solo juntos.
- Tests que dependen de orden — cada test debe ser independiente.
- Ignorar test flaky — arreglarlo o eliminarlo.
- Integration test sin cleanup — datos de un test contaminan otro.
- Test de happy path solamente — testear también errores y edge cases.
- describe/it genéricos ("should work") — describir comportamiento esperado.
- Snapshot tests para JSON responses — frágiles, usar assertions específicas.
- Solo integration tests sin unit tests — el service se testea indirectamente y cualquier cambio rompe tests masivamente.
- Solo unit tests sin integration tests — mocks pasan pero el endpoint real falla.
- vitest.config.ts sin coverage thresholds — código se libera sin quality gate; siempre configurar `thresholds` ≥ 80%.
- Falta paquete `@vitest/coverage-v8` — `test:cov` ejecuta silenciosamente sin datos reales de coverage.

## Skills Relacionadas

| Skill | Por qué |
|-------|--------|
| `error-handling` | Tests de error paths, no solo happy path |
| `data-validation` | Tests de schemas y DTOs |
| `clean-code-principles` | Naming expresivo, test builders, AAA pattern |
| `frontend/testing-rules` | Mismos principios para lógica compartida |
