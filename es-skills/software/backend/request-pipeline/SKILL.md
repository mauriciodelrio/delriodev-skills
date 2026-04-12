---
name: request-pipeline
description: >
  Pipeline de procesamiento de requests en backend Node.js. Cubre
  middleware Express, guards/interceptors/pipes NestJS, orden de ejecución,
  CORS, correlation IDs, rate limiting a nivel de código, y patrones
  de composición de middleware.
---

# 🔄 Request Pipeline — Middleware y Lifecycle

## Principio

> **Cada request pasa por un pipeline predecible.**
> Entender el orden de ejecución es clave para debuggear y para saber
> dónde poner cada pieza de lógica.

---

## NestJS — Lifecycle del Request

```
Request entrante
  │
  ├── 1. Middleware         → Logging, CORS, correlation ID, body parsing
  │                          (como Express middleware, ejecuta antes de todo)
  │
  ├── 2. Guards             → Autenticación, autorización, rate limiting
  │                          (retorna true/false, puede lanzar excepciones)
  │
  ├── 3. Interceptors (PRE) → Transform request, start timer, cache check
  │                          (before handler)
  │
  ├── 4. Pipes              → Validación y transformación de params/body/query
  │                          (class-validator, Zod, ParseIntPipe, etc.)
  │
  ├── 5. Controller Handler → Tu lógica de endpoint
  │
  ├── 6. Interceptors (POST)→ Transform response, logging, cache set
  │                          (after handler)
  │
  └── 7. Exception Filters  → Catch exceptions, format error response
                              (si algo falló en cualquier paso)
```

---

## Express — Orden de Middleware

```
Request entrante
  │
  ├── 1. Helmet              → Security headers
  ├── 2. CORS                → Cross-origin config
  ├── 3. Body parser         → JSON/urlencoded parsing
  ├── 4. Correlation ID      → Asignar request ID
  ├── 5. Request logger      → Log de request entrante
  ├── 6. Rate limiter        → Throttling
  ├── 7. Auth middleware      → Verificar JWT, setear req.user
  ├── 8. Route handler        → Controller logic
  ├── 9. 404 handler         → Ruta no encontrada
  └── 10. Error handler      → Catch-all error formatter
```

---

## Middleware Esenciales

### Correlation ID

```typescript
// Asigna un ID único a cada request para trazabilidad
import { randomUUID } from 'crypto';

// Express
function correlationId(req: Request, res: Response, next: NextFunction) {
  const id = req.headers['x-request-id'] as string || randomUUID();
  req.requestId = id;
  res.setHeader('x-request-id', id);
  next();
}

// NestJS middleware
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const id = (req.headers['x-request-id'] as string) || randomUUID();
    req['requestId'] = id;
    res.setHeader('x-request-id', id);
    next();
  }
}
```

### CORS

```typescript
// Express
import cors from 'cors';

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,         // Necesario para cookies (refresh token)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,             // Preflight cache: 24 horas
}));

// NestJS — en main.ts
app.enableCors({
  origin: configService.get('ALLOWED_ORIGINS').split(','),
  credentials: true,
});

// REGLAS:
//   ✅ Siempre lista explícita de origins. NUNCA origin: '*' con credentials
//   ✅ En desarrollo: localhost:3000 (frontend dev server)
//   ✅ En producción: dominio exacto del frontend
//   ❌ origin: true → acepta cualquier origin (inseguro)
```

### Request Logger

```typescript
// Express middleware — log de cada request
function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.requestId,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  });
  
  next();
}
```

---

## NestJS — Guards

```typescript
// Guard global de autenticación
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Verificar si el endpoint es público
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    
    return super.canActivate(context);
  }
}

// Decorator para marcar endpoints públicos
export const Public = () => SetMetadata('isPublic', true);

// Uso
@Public()
@Post('login')
async login(@Body() dto: LoginDto) { ... }
```

---

## NestJS — Interceptors

```typescript
// Interceptor de timeout — evitar requests colgados
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      timeout(10_000), // 10 segundos
      catchError((err) => {
        if (err instanceof TimeoutError) {
          throw new RequestTimeoutException('Request timed out');
        }
        throw err;
      }),
    );
  }
}

// Interceptor de caché simple
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private cacheService: CacheService) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    if (request.method !== 'GET') return next.handle();

    const key = `cache:${request.url}`;
    const cached = await this.cacheService.get(key);
    if (cached) return of(cached);

    return next.handle().pipe(
      tap((data) => this.cacheService.set(key, data, 60)),
    );
  }
}
```

---

## Express — Composición de Middleware

```typescript
// Agrupar middleware por concern
const publicRoute = [correlationId, requestLogger];
const protectedRoute = [...publicRoute, authenticate];
const adminRoute = [...protectedRoute, requireRole('admin')];

// Uso
router.get('/products', ...publicRoute, listProducts);
router.post('/products', ...adminRoute, validate(createProductSchema), createProduct);
router.patch('/products/:id', ...protectedRoute, validate(updateProductSchema), updateProduct);
```

---

## Rate Limiting (código)

```typescript
// Express — express-rate-limit
import rateLimit from 'express-rate-limit';

// Limiter global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,                  // 100 requests por ventana
  standardHeaders: true,     // RateLimit-* headers
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests' } },
});

// Limiter estricto para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,                    // 5 intentos de login cada 15 min
  skipSuccessfulRequests: true,
});

app.use('/api', globalLimiter);
app.use('/api/auth/login', authLimiter);

// NestJS — @nestjs/throttler
@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,  // 1 minuto
      limit: 10,   // 10 requests por minuto
    }]),
  ],
})
// Aplicar globalmente con APP_GUARD
```

---

## Anti-patrones

```
❌ Middleware que modifica el body sin documentar → difícil de debuggear
❌ Guard que hace query a DB en cada request sin cache → performance killer
❌ Interceptor que traga excepciones silenciosamente → bugs invisibles
❌ CORS con origin: '*' + credentials: true → no funciona y es inseguro
❌ Rate limiting solo en API Gateway sin fallback en código
❌ No tener correlation ID → imposible trazar un request en logs
❌ Orden incorrecto de middleware → auth antes de body parser = crash
❌ Middleware que no llama next() → request se cuelga
❌ try/catch en cada controller en vez de exception filter global
```
