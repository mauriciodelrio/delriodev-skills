---
name: testing
description: >
  Use this skill when writing tests for a Node.js backend. Covers
  unit tests (services, utils), integration tests (API with supertest),
  mocking (DI, repositories), database testing (testcontainers,
  test DB), fixtures, factories, and testing strategy by layer.
---

# Testing — Backend Tests

## Agent workflow

**1.** Identify the test type based on the layer (section 1).
**2.** Choose tools from the stack (section 2).
**3.** Write unit tests for services/utils (section 3) and integration tests for endpoints (sections 4–5).
**4.** Configure DB testing and fixtures if needed (sections 6–7).
**5.** Apply mocking rules and configuration (sections 8–9).
**6.** Check against the gotchas list (section 10).

## 1. Testing strategy by layer

**Unit tests (70%)** — fast, isolated: services (pure business logic), utils/helpers (pure functions), validators (schemas). Do not unit test controllers (use integration), or framework code (guards, pipes).

**Integration tests (25%)** — HTTP request → response: full endpoints (request → middleware → controller → service → DB → response), auth flows, validation (invalid body → 400), permissions (missing role → 403).

**E2E tests (5%)** — only critical flows: register → login → create resource → verify, full checkout. Few but critical.

## 2. Testing stack

**Vitest (preferred):** fast (native ESM, threads), compatible with Jest API, in-source testing available, same config as the project.

**Jest:** mature ecosystem, but slower than Vitest. CJS/ESM configuration can be problematic.

**Supertest:** HTTP integration tests, sends requests to Express/NestJS without starting a server.

**Testcontainers:** real DB in container for integration tests (ephemeral Redis, PostgreSQL). More reliable than DB mocks.

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
    // Mock dependencies (injected)
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
      // First user
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'A', email: 'dup@example.com', password: 'StrongPass1' });

      // Duplicate
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
// Option 1: Testcontainers (real DB in container)
import { PostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
  process.env.DATABASE_URL = container.getConnectionUri();
  // Run migrations
  execSync('npx prisma migrate deploy');
}, 60_000); // Long timeout for the first time

afterAll(async () => {
  await container.stop();
});

// Option 2: Separate test database
// DATABASE_URL_TEST in .env.test
// Clean between tests with truncate
beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE users, orders CASCADE`;
});
```

## 7. Fixtures and Factories

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

// Usage
const user = createUserFixture({ role: 'ADMIN' });
const users = Array.from({ length: 10 }, () => createUserFixture());

// Factory with DB insert
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

Mock external dependencies (DB, Redis, APIs, email). Do not mock the unit under test. Do not mock TypeScript types—mock implementations. Prefer dependency injection to make mocking easier. In integration tests prefer real DB over Prisma mocks.

**Tools:** `vi.fn()` (mock function), `vi.spyOn()` (spy on existing method), `vi.mock()` (mock entire module), `vitest-mock-extended` (mockDeep for Prisma).

## 9. Configuration

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
    // Separate unit and integration
    typecheck: { enabled: true },
  },
});

// scripts in package.json
// "test": "vitest run"
// "test:watch": "vitest"
// "test:cov": "vitest run --coverage"
// "test:e2e": "vitest run --config vitest.e2e.config.ts"
```

## 10. Gotchas

- Testing internal implementation — test fails on every refactor.
- Mocking everything — test passes but feature is broken.
- Test without assertions — a test that never fails is useless.
- Shared mutable state between tests — tests that only fail together.
- Tests that depend on order — each test must be independent.
- Ignoring flaky tests — fix or remove them.
- Integration test without cleanup — data from one test contaminates another.
- Testing happy path only — also test errors and edge cases.
- Generic describe/it ("should work") — describe the expected behavior.
- Snapshot tests for JSON responses — fragile, use specific assertions.
- Only integration tests without unit tests — the service is tested indirectly and any change breaks tests massively.
- Only unit tests without integration tests — mocks pass but the actual endpoint fails.

## Related Skills

| Skill | Why |
|-------|-----|
| `error-handling` | Tests for error paths, not just happy path |
| `data-validation` | Tests for schemas and DTOs |
| `clean-code-principles` | Expressive naming, test builders, AAA pattern |
| `frontend/testing-rules` | Same principles for shared logic |
