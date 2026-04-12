---
name: databases
description: >
  Decision tree for choosing databases. Covers SQL (RDS PostgreSQL/MySQL),
  NoSQL (DynamoDB, MongoDB Atlas), cache (ElastiCache Redis), search (OpenSearch).
  Includes criteria by data type, access patterns, scale, cost, and
  operational complexity. Does not assume technology — decides based on context.
---

# 🗄️ Databases — Where to Store Data

## Main Decision Tree

```
What type of data?
│
├── Transactional (orders, payments, users, inventory)
│   └── Complex relationships between entities?
│       ├── YES → PostgreSQL (RDS)
│       └── NO → Massive scale with simple access patterns?
│               ├── YES → DynamoDB
│               └── NO → PostgreSQL (more versatile)
│
├── Documents/flexible content (CMS, catalogs, configurations)
│   └── Schema changes frequently?
│       ├── YES → MongoDB Atlas or DynamoDB
│       └── NO → PostgreSQL with JSONB
│
├── Sessions/cache/temporary data
│   └── Redis (ElastiCache)
│
├── Full-text search / text analytics
│   └── OpenSearch (Elasticsearch)
│       Alternative: PostgreSQL full-text if search is simple
│
├── Analytics / Data Warehouse
│   └── Volume > 1 TB?
│       ├── YES → Redshift or Athena (S3 + queries)
│       └── NO → PostgreSQL with materialized views
│
└── Time-series (metrics, IoT, logs)
    └── Amazon Timestream or InfluxDB
```

---

## Detailed Options

### PostgreSQL (Amazon RDS)

```
When YES:
  ✅ Transactional data with relationships (ACID mandatory)
  ✅ Payments, orders, users, inventory
  ✅ You need complex JOINs
  ✅ Basic full-text search (tsvector — avoid OpenSearch if sufficient)
  ✅ JSONB for semi-structured data (best of SQL + NoSQL)
  ✅ PostGIS for geospatial data
  ✅ The project is new and you don't know which access pattern will dominate
  ✅ Strong ecosystem: Prisma, Drizzle, TypeORM

When NO:
  ❌ Massive write scale (> 50K writes/s sustained) → DynamoDB
  ❌ Data without relationships with pure key-value patterns → DynamoDB
  ❌ $0 budget and the project is a hobby → Neon/Supabase free tier

RDS cost tiers:
  - db.t4g.micro:  ~$13/month  (2 vCPU, 1 GB — dev/staging)
  - db.t4g.small:  ~$26/month  (2 vCPU, 2 GB — low production)
  - db.t4g.medium: ~$52/month  (2 vCPU, 4 GB — medium production)
  - db.r6g.large:  ~$175/month (2 vCPU, 16 GB — high production)
  Storage: ~$0.115/GB/month (gp3)

Cheaper managed alternatives:
  - Neon: serverless Postgres, generous free tier, scales to 0
  - Supabase: Postgres + Auth + Storage, free tier, $25/month Pro
  - PlanetScale: MySQL serverless (if they prefer MySQL)
```

```hcl
# Terraform — RDS PostgreSQL
resource "aws_db_instance" "main" {
  identifier     = "myapp-db"
  engine         = "postgres"
  engine_version = "16.4"
  instance_class = "db.t4g.small"

  allocated_storage     = 20
  max_allocated_storage = 100  # Storage auto-scaling
  storage_type          = "gp3"

  db_name  = "myapp"
  username = "app_user"
  password = var.db_password  # From Secrets Manager

  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  multi_az            = true   # High availability (doubles cost)
  deletion_protection = true
  skip_final_snapshot = false

  backup_retention_period = 7
  backup_window           = "03:00-04:00"

  performance_insights_enabled = true

  tags = { Environment = "production" }
}
```

### DynamoDB

```
When YES:
  ✅ Predictable access patterns (key-value, key-range)
  ✅ Massive read/write scale
  ✅ Sessions, shopping carts, simple user profiles
  ✅ Event sourcing / audit logs
  ✅ Extreme variable traffic (scales to 0 with on-demand)
  ✅ Single-digit ms latency required
  ✅ Very low budget with low traffic (free tier: 25 WCU + 25 RCU)

When NO:
  ❌ Ad-hoc queries (you don't know access patterns beforehand)
  ❌ You need complex JOINs
  ❌ Analytical reports on the data
  ❌ Schema that evolves with unpredictable queries
  ❌ Team without NoSQL modeling experience (single-table design is complex)

Cost:
  - On-demand: ~$1.25 per 1M writes, ~$0.25 per 1M reads
  - Provisioned: cheaper if traffic is predictable
  - Storage: $0.25/GB/month
  - Free tier: 25 GB + 25 WCU + 25 RCU (permanent)
```

