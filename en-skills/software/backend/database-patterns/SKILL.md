---
name: database-patterns
description: >
  Data access patterns in Node.js backend. Covers ORM setup (Prisma,
  Drizzle, TypeORM), migrations, seeders, repository pattern, transactions,
  connection pooling, N+1, soft deletes, and efficient query patterns.
  Focused on HOW to use the ORM in code (which DB to use → architecture/databases).
---

# 🗄️ Database Patterns — Data Access

## Principle

> **The ORM is a tool, not an excuse to ignore SQL.**
> Understand the queries the ORM generates. Review the query log in development.
> If a query is inefficient, optimize it directly in SQL.

---

## Decision: Which ORM?

```
Prisma (PREFERRED for new projects):
  ✅ Type-safe queries generated from schema
  ✅ Declarative migrations
  ✅ Prisma Studio (GUI for exploring data)
  ✅ Relations without manual JOIN
  ✅ Excellent DX: autocomplete, error messages
  ❌ Overhead on complex queries (N+1 if you don't manage includes)
  ❌ No native typed raw SQL support (use $queryRaw)

Drizzle (PREFERRED for performance and control):
  ✅ SQL-first: queries that look like SQL
  ✅ Zero overhead → generates optimal queries
  ✅ Full type-safety without code generation
  ✅ Native typed raw SQL support
  ❌ Less tooling (no Studio GUI)
  ❌ Learning curve if coming from classic ORM

TypeORM (ONLY if it already exists in the project):
  ❌ Known bugs unfixed for years
  ❌ Partial type-safety
  ❌ Fragile migrations
  → Don't use in new projects
```

---

## Prisma — Setup and Patterns

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String
  role      Role     @default(USER)
  orders    Order[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime? // Soft delete

  @@index([email])
  @@index([createdAt])
  @@map("users") // Table name in snake_case
}

enum Role {
  USER
  ADMIN
}

model Order {
  id        String      @id @default(cuid())
  userId    String
  user      User        @relation(fields: [userId], references: [id])
  status    OrderStatus @default(PENDING)
  total     Decimal     @db.Decimal(10, 2)
  items     OrderItem[]
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  @@index([userId])
  @@index([status])
  @@map("orders")
}
```

### Prisma — Service Pattern

```typescript
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: ListUsersQuery) {
    const { page, pageSize, search, role } = query;
    
    const where: Prisma.UserWhereInput = {
      deletedAt: null, // Soft delete filter
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(role && { role }),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {                    // ← Explicit SELECT, never select *
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          // password: false (by omission)
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) throw new NotFoundError('User', id);
    return user;
  }
}
```

---

## Drizzle — Setup and Patterns

```typescript
// db/schema.ts
import { pgTable, text, timestamp, decimal, pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['user', 'admin']);

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  password: text('password').notNull(),
  role: roleEnum('role').default('user').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const db = drizzle(pool, { schema });

// Queries
const activeUsers = await db
  .select({
    id: users.id,
    email: users.email,
    name: users.name,
  })
  .from(users)
  .where(and(
    isNull(users.deletedAt),
    eq(users.role, 'admin'),
  ))
  .orderBy(desc(users.createdAt))
  .limit(20)
  .offset(0);
```

---

## Migrations

```
RULES:
  1. One migration per logical change (don't group unrelated changes)
  2. Migrations are ONLY forward (don't edit already-applied migrations)
  3. Descriptive name: 20240101_add_users_role_column
  4. Test migration in staging before production
  5. Backward-compatible: add nullable column → deploy → backfill → make NOT NULL
  6. NEVER run destructive migrations without a backup

PRISMA:
  npx prisma migrate dev --name add_role_column   ← generates + applies
  npx prisma migrate deploy                       ← applies only (production)

DRIZZLE:
  npx drizzle-kit generate                        ← generates SQL
  npx drizzle-kit migrate                         ← applies
```

---

## Seeders

```typescript
// prisma/seed.ts
async function seed() {
  // Idempotent: upsert to avoid duplicates
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      password: await hashPassword('admin123'),
      role: 'ADMIN',
    },
  });

  console.log('Seed completed');
}

