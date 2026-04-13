---
name: databases
description: >
  Usa esta skill cuando necesites elegir bases de datos. Cubre SQL
  (RDS PostgreSQL/MySQL), NoSQL (DynamoDB, MongoDB Atlas), cache
  (ElastiCache Redis), búsqueda (OpenSearch). Incluye criterios por
  tipo de dato, patrones de acceso, escala, costo y complejidad operativa.
---

# Databases — Dónde Almacenar Datos

## Flujo de trabajo del agente

1. Identificar el tipo de datos y patrones de acceso del proyecto.
2. Recorrer el árbol de decisión (sección 1) con el usuario.
3. Consultar criterios de selección y costos de la opción elegida (sección 2).
4. Validar la combinación DB+cache+búsqueda contra el presupuesto (sección 4).
5. Si hay conflicto con constraints, proponer alternativas del mismo árbol.

## 1. Árbol de decisión

```
¿Qué tipo de datos?
│
├── Transaccionales (órdenes, pagos, usuarios, inventario)
│   └── ¿Relaciones complejas entre entidades?
│       ├── SÍ → PostgreSQL (RDS)
│       └── NO → ¿Escala masiva con patrones de acceso simples?
│               ├── SÍ → DynamoDB
│               └── NO → PostgreSQL (más versátil)
│
├── Documentos/contenido flexible (CMS, catálogos, configuraciones)
│   └── ¿Schema cambia frecuentemente?
│       ├── SÍ → MongoDB Atlas o DynamoDB
│       └── NO → PostgreSQL con JSONB
│
├── Sessions/cache/datos temporales
│   └── Redis (ElastiCache)
│
├── Búsqueda full-text / analítica de texto
│   └── OpenSearch (Elasticsearch)
│       Alternativa: PostgreSQL full-text si es búsqueda simple
│
├── Analytics / Data Warehouse
│   └── ¿Volumen > 1 TB?
│       ├── SÍ → Redshift o Athena (S3 + queries)
│       └── NO → PostgreSQL con vistas materializadas
│
└── Time-series (métricas, IoT, logs)
    └── Amazon Timestream o InfluxDB
```

## 2. Opciones detalladas

### PostgreSQL (Amazon RDS)

**Cuándo usarlo:**
- Datos transaccionales con relaciones (ACID obligatorio)
- Pagos, órdenes, usuarios, inventario
- JOINs complejos necesarios
- Full-text search básico (tsvector — evita OpenSearch si basta)
- JSONB para datos semi-estructurados (lo mejor de SQL + NoSQL)
- PostGIS para datos geoespaciales
- Proyecto nuevo sin patrones de acceso definidos
- Ecosistema fuerte: Prisma, Drizzle, TypeORM

**Cuándo NO usarlo:**
- Escala masiva de escritura (> 50K writes/s sostenido) → DynamoDB
- Datos sin relaciones con patrones key-value puros → DynamoDB
- Presupuesto $0 y proyecto hobby → Neon/Supabase free tier

**Costo RDS:**

| Instancia | Costo/mes | Specs | Uso |
|-----------|-----------|-------|-----|
| db.t4g.micro | ~$13 | 2 vCPU, 1 GB | dev/staging |
| db.t4g.small | ~$26 | 2 vCPU, 2 GB | producción baja |
| db.t4g.medium | ~$52 | 2 vCPU, 4 GB | producción media |
| db.r6g.large | ~$175 | 2 vCPU, 16 GB | producción alta |

Storage: ~$0.115/GB/mes (gp3)

**Alternativas managed más baratas:**
- Neon: serverless Postgres, free tier generoso, escala a 0
- Supabase: Postgres + Auth + Storage, free tier, $25/mes Pro
- PlanetScale: MySQL serverless (si prefieren MySQL)

```hcl
# Terraform — RDS PostgreSQL
resource "aws_db_instance" "main" {
  identifier     = "myapp-db"
  engine         = "postgres"
  engine_version = "16.4"
  instance_class = "db.t4g.small"

  allocated_storage     = 20
  max_allocated_storage = 100  # Auto-scaling de storage
  storage_type          = "gp3"

  db_name  = "myapp"
  username = "app_user"
  password = var.db_password  # Desde Secrets Manager

  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  multi_az            = true   # Alta disponibilidad (duplica costo)
  deletion_protection = true
  skip_final_snapshot = false

  backup_retention_period = 7
  backup_window           = "03:00-04:00"

  performance_insights_enabled = true

  tags = { Environment = "production" }
}
```

### DynamoDB

**Cuándo usarlo:**
- Patrones de acceso predecibles (key-value, key-range)
- Escala masiva de lectura/escritura
- Sessions, carritos de compra, perfiles de usuario simples
- Event sourcing / audit logs
- Tráfico variable extremo (escala a 0 con on-demand)
- Latencia de un solo dígito ms requerida
- Presupuesto muy bajo con tráfico bajo (free tier: 25 WCU + 25 RCU)

