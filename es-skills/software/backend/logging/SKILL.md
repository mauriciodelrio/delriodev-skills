---
name: logging
description: >
  Logging estructurado para backend Node.js. Cubre pino (structured logging),
  log levels, sensitive data masking, request logging middleware, health
  endpoints, correlación de logs, y formato JSON para observabilidad.
  Monitoreo/alerting de infraestructura → architecture/observability.
---

# 📋 Logging — Logs Estructurados

## Principio

> **Logs son tu primera línea de diagnóstico.**
> Un buen log te dice QUÉ pasó, CUÁNDO, DÓNDE, y para QUIÉN,
> sin revelar datos sensibles.

---

## Stack de Logging

```
Pino (PREFERIDO):
  ✅ JSON structured logging nativo
  ✅ Más rápido que Winston (10x en benchmarks)
  ✅ Low overhead en producción
  ✅ pino-pretty para desarrollo (human-readable)
  ✅ Child loggers para context scoping

Winston (alternativa):
  ✅ Múltiples transports (file, console, external)
  ✅ Ecosistema maduro
  ❌ Más lento que Pino
  ❌ Más configuración necesaria
  → Usar solo si ya existe en el proyecto
```

---

## Setup de Pino

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

---

## Log Levels

```
LEVEL    CUÁNDO USAR                                    EJEMPLO
─────────────────────────────────────────────────────────────────
fatal    App no puede continuar, va a morir             DB connection lost permanently
error    Operación falló, pero app sigue funcionando    Payment processing failed
warn     Algo inesperado pero no es un error            Retry attempt 3/5
info     Eventos significativos del negocio             User registered, Order created
debug    Información para debugging                     Query executed, Cache hit/miss
trace    Muy detallado, solo para investigar bugs       Function entry/exit

PRODUCCIÓN:  level = 'info' (info + warn + error + fatal)
DEVELOPMENT: level = 'debug' (todo menos trace)
DEBUGGING:   level = 'trace' (temporalmente)
```

```typescript
// Ejemplos correctos por nivel
logger.info({ userId: 'usr_123', action: 'register' }, 'User registered');
logger.warn({ service: 'stripe', attempt: 3 }, 'Payment retry');
logger.error({ orderId: 'ord_456', error: err.message }, 'Order processing failed');
logger.debug({ query: 'findMany', duration: '45ms' }, 'DB query executed');
logger.fatal({ error: err.message }, 'Database connection lost');
```

---

## Structured Logging — Formato

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

---

## Request Logging

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

---

## Child Loggers (Context Scoping)

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

---

## Sensitive Data Masking

```
NUNCA LOGUEAR:
  ❌ Passwords (plain text o hashed)
  ❌ JWT tokens completos
  ❌ API keys / secrets
  ❌ Credit card numbers
  ❌ SSN / documentos de identidad
  ❌ Session tokens
  ❌ Datos médicos
  ❌ Full request body de login/register

SÍ LOGUEAR:
  ✅ User IDs (no PII)
  ✅ Request IDs
  ✅ HTTP method + path
  ✅ Status codes
  ✅ Duration
  ✅ Error codes (no mensajes internos en producción)
  ✅ Business events (user registered, order created)
```

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

---

## Health Endpoints

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

---

## Anti-patrones

```
❌ console.log en producción → usar logger estructurado
❌ Loguear datos sensibles → passwords, tokens, PII
❌ String interpolation en logs → no parseable
❌ Log level 'debug' en producción → performance hit + noise
❌ No incluir request ID → imposible correlacionar logs
❌ Loguear el body completo de cada request → datos sensibles + volumen
❌ Logger sin redact → datos sensibles se escapan
❌ try/catch que solo hace console.error(e) → sin contexto, sin estructura
❌ Health endpoint que requiere auth → K8s no puede verificar
❌ Logs sin timestamp → imposible ordenar cronológicamente
```
