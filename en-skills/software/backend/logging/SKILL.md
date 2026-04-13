---
name: logging
description: >
  Use this skill when implementing structured logging in a Node.js
  backend. Covers Pino, log levels, sensitive data masking, request
  logging middleware, health endpoints, log correlation, and JSON
  format for observability. Infrastructure monitoring/alerting
  → architecture/observability.
---

# Logging — Structured Logs

## Agent workflow

**1.** Choose logging stack (section 1).
**2.** Configure Pino with redact (section 2).
**3.** Define log levels per environment (section 3).
**4.** Implement structured logging in JSON format (section 4).
**5.** Add request logging middleware (section 5).
**6.** Configure child loggers and data masking (sections 6–7).
**7.** Implement health endpoints (section 8).
**8.** Check against the gotchas list (section 9).

## 1. Logging Stack

**Pino (preferred):** native JSON structured logging, faster than Winston (10x in benchmarks), low overhead in production, pino-pretty for development (human-readable), child loggers for context scoping.

**Winston (alternative):** multiple transports (file, console, external), mature ecosystem, but slower than Pino and more configuration needed. Use only if already in the project.

## 2. Pino Setup

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  
  // Production: plain JSON (parsed by CloudWatch, Datadog, etc.)
  // Development: pino-pretty for readability
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),

  // Automatically redact sensitive data
  redact: {
    paths: [
      'password',
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
      '*.secret',
      '*.creditCard',
      '*.ssn',
    ],
    censor: '[REDACTED]',
  },

  // Custom serializers
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});
```

## 3. Log Levels

**fatal:** app cannot continue, about to die (e.g.: DB connection lost permanently).
**error:** operation failed, but app keeps running (e.g.: Payment processing failed).
**warn:** something unexpected but not an error (e.g.: Retry attempt 3/5).
**info:** significant business events (e.g.: User registered, Order created).
**debug:** information for debugging (e.g.: Query executed, Cache hit/miss).
**trace:** very detailed, only for investigating bugs (e.g.: Function entry/exit).

Production: `level = 'info'` (info + warn + error + fatal). Development: `level = 'debug'` (everything except trace). Debugging: `level = 'trace'` (temporarily).

```typescript
// Correct examples by level
logger.info({ userId: 'usr_123', action: 'register' }, 'User registered');
logger.warn({ service: 'stripe', attempt: 3 }, 'Payment retry');
logger.error({ orderId: 'ord_456', error: err.message }, 'Order processing failed');
logger.debug({ query: 'findMany', duration: '45ms' }, 'DB query executed');
logger.fatal({ error: err.message }, 'Database connection lost');
```

## 4. Structured Logging — Format

```typescript
// ✅ ALWAYS use structured logging (object + message)
logger.info({
  action: 'order.created',
  orderId: 'ord_123',
  userId: 'usr_456',
  total: 99.99,
  items: 3,
}, 'Order created successfully');

// Output JSON:
// {"level":"info","time":1704067200,"action":"order.created",
//  "orderId":"ord_123","userId":"usr_456","total":99.99,
//  "items":3,"msg":"Order created successfully"}

// ❌ NEVER use string concatenation
logger.info(`User ${userId} created order ${orderId} for $${total}`);
// → Not parseable, not aggregable, not filterable
```

## 5. Request Logging

```typescript
// Express — with pino-http
import pinoHttp from 'pino-http';

app.use(pinoHttp({
  logger,
  
  // Add request ID to all logs for the request
  genReqId: (req) => req.headers['x-request-id'] || randomUUID(),
  
  // Custom log message
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  
  // Don't log health checks
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
  
  // Redact sensitive headers
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      query: req.query,
      // DO NOT include: headers.authorization, headers.cookie
    }),
  },
}));

// NestJS — logging interceptor
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const duration = Date.now() - start;
        
        this.logger.log({
          method: req.method,
          path: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          requestId: req.requestId,
          userId: req.user?.id,
        });
      }),
    );
  }
}
```

## 6. Child Loggers (Context Scoping)

```typescript
// Create child logger with request context
function createRequestLogger(req: Request) {
  return logger.child({
    requestId: req.requestId,
    userId: req.user?.id,
    path: req.originalUrl,
  });
}

// All logs within the request automatically include the context
const reqLogger = createRequestLogger(req);
reqLogger.info({ orderId: 'ord_123' }, 'Processing order');
// Output includes: requestId, userId, path + orderId + message

// NestJS — use INQUIRER scope or cls-hooked for context propagation
```

## 7. Sensitive Data Masking

**Never log:** passwords (plain text or hashed), full JWT tokens, API keys / secrets, credit card numbers, SSN / identity documents, session tokens, medical data, full request body of login/register.

**Do log:** User IDs (not PII), request IDs, HTTP method + path, status codes, duration, error codes (not internal messages in production), business events (user registered, order created).

```typescript
// Manual masking for special cases
function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  return `${user[0]}***@${domain}`;
}

function maskToken(token: string): string {
  return `${token.substring(0, 8)}...${token.substring(token.length - 4)}`;
}
```

## 8. Health Endpoints

```typescript
// GET /health — Liveness probe (app is alive)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /health/ready — Readiness probe (app can receive traffic)
app.get('/health/ready', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {}

  try {
    await redis.ping();
    checks.redis = true;
  } catch {}

  const allHealthy = Object.values(checks).every(Boolean);
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// RULES:
//   ✅ /health DOES NOT require auth
//   ✅ /health IS NOT logged (avoid log noise)
//   ✅ /health/ready verifies critical dependencies
//   ✅ Kubernetes uses liveness + readiness probes
```

## 9. Gotchas

- `console.log` in production — use a structured logger.
- Logging sensitive data — passwords, tokens, PII.
- String interpolation in logs — not parseable.
- Log level `debug` in production — performance hit + noise.
- Not including request ID — impossible to correlate logs.
- Logging the full body of every request — sensitive data + volume.
- Logger without redact — sensitive data leaks out.
- `try/catch` that only does `console.error(e)` — no context, no structure.
- Health endpoint that requires auth — K8s cannot verify.
- Logs without timestamp — impossible to sort chronologically.

## Related Skills

| Skill | Why |
|-------|-----|
| `error-handling` | Error logging with context and stack traces |
| `security` | NEVER log PII, passwords, tokens, secrets |
| `governance/gdpr` | PII masking, data retention in logs |
| `governance/hipaa` | PHI audit trails (if applicable) |
| `testing` | Verify that logs are emitted correctly |
