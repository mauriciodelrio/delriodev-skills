---
name: database-design
description: >
  Relational database schema design. Covers entity modeling, relationships
  (1:1, 1:N, M:N), normalization and denormalization, naming conventions,
  indexes, soft deletes, timestamps, and migration design. Complements
  database-patterns (how to use the ORM) with HOW to design the schema
  before implementing.
---

# 🗄️ Database Design — Schema Design

## Principle

> **The schema is the most important contract of your application.**
> A bad database design leads to bugs, slow queries, and painful
> migrations. Investing time in design prevents pain later.

---

## Scope

```
✅ This skill covers:
  - Entity and relationship modeling
  - Naming conventions
  - Normalization / denormalization
  - Index design
  - Soft deletes, timestamps, auditing
  - Migrations with Prisma/Drizzle

❌ Does NOT cover:
  - Which DB engine to choose → architecture/databases
  - ORM queries, transactions, seeders → backend/database-patterns
  - RDS/Supabase config → architecture/databases
```

---

## Naming Conventions

```
TABLES:
  ✅ snake_case, plural: users, order_items, payment_methods
  ❌ camelCase, singular: User, orderItem

COLUMNS:
  ✅ snake_case: first_name, created_at, is_active
  ❌ camelCase: firstName, createdAt

PRIMARY KEY:
  ✅ id (always)
  Type: cuid2 (preferred), uuid, nanoid
  ❌ auto-increment in public APIs (predictable, leaks count)

FOREIGN KEY:
  ✅ {singular_table}_id: user_id, order_id, category_id
  ❌ userId, fk_user

INDEXES:
  idx_{table}_{columns}: idx_users_email, idx_orders_user_id_status

CONSTRAINTS:
  uq_{table}_{columns}: uq_users_email
  chk_{table}_{condition}: chk_orders_total_positive

PRISMA MAPPING:
  // Prisma uses camelCase in the model, snake_case in DB
  model User {
    id        String   @id @default(cuid())
    firstName String   @map("first_name")
    createdAt DateTime @default(now()) @map("created_at")
    
    @@map("users")
  }
```

---

## Base Fields — Every Table

```prisma
// Every table MUST have these fields

model Example {
  // Identifier
  id        String   @id @default(cuid())
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt       @map("updated_at")
  
  // Soft delete (when applicable)
  deletedAt DateTime?                 @map("deleted_at")
  
  @@map("examples")
}
```

```
TIMESTAMP RULES:
  1. createdAt → ALWAYS, default in DB (now())
  2. updatedAt → ALWAYS, automatically updated
  3. deletedAt → When you need soft delete (see section)
  4. NEVER trust client timestamps → always generated on server/DB
```

---

## Relationships

```prisma
// ───── ONE-TO-MANY (1:N) — The most common ─────
model User {
  id     String  @id @default(cuid())
  orders Order[]   // A user has many orders
  
  @@map("users")
}

model Order {
  id     String @id @default(cuid())
  userId String @map("user_id")
  user   User   @relation(fields: [userId], references: [id])  // FK
  
  @@index([userId])   // ALWAYS index FK
  @@map("orders")
}

// ───── ONE-TO-ONE (1:1) ─────
model User {
  id      String   @id @default(cuid())
  profile Profile?   // Optional
  @@map("users")
}

model Profile {
  id     String @id @default(cuid())
  userId String @unique @map("user_id")  // @unique = 1:1
  user   User   @relation(fields: [userId], references: [id])
  bio    String?
  @@map("profiles")
}

// ───── MANY-TO-MANY (M:N) — Explicit join table ─────
// ALWAYS use an explicit join table, NEVER Prisma's implicit M:N
model Product {
  id         String            @id @default(cuid())
  categories ProductCategory[]
  @@map("products")
}

model Category {
  id       String            @id @default(cuid())
  products ProductCategory[]
  @@map("categories")
}

model ProductCategory {
  productId  String   @map("product_id")
  categoryId String   @map("category_id")
  sortOrder  Int      @default(0) @map("sort_order")  // Extra data on relationship
  assignedAt DateTime @default(now()) @map("assigned_at")
  
  product  Product  @relation(fields: [productId], references: [id])
  category Category @relation(fields: [categoryId], references: [id])
  
  @@id([productId, categoryId])  // Composite PK
  @@index([categoryId])
  @@map("product_categories")
}
```

---

## Index Rules

```
ALWAYS INDEX:
  1. Foreign keys → ALWAYS (Prisma doesn't create them automatically)
  2. Frequently searched fields: email, slug, status
  3. Filter fields: status, type, is_active
  4. Sort fields: created_at, sort_order
  5. Frequent WHERE combinations → composite index

WHEN TO USE UNIQUE INDEX:
  - User email
  - Resource slug
  - Combination that must be unique (user_id + product_id in favorites)

WHEN NOT TO INDEX:
  - Small tables (< 1000 rows) → full scan is faster
  - Low cardinality columns (boolean) → except in composites
  - Columns rarely used in WHERE/ORDER

COMPOSITE INDEX — ORDER MATTERS:
  @@index([status, createdAt])
  → Useful for: WHERE status = 'active' ORDER BY created_at
  → Useful for: WHERE status = 'active'
  → NOT useful for: WHERE created_at > '2024-01-01' (without status)
  
  Rule: Equality first, range second
```

```prisma
// Complete index example
model Order {
  id        String      @id @default(cuid())
  userId    String      @map("user_id")
  status    OrderStatus
  total     Decimal     @db.Decimal(10, 2)
  createdAt DateTime    @default(now()) @map("created_at")
  
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId])                    // FK
  @@index([status, createdAt])         // Filter by status + sort by date
  @@index([userId, status])            // User's orders filtered by status
  @@map("orders")
}
```

