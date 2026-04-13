---
name: database-design
description: >
  Usa esta skill cuando diseñes esquemas de base de datos relacional.
  Cubre modelado de entidades, relaciones (1:1, 1:N, M:N), normalización,
  denormalización, convenciones de nombres, índices, soft deletes,
  timestamps y diseño de migraciones. Complementa database-patterns
  (cómo usar el ORM) con el CÓMO diseñar el esquema.
---

# Database Design — Diseño de Esquemas

## Flujo de trabajo del agente

**1.** Definir convenciones de naming y campos base (secciones 1–2).
**2.** Modelar entidades y relaciones (secciones 3–4).
**3.** Diseñar índices y decidir normalización/denormalización (secciones 5–6).
**4.** Configurar soft deletes, enums y patrones de modelado (secciones 7–9).
**5.** Implementar migraciones y verificar gotchas (secciones 10–11).

**Alcance:** Modelado de entidades y relaciones, convenciones de naming, normalización/denormalización, diseño de índices, soft deletes, timestamps, auditoría, migraciones Prisma/Drizzle. Para qué DB elegir → `architecture/databases`. Para queries ORM, transactions, seeders → `backend/database-patterns`.

## 1. Convenciones de Naming

**Tablas:** `snake_case`, plural — `users`, `order_items`, `payment_methods`.

**Columnas:** `snake_case` — `first_name`, `created_at`, `is_active`.

**Primary key:** siempre `id`. Tipo: cuid2 (preferido), uuid, nanoid. No auto-increment en APIs públicas (predecible, leakea conteo).

**Foreign key:** `{tabla_singular}_id` — `user_id`, `order_id`, `category_id`.

**Índices:** `idx_{tabla}_{columnas}` — `idx_users_email`, `idx_orders_user_id_status`.

**Constraints:** `uq_{tabla}_{columnas}` (unique), `chk_{tabla}_{condición}` (check).

**Prisma mapping** — camelCase en el modelo, snake_case en DB:

```prisma
model User {
  id        String   @id @default(cuid())
  firstName String   @map("first_name")
  createdAt DateTime @default(now()) @map("created_at")
  
  @@map("users")
}
```

## 2. Campos Base — Toda Tabla

```prisma
// Toda tabla DEBE tener estos campos

model Example {
  // Identificador
  id        String   @id @default(cuid())
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt       @map("updated_at")
  
  // Soft delete (cuando aplique)
  deletedAt DateTime?                 @map("deleted_at")
  
  @@map("examples")
}
```

1. `createdAt` — siempre, default en DB (`now()`).
2. `updatedAt` — siempre, actualizado automáticamente.
3. `deletedAt` — cuando necesites soft delete (ver sección 7).
4. Nunca confiar en timestamps del cliente — siempre generados en servidor/DB.

## 3. Relaciones

```prisma
// ───── ONE-TO-MANY (1:N) — La más común ─────
model User {
  id     String  @id @default(cuid())
  orders Order[]   // Un user tiene muchos orders
  
  @@map("users")
}

model Order {
  id     String @id @default(cuid())
  userId String @map("user_id")
  user   User   @relation(fields: [userId], references: [id])  // FK
  
  @@index([userId])   // SIEMPRE indexar FK
  @@map("orders")
}

// ───── ONE-TO-ONE (1:1) ─────
model User {
  id      String   @id @default(cuid())
  profile Profile?   // Opcional
  @@map("users")
}

model Profile {
  id     String @id @default(cuid())
  userId String @unique @map("user_id")  // @unique = 1:1
  user   User   @relation(fields: [userId], references: [id])
  bio    String?
  @@map("profiles")
}

// ───── MANY-TO-MANY (M:N) — Tabla intermedia explícita ─────
// SIEMPRE tabla intermedia explícita, NUNCA implicit M:N de Prisma
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
  sortOrder  Int      @default(0) @map("sort_order")  // Dato extra en relación
  assignedAt DateTime @default(now()) @map("assigned_at")
  
  product  Product  @relation(fields: [productId], references: [id])
  category Category @relation(fields: [categoryId], references: [id])
  
  @@id([productId, categoryId])  // PK compuesta
  @@index([categoryId])
  @@map("product_categories")
}
```

## 4. Regla de Índices

**Indexar siempre:**
1. Foreign keys — Prisma no los crea automáticamente.
2. Campos de búsqueda frecuente: email, slug, status.
3. Campos de filtrado: status, type, is_active.
4. Campos de ordenamiento: created_at, sort_order.
5. Combinaciones de WHERE frecuentes → índice compuesto.

**Cuándo usar índice único:** email de usuario, slug de recurso, combinación que debe ser única (user_id + product_id en favoritos).

**Cuándo no indexar:** tablas pequeñas (< 1000 rows), columnas con baja cardinalidad (boolean) excepto composites, columnas que casi nunca se usan en WHERE/ORDER.

**Índice compuesto — el orden importa:** `@@index([status, createdAt])` es útil para `WHERE status = 'active' ORDER BY created_at` pero no para `WHERE created_at > '2024-01-01'` sin status. Regla: igualdad primero, rango después.

