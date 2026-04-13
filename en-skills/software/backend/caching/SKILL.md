---
name: caching
description: >
  Use this skill when implementing caching patterns in a Node.js
  backend. Covers Redis (cache-aside, write-through), invalidation,
  TTL, HTTP cache headers, decorator-based caching in NestJS, and
  key naming. Focused on implementation (which cache service to
  use → architecture/).
---

# Caching — Cache Patterns

## Agent workflow

**1.** Choose cache strategy based on use case (section 1).
**2.** Implement CacheService with Redis (section 2).
**3.** Define key naming and TTLs (sections 3–4).
**4.** Configure invalidation and HTTP cache headers (sections 5–7).
**5.** Check against the gotchas list (section 9).

## 1. Cache Strategies

**Cache-aside (lazy loading)** — most common:
Look up in cache → if hit, return → if miss, look up in DB → store in cache → return. Only caches what is actually queried. Cache miss is not fatal (falls back to DB). First query is always slow (cold start). Data can become stale until TTL expires.

**Write-through:**
Write to cache and DB at the same time. Reads always from cache. Cache is always up to date, but overhead on writes and caches data that may never be read.

**Write-behind (write-back):**
Write to cache, update DB asynchronously. Ultra-fast writes but risk of data loss if cache goes down. Only for very specific cases.

## 2. Redis — Cache-Aside Implementation

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

## 3. Key Naming Convention

Format: `{entity}:{identifier}:{qualifier}`

- `product:abc123` — individual product
- `products:list:page=1:size=20` — paginated list
- `user:abc123:profile` — user profile
- `user:abc123:orders` — user orders
- `session:token_xyz` — session
- `config:feature-flags` — feature flags

Separate with `:` (Redis convention). Consistent prefix per entity. Predictable keys for pattern invalidation. No sensitive data in the key. Don't exceed ~200 chars.

## 4. TTL (Time To Live)

**Changes rarely:** feature flags (5–15 min), global configuration (10–30 min), catalogs/lists (5–15 min), translations (1 h).

**Changes moderately:** user profile (2–5 min), individual product (5 min), paginated listings (1–2 min).

**Changes frequently:** counters/views (30 s–1 min), stock (30 s or invalidate on write), prices (1 min or invalidate on write).

**Do not cache:** real-time financial data, in-progress transaction state, GDPR-protected data post-deletion.

## 5. Invalidation

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

## 6. NestJS — Cache Module

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

## 7. HTTP Cache Headers

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

## 8. Advanced Patterns

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

## 9. Gotchas

- Cache everything "just in case" — only cache what is read often and changes rarely.
- Infinite TTL without invalidation — data stays stale forever.
- Not handling cache miss — app breaks if Redis goes down.
- Keys without structure — impossible to selectively invalidate.
- Caching sensitive data without considering GDPR — deleted data remains in cache.
- Cache without monitoring — you don't know if hit rate is 5% or 95%.
- Invalidating with `KEYS *` in production — blocks Redis (O(N)).
- `JSON.parse` without try/catch — corrupted cache crashes the app.
- Caching errors — propagating a 500 from cache.
- No fallback to DB when Redis goes down.
