---
name: caching
description: >
  Usa esta skill cuando implementes patrones de caching en backend
  Node.js. Cubre Redis (cache-aside, write-through), invalidación,
  TTL, HTTP cache headers, decorator-based caching en NestJS y
  key naming. Enfocado en implementación (qué servicio de cache
  usar → architecture/).
---

# Caching — Patrones de Cache

## Flujo de trabajo del agente

**1.** Elegir estrategia de cache según caso de uso (sección 1).
**2.** Implementar CacheService con Redis (sección 2).
**3.** Definir key naming y TTLs (secciones 3–4).
**4.** Configurar invalidación y HTTP cache headers (secciones 5–7).
**5.** Verificar contra la lista de gotchas (sección 9).

## 1. Estrategias de Cache

**Cache-aside (lazy loading)** — la más común:
Buscar en cache → si hit, retornar → si miss, buscar en DB → guardar en cache → retornar. Solo se cachea lo que se consulta. Cache miss no es fatal (va a DB). Primera consulta siempre lenta (cold start). Datos pueden quedar stale hasta expirar TTL.

**Write-through:**
Escribir en cache y DB al mismo tiempo. Lecturas siempre desde cache. Cache siempre actualizado, pero overhead en escrituras y cachea datos que quizás nunca se leen.

**Write-behind (write-back):**
Escribir en cache, actualizar DB asíncronamente. Escrituras ultra rápidas pero riesgo de pérdida si cache cae. Solo para casos muy específicos.

## 2. Redis — Implementación Cache-Aside

```typescript
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache service genérico
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

// Uso en un service
async function getProductById(id: string) {
  const cacheKey = `product:${id}`;
  
  // 1. Buscar en cache
  const cached = await cache.get<Product>(cacheKey);
  if (cached) return cached;

  // 2. Buscar en DB
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new NotFoundError('Product', id);

  // 3. Guardar en cache (TTL: 5 minutos)
  await cache.set(cacheKey, product, 300);

  return product;
}
```

## 3. Key Naming Convention

Formato: `{entity}:{identifier}:{qualifier}`

- `product:abc123` — producto individual
- `products:list:page=1:size=20` — lista paginada
- `user:abc123:profile` — perfil del usuario
- `user:abc123:orders` — órdenes del usuario
- `session:token_xyz` — sesión
- `config:feature-flags` — feature flags

Separar con `:` (convención Redis). Prefijo consistente por entidad. Keys predecibles para invalidar por patrón. No poner datos sensibles en el key. No exceder ~200 chars.

## 4. TTL (Time To Live)

**Cambian poco:** feature flags (5–15 min), config global (10–30 min), catálogos/listas (5–15 min), traducciones (1 h).

**Cambian moderadamente:** perfil de usuario (2–5 min), producto individual (5 min), listados paginados (1–2 min).

**Cambian mucho:** contadores/views (30 s–1 min), stock (30 s o invalidar en write), precios (1 min o invalidar en write).

**No cachear:** datos financieros en tiempo real, estado de transacciones en progreso, datos protegidos por GDPR post-deletion.

## 5. Invalidación

```typescript
// ESTRATEGIA 1: Invalidar en write (más consistente)
async function updateProduct(id: string, data: UpdateProductDto) {
  const product = await prisma.product.update({
    where: { id },
    data,
  });

  // Invalidar cache individual + listas
  await cache.del(`product:${id}`);
  await cache.delPattern('products:list:*');

  return product;
}

// ESTRATEGIA 2: TTL corto (más simple, eventual consistency ok)
// Solo setear TTL bajo y no invalidar manualmente
await cache.set(key, data, 60); // 1 minuto, se refresca solo

// ESTRATEGIA 3: Cache tags (avanzado)
// Taggear entries y invalidar por tag
// Útil cuando un cambio afecta muchos cache keys
// Implementación custom o usar librería (e.g., cacheable)
```

## 6. NestJS — Cache Module

```typescript
// NestJS built-in cache con @nestjs/cache-manager
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

// Uso con decorator
@Controller('products')
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  @Get(':id')
  @UseInterceptors(CacheInterceptor) // Cache automático para GET
  @CacheTTL(300)                      // TTL específico: 5 min
  @CacheKey('product')                // Key prefix custom
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }
}
```

## 7. HTTP Cache Headers

```typescript
// Para responses que el cliente/CDN puede cachear

// Datos estáticos o que cambian poco
res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
// public: CDN puede cachear
// max-age: browser cache 5 min
// s-maxage: CDN cache 10 min

// Datos privados del usuario
res.set('Cache-Control', 'private, max-age=60');
// private: solo browser, no CDN

// Datos que no se deben cachear
res.set('Cache-Control', 'no-store');
// no-store: ni browser ni CDN

// ETag para conditional requests
res.set('ETag', `"${hash(data)}"`);
// Cliente envía If-None-Match → 304 si no cambió

// NestJS — header decorator
@Get('config')
@Header('Cache-Control', 'public, max-age=300')
getConfig() { ... }
```

## 8. Patrones Avanzados

```typescript
// Cache stampede prevention: Mutex/Lock
// Cuando muchos requests llegan al mismo tiempo con cache miss
async function getWithLock<T>(key: string, fetchFn: () => Promise<T>, ttl: number): Promise<T> {
  const cached = await cache.get<T>(key);
  if (cached) return cached;

  const lockKey = `lock:${key}`;
  const acquired = await redis.set(lockKey, '1', 'EX', 10, 'NX');
  
  if (!acquired) {
    // Otro proceso está populando → esperar y reintentar
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

- Cachear todo "por si acaso" — solo lo que se lee mucho y cambia poco.
- TTL infinito sin invalidación — datos stale para siempre.
- No manejar cache miss — app se rompe si Redis cae.
- Keys sin estructura — imposible invalidar selectivamente.
- Cachear datos sensibles sin considerar GDPR — datos borrados siguen en cache.
- Cache sin monitoreo — no sabes si hit rate es 5% o 95%.
- Invalidar con `KEYS *` en producción — bloquea Redis (O(N)).
- `JSON.parse` sin try/catch — cache corrupto crashea la app.
- Cachear errores — propagar un 500 desde cache.
- No tener fallback a DB cuando Redis cae.