### MongoDB Atlas

```
When YES:
  ✅ Documents with flexible schema that changes frequently
  ✅ Product catalogs with variable attributes
  ✅ Content management
  ✅ Rapid prototyping (schema-less)
  ✅ Aggregation pipeline for basic analytics
  ✅ Team already has MongoDB experience

When NO:
  ❌ Frequent multi-document transactions (possible but not its strength)
  ❌ If PostgreSQL with JSONB solves the same problem
  ❌ Minimal budget (Atlas shared is limited)

Atlas cost:
  - M0 (free): 512 MB storage — dev only
  - M10: ~$57/month — minimal production
  - M20: ~$175/month — medium production
```

### Redis (ElastiCache)

```
When YES:
  ✅ Cache for frequent queries (reduces load on primary DB)
  ✅ User sessions
  ✅ Rate limiting
  ✅ Simple job queues (Bull/BullMQ)
  ✅ Pub/sub for basic real-time
  ✅ Leaderboards, counters
  ✅ Distributed locks

When NO:
  ❌ As a primary database (data is in RAM)
  ❌ If there's no real performance problem (no preventive caching)

ElastiCache cost:
  - cache.t4g.micro:  ~$12/month (0.5 GB)
  - cache.t4g.small:  ~$24/month (1.37 GB)
  - cache.r7g.large:  ~$180/month (13.07 GB)

Alternative:
  - Upstash Redis: serverless, free tier, ~$0.2 per 100K commands
    (cheaper for low traffic)
```

---

## When to Use Combinations

| Scenario | Primary DB | Cache | Search |
|----------|------------|-------|--------|
| Simple B2B SaaS | PostgreSQL | — | PG full-text |
| E-commerce | PostgreSQL | Redis | OpenSearch (if large catalog) |
| Marketplace | PostgreSQL | Redis | OpenSearch |
| App with massive traffic | DynamoDB | DAX (built-in) | OpenSearch |
| CMS / Blog | PostgreSQL or MongoDB | Redis (optional) | PG full-text |
| Real-time app (chat) | PostgreSQL (users) | Redis (pub/sub) | — |

---

## Decision Rules by Budget

```
$0–$50/month (Minimal):
  → Neon or Supabase free tier (Postgres)
  → Upstash Redis free tier
  → DynamoDB on-demand (free tier covers low usage)

$50–$300/month (Low):
  → Neon Pro ($19/month) or Supabase Pro ($25/month)
  → Or RDS db.t4g.micro (~$13/month)
  → Upstash Redis ($10/month)

$300–$1,500/month (Medium):
  → RDS db.t4g.small/medium ($26–$52/month)
  → ElastiCache if there are performance issues
  → OpenSearch if advanced search is needed

$1,500+/month (High):
  → Multi-AZ RDS ($100+/month)
  → ElastiCache cluster
  → Read replicas if read load is high
  → OpenSearch Service
```

---

## Migrations and ORM

```
PostgreSQL:
  - ORM: Prisma (type-safe, migrations) or Drizzle (lightweight, SQL-first)
  - Migrations: Prisma Migrate or Drizzle Kit
  - Rule: always versioned migrations, never manual ALTER TABLE

DynamoDB:
  - SDK: @aws-sdk/client-dynamodb + @aws-sdk/lib-dynamodb
  - No migrations (schema-less) — but document the data model

MongoDB:
  - ODM: Mongoose (if schema enforcement is needed)
  - Migrations: migrate-mongo
```

---

## Anti-patterns

```
❌ PostgreSQL for EVERYTHING without evaluating alternatives
❌ DynamoDB without designing access patterns first (single-table design requires planning)
❌ MongoDB "because it's easier" without evaluating if Postgres + JSONB is enough
❌ Redis as primary DB (it's cache — data in RAM is lost)
❌ Premature caching (first optimize queries, indexes, then cache)
❌ RDS Multi-AZ in dev/staging (doubles cost with no benefit)
❌ N+1 queries (more of a code problem than a DB one — review ORM)
❌ Not using connection pooling in serverless (Lambda) → use RDS Proxy
❌ Storing binary files in the DB → use S3
❌ A monolithic DB for everything when there are clearly separate domains
```
