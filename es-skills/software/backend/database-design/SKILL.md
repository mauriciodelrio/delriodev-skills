---
name: database-design
description: >
  Diseño de esquemas de base de datos relacional. Cubre modelado de entidades,
  relaciones (1:1, 1:N, M:N), normalización y denormalización, convenciones de
  nombres, índices, soft deletes, timestamps, y diseño de migraciones.
  Complementa database-patterns (cómo usar el ORM) con el CÓMO diseñar
  el esquema antes de implementar.
---

# 🗄️ Database Design — Diseño de Esquemas

## Principio

> **El schema es el contrato más importante de tu aplicación.**
> Un mal diseño de base de datos genera bugs, queries lentos,
> y migraciones dolorosas. Invertir tiempo en diseño previene
> dolor después.

---

## Scope

```
✅ Esta skill cubre:
  - Modelado de entidades y relaciones
  - Convenciones de naming
  - Normalización / denormalización
  - Diseño de índices
  - Soft deletes, timestamps, auditoría
  - Migraciones con Prisma/Drizzle

❌ NO cubre:
  - Qué motor de DB elegir → architecture/databases
  - Queries ORM, transactions, seeders → backend/database-patterns
  - Config de RDS/Supabase → architecture/databases
```

---

## Convenciones de Naming

```
TABLAS:
  ✅ snake_case, plural: users, order_items, payment_methods
  ❌ camelCase, singular: User, orderItem

COLUMNAS:
  ✅ snake_case: first_name, created_at, is_active
  ❌ camelCase: firstName, createdAt

PRIMARY KEY:
  ✅ id (siempre)
  Tipo: cuid2 (preferido), uuid, nanoid
  ❌ auto-increment en APIs públicas (predecible, leakea conteo)

FOREIGN KEY:
  ✅ {tabla_singular}_id: user_id, order_id, category_id
  ❌ userId, fk_user

ÍNDICES:
  idx_{tabla}_{columnas}: idx_users_email, idx_orders_user_id_status

CONSTRAINTS:
  uq_{tabla}_{columnas}: uq_users_email
  chk_{tabla}_{condicion}: chk_orders_total_positive

PRISMA MAPPING:
  // Prisma usa camelCase en el modelo, snake_case en DB
  model User {
    id        String   @id @default(cuid())
    firstName String   @map("first_name")
    createdAt DateTime @default(now()) @map("created_at")
    
    @@map("users")
  }
```

---

## Campos Base — Toda Tabla

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

```
REGLAS DE TIMESTAMPS:
  1. createdAt → SIEMPRE, default en DB (now())
  2. updatedAt → SIEMPRE, actualizado automáticamente
  3. deletedAt → Cuando necesites soft delete (ver sección)
  4. NUNCA confiar en timestamps del cliente → siempre generados en servidor/DB
```

---

## Relaciones

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

---

## Regla de Índices

```
INDEXAR SIEMPRE:
  1. Foreign keys → SIEMPRE (Prisma no los crea automáticamente)
  2. Campos de búsqueda frecuente: email, slug, status
  3. Campos de filtrado: status, type, is_active
  4. Campos de ordenamiento: created_at, sort_order
  5. Combinaciones de WHERE frecuentes → índice compuesto

CUÁNDO USAR ÍNDICE ÚNICO:
  - Email de usuario
  - Slug de recurso
  - Combinación que debe ser única (user_id + product_id en favoritos)

CUÁNDO NO INDEXAR:
  - Tablas pequeñas (< 1000 rows) → full scan es más rápido
  - Columnas con baja cardinalidad (boolean) → excepto composites
  - Columnas que casi nunca se usan en WHERE/ORDER

ÍNDICE COMPUESTO — ORDEN IMPORTA:
  @@index([status, createdAt])
  → Útil para: WHERE status = 'active' ORDER BY created_at
  → Útil para: WHERE status = 'active'
  → NO útil para: WHERE created_at > '2024-01-01' (sin status)
  
  Regla: Igualdad primero, rango después
```

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

---

## Normalización vs Denormalización

