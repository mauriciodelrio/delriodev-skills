---
name: caching
description: >
  Patrones de caching en backend Node.js. Cubre Redis (cache-aside,
  write-through), invalidación, TTL, HTTP cache headers, decorator-based
  caching en NestJS, y estrategias de key naming. Enfocado en
  implementación en código (qué servicio de cache usar → architecture/).
---

# ⚡ Caching — Patrones de Cache

## Principio

> **Cache es un tradeoff: velocidad vs consistencia.**
> Solo cachear lo que se lee mucho y cambia poco.
> Invalidar siempre es más difícil que cachear.

---

## Estrategias de Cache

```
CACHE-ASIDE (Lazy Loading) — MÁS COMÚN:
  1. Buscar en cache
  2. Si existe → retornar (cache hit)
  3. Si no existe → buscar en DB → guardar en cache → retornar
  
  ✅ Solo se cachea lo que se consulta
  ✅ Cache miss no es fatal (va a DB)
  ❌ Primera consulta siempre lenta (cold start)
  ❌ Datos pueden quedar stale hasta expirar TTL

WRITE-THROUGH:
  1. Escribir en cache Y en DB al mismo tiempo
  2. Lecturas siempre van al cache
  
  ✅ Cache siempre actualizado
  ❌ Overhead en escrituras
  ❌ Cachea datos que quizás nunca se leen

WRITE-BEHIND (Write-Back):
  1. Escribir en cache
  2. Actualizar DB de forma asíncrona
  
  ✅ Escrituras ultra rápidas
  ❌ Riesgo de pérdida de datos si cache cae
  ❌ Complejidad alta → solo para casos muy específicos
```

---

## Redis — Implementación Cache-Aside

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

---

## Key Naming Convention

```
FORMATO: {entity}:{identifier}:{qualifier}

EJEMPLOS:
  product:abc123              → Producto individual
  products:list:page=1:size=20 → Lista paginada
  user:abc123:profile         → Perfil del usuario
  user:abc123:orders          → Órdenes del usuario
  session:token_xyz           → Sesión
  config:feature-flags        → Feature flags

REGLAS:
  ✅ Separar con : (convención Redis)
  ✅ Prefijo consistente por entidad
  ✅ Keys predecibles → fácil invalidar por patrón
  ❌ Keys con datos sensibles (passwords, tokens en el key)
  ❌ Keys demasiado largos (> 200 chars) → compactar
```

---

## TTL (Time To Live) — Guía

```
DATOS QUE CAMBIAN POCO:
  Feature flags        → 5-15 min
  Configuración global → 10-30 min
  Catálogos/listas     → 5-15 min
  Traducciones         → 1 hora

DATOS QUE CAMBIAN MODERADAMENTE:
  Perfil de usuario    → 2-5 min
  Producto individual  → 5 min
  Listados paginados   → 1-2 min

DATOS QUE CAMBIAN MUCHO:
  Contadores (views)   → 30s-1 min
  Stock                → 30s (o invalidar en write)
  Precios              → 1 min (o invalidar en write)

DATOS QUE NO SE CACHEAN:
  Datos financieros en tiempo real
  Estado de transacciones en progreso
  Datos protegidos por GDPR post-deletion
```

---

## Invalidación

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

---

## NestJS — Cache Module

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

---

## HTTP Cache Headers

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

---

## Patrones Avanzados

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

---

## Anti-patrones

```
❌ Cachear todo "por si acaso" → solo lo que se lee mucho y cambia poco
❌ TTL infinito sin invalidación → datos stale para siempre
❌ No manejar cache miss gracefully → app se rompe si Redis cae
❌ Keys sin estructura → imposible invalidar selectivamente
❌ Cachear datos sensibles sin considerar GDPR → datos borrados siguen en cache
❌ Cache sin monitoreo → no sabes si hit rate es 5% o 95%
❌ Invalidar con KEYS * en producción → bloquea Redis (O(N))
❌ JSON.parse sin try/catch → cache corrupto crashea la app
❌ Cachear errores → propagar un 500 desde cache
❌ No tener fallback a DB cuando Redis cae
```