**Cuándo NO usarlo:**
- Queries ad-hoc (no conoces los patrones de acceso de antemano)
- JOINs complejos necesarios
- Reportes analíticos sobre los datos
- Schema que evoluciona con queries impredecibles
- Equipo sin experiencia en modelado NoSQL (single-table design es complejo)

**Costo:**
- On-demand: ~$1.25 per 1M writes, ~$0.25 per 1M reads
- Provisioned: más barato si tráfico es predecible
- Storage: $0.25/GB/mes
- Free tier: 25 GB + 25 WCU + 25 RCU (permanente)

### MongoDB Atlas

**Cuándo usarlo:**
- Documentos con schema flexible que cambia frecuentemente
- Catálogos de productos con atributos variables
- Content management
- Prototipado rápido (schema-less)
- Aggregation pipeline para analytics básico
- Equipo con experiencia en MongoDB

**Cuándo NO usarlo:**
- Transacciones multi-documento frecuentes (posible pero no su fuerte)
- Si PostgreSQL con JSONB resuelve el mismo problema
- Presupuesto mínimo (Atlas shared es limitado)

**Costo Atlas:**
- M0 (free): 512 MB storage — solo para dev
- M10: ~$57/mes — producción mínima
- M20: ~$175/mes — producción media

### Redis (ElastiCache)

**Cuándo usarlo:**
- Cache de queries frecuentes (reduce carga en DB principal)
- Sessions de usuario
- Rate limiting
- Colas de trabajo simples (Bull/BullMQ)
- Pub/sub para real-time básico
- Leaderboards, contadores
- Locks distribuidos

**Cuándo NO usarlo:**
- Como base de datos principal (los datos están en RAM)
- Si no hay un problema de rendimiento real (no cache preventivo)

**Costo ElastiCache:**
- cache.t4g.micro: ~$12/mes (0.5 GB)
- cache.t4g.small: ~$24/mes (1.37 GB)
- cache.r7g.large: ~$180/mes (13.07 GB)

**Alternativa:** Upstash Redis — serverless, free tier, ~$0.2 per 100K commands (más barato para tráfico bajo)

## 3. Combinaciones recomendadas

| Escenario | DB Primaria | Cache | Búsqueda |
|-----------|-------------|-------|----------|
| SaaS B2B simple | PostgreSQL | — | PG full-text |
| E-commerce | PostgreSQL | Redis | OpenSearch (si catálogo grande) |
| Marketplace | PostgreSQL | Redis | OpenSearch |
| App con tráfico masivo | DynamoDB | DAX (built-in) | OpenSearch |
| CMS / Blog | PostgreSQL o MongoDB | Redis (opcional) | PG full-text |
| Real-time app (chat) | PostgreSQL (users) | Redis (pub/sub) | — |

## 4. Reglas de decisión por presupuesto

**$0–$50/mes (Mínimo):**
- Neon o Supabase free tier (Postgres)
- Upstash Redis free tier
- DynamoDB on-demand (free tier cubre bajo uso)

**$50–$300/mes (Bajo):**
- Neon Pro ($19/mes) o Supabase Pro ($25/mes)
- O RDS db.t4g.micro (~$13/mes)
- Upstash Redis ($10/mes)

**$300–$1,500/mes (Medio):**
- RDS db.t4g.small/medium ($26–$52/mes)
- ElastiCache si hay problemas de performance
- OpenSearch si necesitan búsqueda avanzada

**$1,500+/mes (Alto):**
- Multi-AZ RDS ($100+/mes)
- ElastiCache cluster
- Read replicas si carga de lectura alta
- OpenSearch Service

## 5. Migraciones y ORM

**PostgreSQL:**
- ORM: Prisma (type-safe, migraciones) o Drizzle (ligero, SQL-first)
- Migraciones: Prisma Migrate o Drizzle Kit
- Siempre migraciones versionadas, nunca ALTER TABLE manual

**DynamoDB:**
- SDK: @aws-sdk/client-dynamodb + @aws-sdk/lib-dynamodb
- Sin migraciones (schema-less) — documentar el modelo de datos

**MongoDB:**
- ODM: Mongoose (si necesitan schema enforcement)
- Migraciones: migrate-mongo

## 6. Gotchas

- PostgreSQL para todo sin evaluar alternativas — DynamoDB puede ser mejor para key-value a escala.
- DynamoDB sin diseñar access patterns primero — single-table design requiere planning upfront.
- MongoDB "porque es más fácil" sin evaluar si Postgres + JSONB basta.
- Redis como DB primaria — es cache, los datos en RAM se pierden.
- Cache prematuro — primero optimizar queries e índices, luego cache.
- RDS Multi-AZ en dev/staging — duplica costo sin beneficio.
- Queries N+1 son más problema de código que de DB — revisar ORM.
- No usar connection pooling en serverless (Lambda) → usar RDS Proxy.
- Almacenar archivos binarios en la DB → usar S3.
- Una DB monolítica para todo cuando hay dominios claramente separados.