```
NORMALIZACIÓN (3NF):
  Cada dato vive en un solo lugar. Sin duplicación.
  ✅ Usar por defecto para datos transaccionales.

  Ejemplo normalizado:
    orders → user_id (FK)  
    user(id, name, email)
    Para obtener nombre: JOIN users ON orders.user_id = users.id

DENORMALIZACIÓN:
  Duplicar datos para evitar JOINs costosos.
  ✅ Usar cuando el rendimiento lo requiere Y los datos raramente cambian.

  Ejemplo denormalizado:
    orders → user_id, user_name, user_email
    No necesita JOIN para mostrar el pedido.
    ⚠️ Si el user cambia de nombre, hay que actualizar en orders.

REGLA GENERAL:
  1. Empezar normalizado (3NF)
  2. Medir queries lentos con EXPLAIN
  3. Denormalizar solo lo que necesites
  4. Documentar qué está denormalizado y por qué

CUÁNDO DENORMALIZAR:
  ✅ Datos de snapshot (dirección de envío al momento del pedido)
  ✅ Contadores que se consultan mucho (total_orders en user)
  ✅ Datos que no cambian (nombre del producto en un line item)
  
  ❌ Datos que cambian frecuentemente
  ❌ "Por si acaso es más rápido" sin medir
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
CUÁNDO USAR SOFT DELETE:
  ✅ Datos que podrían necesitar recuperación (usuarios, pedidos)
  ✅ Requisitos legales de retención (GDPR: mantener para auditoría)
  ✅ Datos referenciados por otros registros (FK integrity)

CUÁNDO USAR HARD DELETE:
  ✅ Datos efímeros: sessions, tokens, OTPs
  ✅ Datos sin valor de auditoría: cache entries, temp files
  ✅ Cuando GDPR exige borrado real

IMPLEMENTACIÓN:
  1. deletedAt: DateTime? — null = activo, fecha = borrado
  2. TODOS los queries deben filtrar WHERE deleted_at IS NULL
  3. Middleware de Prisma para filtrar automáticamente:
     prisma.$use(async (params, next) => {
       if (params.action === 'findMany') {
         params.args.where = { ...params.args.where, deletedAt: null };
       }
       return next(params);
     });
  4. Unique constraints con soft delete:
     @@unique([email, deletedAt]) — permite re-registro tras borrado
```

---

## Enums y Status

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
REGLAS DE ENUMS / STATUS:
  1. Usar enum de DB (no string libre) → integridad en DB
  2. Definir máquina de estados: qué transiciones son válidas
     PENDING → CONFIRMED | CANCELLED
     CONFIRMED → PROCESSING | CANCELLED
     PROCESSING → SHIPPED
     SHIPPED → DELIVERED | REFUNDED
  3. Validar transiciones en el backend, no confiar en el cliente
  4. Si el enum crece mucho (>10 valores) → considerar tabla de lookup
```

---

## Patrones de Modelado

```
HERENCIA (Single Table Inheritance):
  Una tabla para múltiples tipos con campo discriminador.
  
  notifications (id, type, user_id, title, data_json)
    type: 'email' | 'push' | 'sms'
    data_json: contenido específico por tipo
  
  ✅ Simple, un query para todos los tipos
  ❌ Muchos campos nullable si los tipos divergen

POLIMORFISMO (Polymorphic Associations):
  ❌ EVITAR: commentable_type + commentable_id
  ✅ PREFERIR: tablas separadas con FK explícita
     post_comments(post_id), product_reviews(product_id)

JSON COLUMNS:
  ✅ Datos semi-estructurados que no necesitan filtrado en DB:
     metadata, preferences, config
  ❌ Datos que necesitas filtrar/indexar → columnas normales

TABLA DE AUDITORÍA:
  audit_log (id, entity_type, entity_id, action, changes_json, actor_id, created_at)
  → Para cumplimiento y debugging
```

---

## Migraciones

```
REGLAS:
  1. SIEMPRE usar migration tool (prisma migrate, drizzle-kit)
     NUNCA alterar DB manualmente en producción
  
  2. Migraciones hacia adelante (forward-only)
     No crear rollback migrations → complejas y error-prone
     Si hay error: nueva migración que corrige
  
  3. Migraciones no destructivas:
     ❌ DROP COLUMN en un paso
     ✅ Paso 1: Dejar de escribir en la columna
     ✅ Paso 2: Deploy sin leer la columna  
     ✅ Paso 3: DROP COLUMN
  
  4. Datos default para columnas nuevas NOT NULL:
     ALTER TABLE ADD COLUMN status VARCHAR DEFAULT 'active' NOT NULL;
     → Backfill primero si la tabla es grande
  
  5. Lockeo en tablas grandes:
     ALTER TABLE con millones de rows puede lockear la tabla
     → Usar CREATE INDEX CONCURRENTLY (Postgres)
     → Migraciones en horarios de bajo tráfico
  
  6. Seed data separado:
     Seeds ≠ migrations
     Seeds solo en dev/staging, NUNCA en migration files
```

---

## Anti-patrones

```
❌ Auto-increment IDs en APIs → usar cuid2/uuid (no predecible)
❌ FK sin índice → queries de JOIN lentos
❌ Implicit M:N de Prisma → usar tabla intermedia explícita
❌ String libre para status → usar enum de DB
❌ Polimorphic associations → usar FK explícitas
❌ Columnas nullable "por si acaso" → ser intencional con NULL
❌ Denormalizar sin medir → primero normalizado, luego optimizar
❌ Migraciones destructivas en un paso → hacerlo gradual
❌ Nombres inconsistentes → snake_case siempre en DB
❌ Sin timestamps → createdAt y updatedAt en TODA tabla
❌ Soft delete sin filtro global → todas las queries deben considerar deletedAt
❌ Tablas "god object" con 50+ columnas → dividir en entidades relacionadas
```