```prisma
// Ejemplo completo de índices
model Order {
  id        String      @id @default(cuid())
  userId    String      @map("user_id")
  status    OrderStatus
  total     Decimal     @db.Decimal(10, 2)
  createdAt DateTime    @default(now()) @map("created_at")
  
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId])                    // FK
  @@index([status, createdAt])         // Filtrar por status + ordenar por fecha
  @@index([userId, status])            // Pedidos de un user filtrados por status
  @@map("orders")
}
```

## 5. Normalización vs Denormalización

**Normalización (3NF):** cada dato vive en un solo lugar, sin duplicación. Usar por defecto para datos transaccionales. Ejemplo: `orders → user_id (FK)`, para obtener nombre se hace JOIN.

**Denormalización:** duplicar datos para evitar JOINs costosos. Usar cuando el rendimiento lo requiere y los datos raramente cambian. Ejemplo: `orders → user_id, user_name, user_email`. Si el user cambia de nombre, hay que actualizar en orders.

**Regla general:**
1. Empezar normalizado (3NF).
2. Medir queries lentos con EXPLAIN.
3. Denormalizar solo lo que necesites.
4. Documentar qué está denormalizado y por qué.

**Cuándo denormalizar:** datos de snapshot (dirección de envío al momento del pedido), contadores frecuentes (total_orders en user), datos que no cambian (nombre del producto en un line item). No denormalizar datos que cambian frecuentemente ni "por si acaso" sin medir.

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

**Cuándo usar soft delete:** datos que podrían necesitar recuperación (usuarios, pedidos), requisitos legales de retención (GDPR: mantener para auditoría), datos referenciados por otros registros (FK integrity).

**Cuándo usar hard delete:** datos efímeros (sessions, tokens, OTPs), datos sin valor de auditoría (cache entries, temp files), cuando GDPR exige borrado real.

**Implementación:**
1. `deletedAt: DateTime?` — null = activo, fecha = borrado.
2. Todos los queries deben filtrar `WHERE deleted_at IS NULL`.
3. Middleware de Prisma para filtrar automáticamente: `prisma.$use(...)`.
4. Unique constraints con soft delete: `@@unique([email, deletedAt])` — permite re-registro tras borrado.

## 7. Enums y Status

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

1. Usar enum de DB (no string libre) — integridad en DB.
2. Definir máquina de estados: PENDING → CONFIRMED | CANCELLED, CONFIRMED → PROCESSING | CANCELLED, PROCESSING → SHIPPED, SHIPPED → DELIVERED | REFUNDED.
3. Validar transiciones en el backend, no confiar en el cliente.
4. Si el enum crece mucho (>10 valores) → considerar tabla de lookup.

## 8. Patrones de Modelado

**Herencia (Single Table Inheritance):** una tabla para múltiples tipos con campo discriminador. Ej: `notifications (id, type, user_id, title, data_json)` con type `'email' | 'push' | 'sms'`. Simple, un query para todos los tipos. Muchos campos nullable si los tipos divergen.

**Polimorfismo:** evitar `commentable_type + commentable_id`. Preferir tablas separadas con FK explícita: `post_comments(post_id)`, `product_reviews(product_id)`.

**JSON columns:** datos semi-estructurados que no necesitan filtrado en DB (metadata, preferences, config). Datos que necesitas filtrar/indexar → columnas normales.

**Tabla de auditoría:** `audit_log (id, entity_type, entity_id, action, changes_json, actor_id, created_at)` — para cumplimiento y debugging.

## 9. Migraciones

1. Siempre usar migration tool (prisma migrate, drizzle-kit) — nunca alterar DB manualmente en producción.
2. Forward-only — no crear rollback migrations. Si hay error: nueva migración que corrige.
3. Migraciones no destructivas: no DROP COLUMN en un paso. Paso 1: dejar de escribir. Paso 2: deploy sin leer. Paso 3: DROP COLUMN.
4. Datos default para columnas NOT NULL nuevas: `ALTER TABLE ADD COLUMN status VARCHAR DEFAULT 'active' NOT NULL`. Backfill primero si la tabla es grande.
5. Lockeo en tablas grandes: ALTER TABLE con millones de rows puede lockear. Usar `CREATE INDEX CONCURRENTLY` (Postgres). Migraciones en horarios de bajo tráfico.
6. Seed data separado: seeds ≠ migrations. Seeds solo en dev/staging, nunca en migration files.

## 10. Gotchas

- Auto-increment IDs en APIs — usar cuid2/uuid (no predecible).
- FK sin índice — queries de JOIN lentos.
- Implicit M:N de Prisma — usar tabla intermedia explícita.
- String libre para status — usar enum de DB.
- Polymorphic associations — usar FK explícitas.
- Columnas nullable "por si acaso" — ser intencional con NULL.
- Denormalizar sin medir — primero normalizado, luego optimizar.
- Migraciones destructivas en un paso — hacerlo gradual.
- Nombres inconsistentes — `snake_case` siempre en DB.
- Sin timestamps — `createdAt` y `updatedAt` en toda tabla.
- Soft delete sin filtro global — todas las queries deben considerar `deletedAt`.
- Tablas "god object" con 50+ columnas — dividir en entidades relacionadas.