// RULES:
//   ✅ Seeders are idempotent (can be run N times)
//   ✅ Seed data is realistic but not real
//   ✅ Separate development seed vs production seed
//   ❌ Real credentials in seeds → use environment variables
//   ❌ Seed that depends on order → use upsert
```

---

## Transactions

```typescript
// Prisma — interactive transaction
async function createOrder(dto: CreateOrderDto) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Check stock
    const product = await tx.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product || product.stock < dto.quantity) {
      throw new AppError(422, 'INSUFFICIENT_STOCK', 'Insufficient stock');
    }

    // 2. Decrement stock
    await tx.product.update({
      where: { id: dto.productId },
      data: { stock: { decrement: dto.quantity } },
    });

    // 3. Create order
    const order = await tx.order.create({
      data: {
        userId: dto.userId,
        total: product.price * dto.quantity,
        items: {
          create: {
            productId: dto.productId,
            quantity: dto.quantity,
            price: product.price,
          },
        },
      },
    });

    return order;
  });
  // If anything fails, EVERYTHING is rolled back automatically
}

// Drizzle — transaction
await db.transaction(async (tx) => {
  await tx.update(products).set({ stock: sql`stock - ${qty}` }).where(eq(products.id, productId));
  await tx.insert(orders).values({ userId, total });
});
```

---

## N+1 Problem

```
PROBLEM:
  // ❌ 1 query for users + N queries for orders (one per user)
  const users = await prisma.user.findMany();
  for (const user of users) {
    user.orders = await prisma.order.findMany({ where: { userId: user.id } });
  }

PRISMA SOLUTION → include / select with relations:
  // ✅ 2 queries: 1 for users + 1 for orders
  const users = await prisma.user.findMany({
    include: { orders: true },
  });

DRIZZLE SOLUTION → join or subquery:
  const result = await db.query.users.findMany({
    with: { orders: true },
  });

RULE:
  Always review query logs in development.
  Enable query logging: prisma.$on('query', (e) => logger.debug(e))
```

---

## Connection Pooling

```
RULES:
  1. Configure pool size based on expected concurrency
     Prisma default: connection_limit = num_cpus * 2 + 1
  2. In serverless (Lambda): use Prisma Accelerate or PgBouncer
     → Lambdas open many connections → exhaust the DB pool
  3. Connection timeout: 5s (don't wait indefinitely)
  4. Monitor active connections in production

  // Prisma — in DATABASE_URL
  postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=5
```

---

## Soft Deletes

```
PATTERN:
  Column deletedAt: DateTime? (null = active)
  
  ALL read queries filter deletedAt = null
  DELETE → UPDATE SET deletedAt = now()
  
  ✅ Recover deleted data
  ✅ Audit trail
  ✅ Foreign keys don't break
  
  ❌ Complicates queries (always add WHERE deletedAt IS NULL)
  ❌ Data grows → periodic archival strategy needed

PRISMA MIDDLEWARE (automatic):
  prisma.$use(async (params, next) => {
    if (params.action === 'delete') {
      params.action = 'update';
      params.args.data = { deletedAt: new Date() };
    }
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args.where = { ...params.args.where, deletedAt: null };
    }
    return next(params);
  });
```

---

## Anti-patterns

```
❌ SELECT * → always use explicit select/include
❌ Queries in loops → use include/join/batch
❌ Destructive migrations without backup → DROP COLUMN, DROP TABLE
❌ Seeders that insert duplicates → always upsert
❌ Long-running transactions (> 5s) → blocks rows
❌ String concatenation in queries → SQL injection → use parameterized
❌ Opening a connection per request → use a shared pool
❌ Not indexing frequently filtered/sorted columns
❌ Prisma without logging in development → you can't see the generated queries
❌ TypeORM in a new project → use Prisma or Drizzle
```
