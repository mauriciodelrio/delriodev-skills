---
name: database-design
description: >
  Use this skill when designing relational database schemas. Covers
  entity modeling, relationships (1:1, 1:N, M:N), normalization,
  denormalization, naming conventions, indexes, soft deletes,
  timestamps, and migration design. Complements database-patterns
  (how to use the ORM) with HOW to design the schema.
---

# Database Design — Schema Design

## Agent workflow

**1.** Define naming conventions and base fields (sections 1–2).
**2.** Model entities and relationships (sections 3–4).
**3.** Design indexes and decide normalization/denormalization (sections 5–6).
**4.** Configure soft deletes, enums, and modeling patterns (sections 7–9).
**5.** Implement migrations and check gotchas (sections 10–11).

**Scope:** Entity and relationship modeling, naming conventions, normalization/denormalization, index design, soft deletes, timestamps, auditing, Prisma/Drizzle migrations. For which DB engine → `architecture/databases`. For ORM queries, transactions, seeders → `backend/database-patterns`.

## 1. Naming Conventions

**Tables:** `snake_case`, plural — `users`, `order_items`, `payment_methods`.

**Columns:** `snake_case` — `first_name`, `created_at`, `is_active`.

**Primary key:** always `id`. Type: cuid2 (preferred), uuid, nanoid. No auto-increment in public APIs (predictable, leaks count).

**Foreign key:** `{singular_table}_id` — `user_id`, `order_id`, `category_id`.

**Indexes:** `idx_{table}_{columns}` — `idx_users_email`, `idx_orders_user_id_status`.

**Constraints:** `uq_{table}_{columns}` (unique), `chk_{table}_{condition}` (check).

**Prisma mapping** — camelCase in the model, snake_case in DB:

```prisma
model User {
  id        String   @id @default(cuid())
  firstName String   @map("first_name")
  createdAt DateTime @default(now()) @map("created_at")
  
  @@map("users")
}
```

## 2. Base Fields — Every Table

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

1. `createdAt` — always, default in DB (`now()`).
2. `updatedAt` — always, automatically updated.
3. `deletedAt` — when you need soft delete (see section 7).
4. Never trust client timestamps — always generated on server/DB.

## 3. Relationships

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

## 4. Index Rules

**Always index:**
1. Foreign keys — Prisma doesn't create them automatically.
2. Frequently searched fields: email, slug, status.
3. Filter fields: status, type, is_active.
4. Sort fields: created_at, sort_order.
5. Frequent WHERE combinations → composite index.

**When to use unique index:** user email, resource slug, combination that must be unique (user_id + product_id in favorites).

**When not to index:** small tables (< 1000 rows), low cardinality columns (boolean) except in composites, columns rarely used in WHERE/ORDER.

**Composite index — order matters:** `@@index([status, createdAt])` is useful for `WHERE status = 'active' ORDER BY created_at` but not for `WHERE created_at > '2024-01-01'` without status. Rule: equality first, range second.

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

## 5. Normalization vs Denormalization

**Normalization (3NF):** each piece of data lives in one place, no duplication. Use by default for transactional data. Example: `orders → user_id (FK)`, to get the name do a JOIN.

**Denormalization:** duplicate data to avoid costly JOINs. Use when performance requires it and the data rarely changes. Example: `orders → user_id, user_name, user_email`. If the user changes their name, orders must be updated.

**General rule:**
1. Start normalized (3NF).
2. Measure slow queries with EXPLAIN.
3. Denormalize only what you need.
4. Document what is denormalized and why.

**When to denormalize:** snapshot data (shipping address at order time), frequently queried counters (total_orders on user), data that doesn't change (product name in a line item). Don't denormalize data that changes frequently or "just in case" without measuring.

## 6. Soft Deletes

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  deletedAt DateTime? @map("deleted_at")
  
  @@index([deletedAt])
  @@map("users")
}
```

**When to use soft delete:** data that might need recovery (users, orders), legal retention requirements (GDPR: keep for auditing), data referenced by other records (FK integrity).

**When to use hard delete:** ephemeral data (sessions, tokens, OTPs), data with no audit value (cache entries, temp files), when GDPR requires actual deletion.

**Implementation:**
1. `deletedAt: DateTime?` — null = active, date = deleted.
2. All queries must filter `WHERE deleted_at IS NULL`.
3. Prisma middleware for automatic filtering: `prisma.$use(...)`.
4. Unique constraints with soft delete: `@@unique([email, deletedAt])` — allows re-registration after deletion.

## 7. Enums and Status

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

1. Use DB enums (not free strings) — integrity at DB level.
2. Define a state machine: PENDING → CONFIRMED | CANCELLED, CONFIRMED → PROCESSING | CANCELLED, PROCESSING → SHIPPED, SHIPPED → DELIVERED | REFUNDED.
3. Validate transitions on the backend, don't trust the client.
4. If the enum grows large (>10 values) → consider a lookup table.

## 8. Modeling Patterns

**Inheritance (Single Table Inheritance):** one table for multiple types with a discriminator field. E.g.: `notifications (id, type, user_id, title, data_json)` with type `'email' | 'push' | 'sms'`. Simple, one query for all types. Many nullable fields if types diverge.

**Polymorphism:** avoid `commentable_type + commentable_id`. Prefer separate tables with explicit FK: `post_comments(post_id)`, `product_reviews(product_id)`.

**JSON columns:** semi-structured data that doesn't need DB-level filtering (metadata, preferences, config). Data you need to filter/index → use normal columns.

**Audit table:** `audit_log (id, entity_type, entity_id, action, changes_json, actor_id, created_at)` — for compliance and debugging.

## 9. Migrations

1. Always use a migration tool (prisma migrate, drizzle-kit) — never alter the DB manually in production.
2. Forward-only — don't create rollback migrations. If there's an error: new migration that fixes it.
3. Non-destructive migrations: no DROP COLUMN in one step. Step 1: stop writing. Step 2: deploy without reading. Step 3: DROP COLUMN.
4. Default data for new NOT NULL columns: `ALTER TABLE ADD COLUMN status VARCHAR DEFAULT 'active' NOT NULL`. Backfill first if the table is large.
5. Locking on large tables: ALTER TABLE with millions of rows can lock. Use `CREATE INDEX CONCURRENTLY` (Postgres). Run migrations during low-traffic periods.
6. Seed data separate: seeds ≠ migrations. Seeds only in dev/staging, never in migration files.

## 10. Gotchas

- Auto-increment IDs in APIs — use cuid2/uuid (not predictable).
- FK without index — slow JOIN queries.
- Prisma's implicit M:N — use explicit join table.
- Free string for status — use DB enum.
- Polymorphic associations — use explicit FKs.
- Nullable columns "just in case" — be intentional with NULL.
- Denormalize without measuring — normalize first, then optimize.
- Destructive migrations in one step — make it gradual.
- Inconsistent naming — always `snake_case` in DB.
- No timestamps — `createdAt` and `updatedAt` on every table.
- Soft delete without global filter — all queries must consider `deletedAt`.
- "God object" tables with 50+ columns — split into related entities.