---

## Normalization vs Denormalization

```
NORMALIZATION (3NF):
  Each piece of data lives in one place. No duplication.
  ✅ Use by default for transactional data.

  Normalized example:
    orders → user_id (FK)  
    user(id, name, email)
    To get the name: JOIN users ON orders.user_id = users.id

DENORMALIZATION:
  Duplicate data to avoid costly JOINs.
  ✅ Use when performance requires it AND the data rarely changes.

  Denormalized example:
    orders → user_id, user_name, user_email
    No JOIN needed to display the order.
    ⚠️ If the user changes their name, orders must be updated.

GENERAL RULE:
  1. Start normalized (3NF)
  2. Measure slow queries with EXPLAIN
  3. Denormalize only what you need
  4. Document what is denormalized and why

WHEN TO DENORMALIZE:
  ✅ Snapshot data (shipping address at order time)
  ✅ Frequently queried counters (total_orders on user)
  ✅ Data that doesn't change (product name in a line item)
  
  ❌ Data that changes frequently
  ❌ "Just in case it's faster" without measuring
```

---

## Soft Deletes

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  deletedAt DateTime? @map("deleted_at")
  
  @@index([deletedAt])
  @@map("users")
}
```

```
WHEN TO USE SOFT DELETE:
  ✅ Data that might need recovery (users, orders)
  ✅ Legal retention requirements (GDPR: keep for auditing)
  ✅ Data referenced by other records (FK integrity)

WHEN TO USE HARD DELETE:
  ✅ Ephemeral data: sessions, tokens, OTPs
  ✅ Data with no audit value: cache entries, temp files
  ✅ When GDPR requires actual deletion

IMPLEMENTATION:
  1. deletedAt: DateTime? — null = active, date = deleted
  2. ALL queries must filter WHERE deleted_at IS NULL
  3. Prisma middleware for automatic filtering:
     prisma.$use(async (params, next) => {
       if (params.action === 'findMany') {
         params.args.where = { ...params.args.where, deletedAt: null };
       }
       return next(params);
     });
  4. Unique constraints with soft delete:
     @@unique([email, deletedAt]) — allows re-registration after deletion
```

---

## Enums and Status

```prisma
enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

model Order {
  id     String      @id @default(cuid())
  status OrderStatus @default(PENDING)
  
  @@map("orders")
}
```

```
ENUM / STATUS RULES:
  1. Use DB enums (not free strings) → integrity at DB level
  2. Define a state machine: which transitions are valid
     PENDING → CONFIRMED | CANCELLED
     CONFIRMED → PROCESSING | CANCELLED
     PROCESSING → SHIPPED
     SHIPPED → DELIVERED | REFUNDED
  3. Validate transitions on the backend, don't trust the client
  4. If the enum grows large (>10 values) → consider a lookup table
```

---

## Modeling Patterns

```
INHERITANCE (Single Table Inheritance):
  One table for multiple types with a discriminator field.
  
  notifications (id, type, user_id, title, data_json)
    type: 'email' | 'push' | 'sms'
    data_json: type-specific content
  
  ✅ Simple, one query for all types
  ❌ Many nullable fields if types diverge

POLYMORPHISM (Polymorphic Associations):
  ❌ AVOID: commentable_type + commentable_id
  ✅ PREFER: separate tables with explicit FK
     post_comments(post_id), product_reviews(product_id)

JSON COLUMNS:
  ✅ Semi-structured data that doesn't need DB-level filtering:
     metadata, preferences, config
  ❌ Data you need to filter/index → use normal columns

AUDIT TABLE:
  audit_log (id, entity_type, entity_id, action, changes_json, actor_id, created_at)
  → For compliance and debugging
```

---

## Migrations

```
RULES:
  1. ALWAYS use a migration tool (prisma migrate, drizzle-kit)
     NEVER alter the DB manually in production
  
  2. Forward-only migrations
     Don't create rollback migrations → complex and error-prone
     If there's an error: new migration that fixes it
  
  3. Non-destructive migrations:
     ❌ DROP COLUMN in one step
     ✅ Step 1: Stop writing to the column
     ✅ Step 2: Deploy without reading the column  
     ✅ Step 3: DROP COLUMN
  
  4. Default data for new NOT NULL columns:
     ALTER TABLE ADD COLUMN status VARCHAR DEFAULT 'active' NOT NULL;
     → Backfill first if the table is large
  
  5. Locking on large tables:
     ALTER TABLE with millions of rows can lock the table
     → Use CREATE INDEX CONCURRENTLY (Postgres)
     → Run migrations during low-traffic periods
  
  6. Seed data separate:
     Seeds ≠ migrations
     Seeds only in dev/staging, NEVER in migration files
```

---

## Anti-patterns

```
❌ Auto-increment IDs in APIs → use cuid2/uuid (not predictable)
❌ FK without index → slow JOIN queries
❌ Prisma's implicit M:N → use explicit join table
❌ Free string for status → use DB enum
❌ Polymorphic associations → use explicit FKs
❌ Nullable columns "just in case" → be intentional with NULL
❌ Denormalize without measuring → normalize first, then optimize
❌ Destructive migrations in one step → make it gradual
❌ Inconsistent naming → always snake_case in DB
❌ No timestamps → createdAt and updatedAt on EVERY table
❌ Soft delete without global filter → all queries must consider deletedAt
❌ "God object" tables with 50+ columns → split into related entities
```
