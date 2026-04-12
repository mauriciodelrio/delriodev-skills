---
name: caching
description: >
  Caching patterns in Node.js backend. Covers Redis (cache-aside,
  write-through), invalidation, TTL, HTTP cache headers, decorator-based
  caching in NestJS, and key naming strategies. Focused on
  code-level implementation (which cache service to use → architecture/).
---

# ⚡ Caching — Cache Patterns

## Principle

> **Cache is a tradeoff: speed vs consistency.**
> Only cache what is read often and changes rarely.
> Invalidation is always harder than caching.

---

## Cache Strategies

```
CACHE-ASIDE (Lazy Loading) — MOST COMMON:
  1. Look up in cache
  2. If exists → return (cache hit)
  3. If not → look up in DB → store in cache → return
  
  ✅ Only caches what is actually queried
  ✅ Cache miss is not fatal (falls back to DB)
  ❌ First query is always slow (cold start)
  ❌ Data can become stale until TTL expires

WRITE-THROUGH:
  1. Write to cache AND DB at the same time
  2. Reads always go to cache
  
  ✅ Cache is always up to date
  ❌ Overhead on writes
  ❌ Caches data that may never be read

WRITE-BEHIND (Write-Back):
  1. Write to cache
  2. Update DB asynchronously
  
  ✅ Ultra-fast writes
  ❌ Risk of data loss if cache goes down
  ❌ High complexity → only for very specific cases
```

---

## Redis — Cache-Aside Implementation

```typescript
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Generic cache service
class CacheService {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

// Usage in a service
async function getProductById(id: string) {
  const cacheKey = `product:${id}`;
  
  // 1. Look up in cache
  const cached = await cache.get<Product>(cacheKey);
  if (cached) return cached;

  // 2. Look up in DB
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new NotFoundError('Product', id);

  // 3. Store in cache (TTL: 5 minutes)
  await cache.set(cacheKey, product, 300);

  return product;
}
```

---

## Key Naming Convention

```
FORMAT: {entity}:{identifier}:{qualifier}

EXAMPLES:
  product:abc123              → Individual product
  products:list:page=1:size=20 → Paginated list
  user:abc123:profile         → User profile
  user:abc123:orders          → User orders
  session:token_xyz           → Session
  config:feature-flags        → Feature flags

RULES:
  ✅ Separate with : (Redis convention)
  ✅ Consistent prefix per entity
  ✅ Predictable keys → easy to invalidate by pattern
  ❌ Keys with sensitive data (passwords, tokens in the key)
  ❌ Keys that are too long (> 200 chars) → compact them
```

---

## TTL (Time To Live) — Guide

```
DATA THAT CHANGES RARELY:
  Feature flags        → 5-15 min
  Global configuration → 10-30 min
  Catalogs/lists       → 5-15 min
  Translations         → 1 hour

DATA THAT CHANGES MODERATELY:
  User profile         → 2-5 min
  Individual product   → 5 min
  Paginated listings   → 1-2 min

DATA THAT CHANGES FREQUENTLY:
  Counters (views)     → 30s-1 min
  Stock                → 30s (or invalidate on write)
  Prices               → 1 min (or invalidate on write)

DATA THAT SHOULD NOT BE CACHED:
  Real-time financial data
  In-progress transaction state
  GDPR-protected data post-deletion
```

---

## Invalidation

```typescript
// STRATEGY 1: Invalidate on write (most consistent)
async function updateProduct(id: string, data: UpdateProductDto) {
  const product = await prisma.product.update({
    where: { id },
    data,
  });

  // Invalidate individual cache + lists
  await cache.del(`product:${id}`);
  await cache.delPattern('products:list:*');

  return product;
}

// STRATEGY 2: Short TTL (simpler, eventual consistency ok)
// Just set a low TTL and don't manually invalidate
await cache.set(key, data, 60); // 1 minute, refreshes on its own

// STRATEGY 3: Cache tags (advanced)
// Tag entries and invalidate by tag
// Useful when a change affects many cache keys
// Custom implementation or use a library (e.g., cacheable)
```

---

## NestJS — Cache Module

```typescript
// NestJS built-in cache with @nestjs/cache-manager
@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        ttl: 300, // Default TTL: 5 min
      }),
      inject: [ConfigService],
    }),
  ],
})

// Usage with decorator
@Controller('products')
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  @Get(':id')
  @UseInterceptors(CacheInterceptor) // Automatic cache for GET
  @CacheTTL(300)                      // Specific TTL: 5 min
  @CacheKey('product')                // Custom key prefix
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }
}
```

---

## HTTP Cache Headers

```typescript
// For responses that the client/CDN can cache

// Static or rarely changing data
res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
// public: CDN can cache
// max-age: browser cache 5 min
// s-maxage: CDN cache 10 min

// User-private data
res.set('Cache-Control', 'private, max-age=60');
// private: browser only, not CDN

// Data that must not be cached
res.set('Cache-Control', 'no-store');
// no-store: neither browser nor CDN

// ETag for conditional requests
res.set('ETag', `"${hash(data)}"`);
// Client sends If-None-Match → 304 if unchanged

// NestJS — header decorator
@Get('config')
@Header('Cache-Control', 'public, max-age=300')
getConfig() { ... }
```

---

## Advanced Patterns

```typescript
// Cache stampede prevention: Mutex/Lock
// When many requests arrive at the same time with a cache miss
async function getWithLock<T>(key: string, fetchFn: () => Promise<T>, ttl: number): Promise<T> {
  const cached = await cache.get<T>(key);
  if (cached) return cached;

  const lockKey = `lock:${key}`;
  const acquired = await redis.set(lockKey, '1', 'EX', 10, 'NX');
  
  if (!acquired) {
    // Another process is populating → wait and retry
    await new Promise((resolve) => setTimeout(resolve, 100));
    return getWithLock(key, fetchFn, ttl);
  }

  try {
    const data = await fetchFn();
    await cache.set(key, data, ttl);
    return data;
  } finally {
    await redis.del(lockKey);
  }
}
```

---

## Anti-patterns

```
❌ Cache everything "just in case" → only cache what is read often and changes rarely
❌ Infinite TTL without invalidation → data stays stale forever
❌ Not handling cache miss gracefully → app breaks if Redis goes down
❌ Keys without structure → impossible to selectively invalidate
❌ Caching sensitive data without considering GDPR → deleted data remains in cache
❌ Cache without monitoring → you don't know if hit rate is 5% or 95%
❌ Invalidating with KEYS * in production → blocks Redis (O(N))
❌ JSON.parse without try/catch → corrupted cache crashes the app
❌ Caching errors → propagating a 500 from cache
❌ No fallback to DB when Redis goes down
```
