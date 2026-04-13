---
name: logging
description: >
  Usa esta skill cuando implementes logging estructurado en backend
  Node.js. Cubre Pino, log levels, sensitive data masking, request
  logging middleware, health endpoints, correlación de logs, y
  formato JSON para observabilidad. Monitoreo/alerting de infra
  → architecture/observability.
---

# Logging — Logs Estructurados

## Flujo de trabajo del agente

**1.** Elegir stack de logging (sección 1).
**2.** Configurar Pino con redact (sección 2).
**3.** Definir log levels para cada entorno (sección 3).
**4.** Implementar structured logging en formato JSON (sección 4).
**5.** Agregar request logging middleware (sección 5).
**6.** Configurar child loggers y data masking (secciones 6–7).
**7.** Implementar health endpoints (sección 8).
**8.** Verificar contra la lista de gotchas (sección 9).

## 1. Stack de Logging

**Pino (preferido):** JSON structured logging nativo, más rápido que Winston (10x en benchmarks), low overhead en producción, pino-pretty para desarrollo (human-readable), child loggers para context scoping.

**Winston (alternativa):** múltiples transports (file, console, external), ecosistema maduro, pero más lento que Pino y más configuración necesaria. Usar solo si ya existe en el proyecto.

## 2. Setup de Pino

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  
  // Producción: JSON plano (parseado por CloudWatch, Datadog, etc.)
  // Desarrollo: pino-pretty para legibilidad
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

  // Redactar datos sensibles automáticamente
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

  // Serializers custom
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});
```

## 3. Log Levels

**fatal:** app no puede continuar, va a morir (ej: DB connection lost permanently).
**error:** operación falló, pero app sigue funcionando (ej: Payment processing failed).
**warn:** algo inesperado pero no es un error (ej: Retry attempt 3/5).
**info:** eventos significativos del negocio (ej: User registered, Order created).
**debug:** información para debugging (ej: Query executed, Cache hit/miss).
**trace:** muy detallado, solo para investigar bugs (ej: Function entry/exit).

Producción: `level = 'info'` (info + warn + error + fatal). Desarrollo: `level = 'debug'` (todo menos trace). Debugging: `level = 'trace'` (temporalmente).

```typescript
// Ejemplos correctos por nivel
logger.info({ userId: 'usr_123', action: 'register' }, 'User registered');
logger.warn({ service: 'stripe', attempt: 3 }, 'Payment retry');
logger.error({ orderId: 'ord_456', error: err.message }, 'Order processing failed');
logger.debug({ query: 'findMany', duration: '45ms' }, 'DB query executed');
logger.fatal({ error: err.message }, 'Database connection lost');
```

## 4. Structured Logging — Formato

```typescript
// ✅ SIEMPRE log estructurado (objeto + mensaje)
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

// ❌ NUNCA string concatenation
logger.info(`User ${userId} created order ${orderId} for $${total}`);
// → No parseable, no agregable, no filtrable
```

## 5. Request Logging

```typescript
// Express — con pino-http
import pinoHttp from 'pino-http';

app.use(pinoHttp({
  logger,
  
  // Agregar request ID a todos los logs del request
  genReqId: (req) => req.headers['x-request-id'] || randomUUID(),
  
  // Custom log message
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  
  // No loguear health checks
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
  
  // Redactar headers sensibles
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      query: req.query,
      // NO incluir: headers.authorization, headers.cookie
    }),
  },
}));

// NestJS — interceptor de logging
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
// Crear child logger con contexto del request
function createRequestLogger(req: Request) {
  return logger.child({
    requestId: req.requestId,
    userId: req.user?.id,
    path: req.originalUrl,
  });
}

// Todos los logs dentro del request incluyen el contexto automáticamente
const reqLogger = createRequestLogger(req);
reqLogger.info({ orderId: 'ord_123' }, 'Processing order');
// Output incluye: requestId, userId, path + orderId + mensaje

// NestJS — usar INQUIRER scope o cls-hooked para context propagation
```

## 7. Sensitive Data Masking

**Nunca loguear:** passwords (plain text o hashed), JWT tokens completos, API keys / secrets, credit card numbers, SSN / documentos de identidad, session tokens, datos médicos, full request body de login/register.

**Sí loguear:** User IDs (no PII), request IDs, HTTP method + path, status codes, duration, error codes (no mensajes internos en producción), business events (user registered, order created).

```typescript
// Masking manual para casos especiales
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
// GET /health — Liveness probe (app está viva)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /health/ready — Readiness probe (app puede recibir tráfico)
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

// REGLAS:
//   ✅ /health NO requiere auth
//   ✅ /health NO se loguea (evitar log noise)
//   ✅ /health/ready verifica dependencias críticas
//   ✅ Kubernetes usa liveness + readiness probes
```

## 9. Gotchas

- `console.log` en producción — usar logger estructurado.
- Loguear datos sensibles — passwords, tokens, PII.
- String interpolation en logs — no parseable.
- Log level `debug` en producción — performance hit + noise.
- No incluir request ID — imposible correlacionar logs.
- Loguear el body completo de cada request — datos sensibles + volumen.
- Logger sin redact — datos sensibles se escapan.
- `try/catch` que solo hace `console.error(e)` — sin contexto, sin estructura.
- Health endpoint que requiere auth — K8s no puede verificar.
- Logs sin timestamp — imposible ordenar cronológicamente.

## Skills Relacionadas

| Skill | Por qué |
|-------|--------|
| `error-handling` | Logging de errores con contexto y stack traces |
| `security` | NO loguear PII, passwords, tokens, secrets |
| `governance/gdpr` | PII masking, data retention en logs |
| `governance/hipaa` | PHI audit trails (si aplica) |
| `testing` | Verificar que logs se emiten correctamente |
