---
name: request-pipeline
description: >
  Use this skill when configuring the request processing pipeline in a
  Node.js backend. Covers Express middleware, NestJS guards/interceptors/pipes,
  execution order, CORS, correlation IDs, rate limiting, and middleware
  composition patterns.
---

# Request Pipeline — Middleware and Lifecycle

## Agent workflow

**1.** Identify whether the project uses NestJS or Express (sections 1–2).
**2.** Implement essential middleware: correlation ID, CORS, logger (section 3).
**3.** Configure guards/auth and rate limiting (sections 4, 7).
**4.** Check against the gotchas list (section 8).

## 1. NestJS — Request Lifecycle

```
Incoming request
  │
  ├── 1. Middleware         → Logging, CORS, correlation ID, body parsing
  │                          (like Express middleware, executes before everything)
  │
  ├── 2. Guards             → Authentication, authorization, rate limiting
  │                          (returns true/false, can throw exceptions)
  │
  ├── 3. Interceptors (PRE) → Transform request, start timer, cache check
  │                          (before handler)
  │
  ├── 4. Pipes              → Validation and transformation of params/body/query
  │                          (class-validator, Zod, ParseIntPipe, etc.)
  │
  ├── 5. Controller Handler → Your endpoint logic
  │
  ├── 6. Interceptors (POST)→ Transform response, logging, cache set
  │                          (after handler)
  │
  └── 7. Exception Filters  → Catch exceptions, format error response
                              (if something failed at any step)
```

## 2. Express — Middleware Order

```
Incoming request
  │
  ├── 1. Helmet              → Security headers
  ├── 2. CORS                → Cross-origin config
  ├── 3. Body parser         → JSON/urlencoded parsing
  ├── 4. Correlation ID      → Assign request ID
  ├── 5. Request logger      → Log incoming request
  ├── 6. Rate limiter        → Throttling
  ├── 7. Auth middleware      → Verify JWT, set req.user
  ├── 8. Route handler        → Controller logic
  ├── 9. 404 handler         → Route not found
  └── 10. Error handler      → Catch-all error formatter
```

## 3. Essential Middleware

### Correlation ID

```typescript
// Assigns a unique ID to each request for traceability
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
  credentials: true,         // Required for cookies (refresh token)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,             // Preflight cache: 24 hours
}));

// NestJS — in main.ts
app.enableCors({
  origin: configService.get('ALLOWED_ORIGINS').split(','),
  credentials: true,
});

// RULES:
//   ✅ Always explicit list of origins. NEVER origin: '*' with credentials
//   ✅ In development: localhost:3000 (frontend dev server)
//   ✅ In production: exact frontend domain
//   ❌ origin: true → accepts any origin (insecure)
```

### Request Logger

```typescript
// Express middleware — log each request
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

## 4. NestJS — Guards

```typescript
// Global authentication guard
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if the endpoint is public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    
    return super.canActivate(context);
  }
}

// Decorator to mark public endpoints
export const Public = () => SetMetadata('isPublic', true);

// Usage
@Public()
@Post('login')
async login(@Body() dto: LoginDto) { ... }
```

## 5. NestJS — Interceptors

```typescript
// Timeout interceptor — prevent hanging requests
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      timeout(10_000), // 10 seconds
      catchError((err) => {
        if (err instanceof TimeoutError) {
          throw new RequestTimeoutException('Request timed out');
        }
        throw err;
      }),
    );
  }
}

// Simple cache interceptor
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

## 6. Express — Middleware Composition

```typescript
// Group middleware by concern
const publicRoute = [correlationId, requestLogger];
const protectedRoute = [...publicRoute, authenticate];
const adminRoute = [...protectedRoute, requireRole('admin')];

// Usage
router.get('/products', ...publicRoute, listProducts);
router.post('/products', ...adminRoute, validate(createProductSchema), createProduct);
router.patch('/products/:id', ...protectedRoute, validate(updateProductSchema), updateProduct);
```

## 7. Rate Limiting (code)

```typescript
// Express — express-rate-limit
import rateLimit from 'express-rate-limit';

// Global limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window
  standardHeaders: true,     // RateLimit-* headers
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests' } },
});

// Strict limiter for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,                    // 5 login attempts every 15 min
  skipSuccessfulRequests: true,
});

app.use('/api', globalLimiter);
app.use('/api/auth/login', authLimiter);

// NestJS — @nestjs/throttler
@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,  // 1 minute
      limit: 10,   // 10 requests per minute
    }]),
  ],
})
// Apply globally with APP_GUARD
```

## 8. Gotchas

- Middleware that modifies the body without documenting — hard to debug.
- Guard that queries DB on every request without cache — performance killer.
- Interceptor that silently swallows exceptions — invisible bugs.
- CORS with `origin: '*'` + `credentials: true` — doesn't work and is insecure.
- Rate limiting only at API Gateway without code-level fallback.
- No correlation ID — impossible to trace a request in logs.
- Incorrect middleware order — auth before body parser = crash.
- Middleware that doesn't call `next()` — request hangs.
- try/catch in every controller instead of global exception filter.
