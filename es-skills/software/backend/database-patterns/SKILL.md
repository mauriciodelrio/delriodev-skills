---
name: database-patterns
description: >
  Patrones de acceso a datos en backend Node.js. Cubre ORM setup (Prisma,
  Drizzle, TypeORM), migraciones, seeders, repository pattern, transacciones,
  connection pooling, N+1, soft deletes, y patrones de consulta eficientes.
  Enfocado en CÓMO usar el ORM en código (qué DB usar → architecture/databases).
---

# 🗄️ Database Patterns — Acceso a Datos

## Principio

> **El ORM es una herramienta, no una excusa para ignorar SQL.**
> Entiende las queries que genera el ORM. Revisa el query log en desarrollo.
> Si una query es ineficiente, optimízala directamente en SQL.

---

## Decisión: ¿Qué ORM?

```
Prisma (PREFERIDO para proyectos nuevos):
  ✅ Type-safe queries generadas desde schema
  ✅ Migraciones declarativas
  ✅ Prisma Studio (GUI para explorar datos)
  ✅ Relations sin JOIN manual
  ✅ Excelente DX: autocomplete, error messages
  ❌ Overhead en queries complejas (N+1 si no cuidas includes)
  ❌ No soporta raw SQL tipado nativamente (usar $queryRaw)

Drizzle (PREFERIDO para performance y control):
  ✅ SQL-first: queries que parecen SQL
  ✅ Zero overhead → genera queries óptimas
  ✅ Full type-safety sin code generation
  ✅ Soporte nativo para raw SQL tipado
  ❌ Menos tooling (sin Studio GUI)
  ❌ Curva de aprendizaje si vienes de ORM clásico

TypeORM (SOLO si ya existe en el proyecto):
  ❌ Bugs conocidos sin fix por años
  ❌ Type-safety parcial
  ❌ Migraciones frágiles
  → No usar en proyectos nuevos
```

---

## Prisma — Setup y Patterns

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
  @@map("users") // Nombre de tabla en snake_case
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
        select: {                    // ← SELECT explícito, nunca select *
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          // password: false (por omisión)
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

## Drizzle — Setup y Patterns

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
REGLAS:
  1. Una migración por cambio lógico (no agrupar cambios no relacionados)
  2. Migraciones son SOLO forward (no editar migraciones ya aplicadas)
  3. Nombre descriptivo: 20240101_add_users_role_column
  4. Probar migración en staging antes de producción
  5. Backward-compatible: agregar columna nullable → deploy → backfill → hacer NOT NULL
  6. NUNCA ejecutar migraciones destructivas sin backup

PRISMA:
  npx prisma migrate dev --name add_role_column   ← genera + aplica
  npx prisma migrate deploy                       ← solo aplica (producción)

DRIZZLE:
  npx drizzle-kit generate                        ← genera SQL
  npx drizzle-kit migrate                         ← aplica
```

---

## Seeders

```typescript
// prisma/seed.ts
async function seed() {
  // Idempotente: upsert para no duplicar
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

// REGLAS:
//   ✅ Seeders son idempotentes (se pueden correr N veces)
//   ✅ Datos de seed son realistas pero no reales
//   ✅ Separar seed de desarrollo vs seed de producción
//   ❌ Credenciales reales en seeds → usar variables de entorno
//   ❌ Seed que depende de orden → usar upsert
```

---

## Transacciones

```typescript
// Prisma — transacción interactiva
async function createOrder(dto: CreateOrderDto) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Verificar stock
    const product = await tx.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product || product.stock < dto.quantity) {
      throw new AppError(422, 'INSUFFICIENT_STOCK', 'Stock insuficiente');
    }

    // 2. Decrementar stock
    await tx.product.update({
      where: { id: dto.productId },
      data: { stock: { decrement: dto.quantity } },
    });

    // 3. Crear orden
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
  // Si algo falla, TODO se revierte automáticamente
}

// Drizzle — transacción
await db.transaction(async (tx) => {
  await tx.update(products).set({ stock: sql`stock - ${qty}` }).where(eq(products.id, productId));
  await tx.insert(orders).values({ userId, total });
});
```

---

## N+1 Problem

```
PROBLEMA:
  // ❌ 1 query para users + N queries para orders (una por user)
  const users = await prisma.user.findMany();
  for (const user of users) {
    user.orders = await prisma.order.findMany({ where: { userId: user.id } });
  }

SOLUCIÓN PRISMA → include / select con relaciones:
  // ✅ 2 queries: 1 para users + 1 para orders
  const users = await prisma.user.findMany({
    include: { orders: true },
  });

SOLUCIÓN DRIZZLE → join o subquery:
  const result = await db.query.users.findMany({
    with: { orders: true },
  });

REGLA:
  Siempre revisar los logs de queries en desarrollo.
  Activar query logging: prisma.$on('query', (e) => logger.debug(e))
```

---

## Connection Pooling

```
REGLAS:
  1. Configurar pool size según concurrencia esperada
     Default Prisma: connection_limit = num_cpus * 2 + 1
  2. En serverless (Lambda): usar Prisma Accelerate o PgBouncer
     → Lambdas abren muchas conexiones → agotan el pool de la DB
  3. Timeout de conexión: 5s (no esperar indefinidamente)
  4. Monitorear conexiones activas en producción

  // Prisma — en DATABASE_URL
  postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=5
```

---

## Soft Deletes

```
PATRÓN:
  Columna deletedAt: DateTime? (null = activo)
  
  TODAS las queries de lectura filtran deletedAt = null
  DELETE → UPDATE SET deletedAt = now()
  
  ✅ Recuperar datos borrados
  ✅ Audit trail
  ✅ Foreign keys no se rompen
  
  ❌ Complica queries (siempre agregar WHERE deletedAt IS NULL)
  ❌ Los datos crecen → estrategia de archivado periódico

PRISMA MIDDLEWARE (automático):
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

## Anti-patrones

```
❌ SELECT * → siempre select/include explícito
❌ Queries en loops → usar include/join/batch
❌ Migraciones destructivas sin backup → DROP COLUMN, DROP TABLE
❌ Seeders que insertan duplicados → siempre upsert
❌ Transacción de larga duración (> 5s) → bloquea rows
❌ String concatenation en queries → SQL injection → usar parameterized
❌ Abrir conexión por request → usar pool compartido
❌ No indexar columnas de filtrado/ordenamiento frecuente
❌ Prisma sin logging en development → no ves las queries generadas
❌ TypeORM en proyecto nuevo → usar Prisma o Drizzle
```
