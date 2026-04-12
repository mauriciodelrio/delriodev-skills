---
name: observability
description: >
  Árbol de decisiones para logging, monitoring, alerting y tracing. Cubre
  CloudWatch, Datadog, Sentry, structured logging, métricas custom, dashboards,
  y alertas. Observability no es opcional — se configura desde el día 1. Incluye
  criterios por presupuesto, complejidad de la app, y volumen de datos.
---

# 📊 Observability — Logging, Monitoring y Alerting

## Principio

> **Si no puedes observarlo, no puedes operarlo.**
> Observability se configura ANTES de que haya problemas, no después del primer
> incidente en producción. Es parte del setup inicial de infraestructura.

---

## Los Tres Pilares

```
1. LOGS    — ¿Qué pasó?        → Registrar eventos y errores
2. METRICS — ¿Cómo está?       → Medir salud y performance
3. TRACES  — ¿Por dónde pasó?  → Seguir requests entre servicios
```

---

## Árbol de Decisión

```
¿Presupuesto para observability?
│
├── $0–$50/mes (Mínimo)
│   └── CloudWatch Logs + Metrics (incluido con AWS)
│       + Sentry free tier (5K errors/mes) para error tracking frontend
│       + Uptime monitoring gratis (Better Uptime, UptimeRobot)
│
├── $50–$300/mes (Bajo)
│   └── CloudWatch Logs + Metrics
│       + Sentry Team ($26/mes, 50K errors)
│       + Opción: Grafana Cloud free tier para dashboards
│
├── $300–$1,500/mes (Medio)
│   └── Datadog ($15/host/mes — Infrastructure)
│       O CloudWatch + X-Ray + Sentry Pro
│       + PagerDuty o Opsgenie para on-call
│
└── $1,500+/mes (Alto)
    └── Datadog full stack (Infra + APM + Logs + RUM)
        O New Relic, Grafana Cloud Pro
        + PagerDuty + StatusPage
```

---

## Logging

### Structured Logging (Obligatorio)

```
REGLA: Logs SIEMPRE en formato JSON estructurado.
NUNCA console.log("Error: " + message) en producción.
```

```typescript
// ❌ MALO — logs no estructurados
console.log('User login failed for user@email.com');
console.log('Order processed: 12345');
console.error('Database connection failed: ' + error.message);

// ✅ BUENO — structured logging
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({
  serviceName: 'auth-service',
  logLevel: 'INFO',
});

logger.info('User login failed', {
  userId: 'user-123',
  email: 'user@email.com',
  reason: 'invalid_password',
  attemptNumber: 3,
});

logger.info('Order processed', {
  orderId: '12345',
  userId: 'user-456',
  total: 99.99,
  processingTimeMs: 245,
});

logger.error('Database connection failed', {
  error: error.message,
  host: dbHost,
  retryCount: 2,
});
```

### Log Levels

```
ERROR  → Algo falló y necesita atención (errores de app, DB down)
WARN   → Algo inusual pero no fallido (rate limit near, retry)
INFO   → Eventos de negocio importantes (login, order placed, payment)
DEBUG  → Detalles técnicos (solo en dev, desactivar en prod)

Producción: INFO + WARN + ERROR
Desarrollo: DEBUG + INFO + WARN + ERROR

REGLA: No loguear datos sensibles (passwords, tokens, PII completo).
       Enmascarar: email → u***@email.com, card → ****1234
```

### CloudWatch Logs

```
Configuración por defecto para Lambda:
  → Logs se envían automáticamente a CloudWatch
  → Log Group: /aws/lambda/{function-name}
  → Retención: configurar! (por defecto es INDEFINIDO = costo creciente)

Retención recomendada:
  - Producción: 30–90 días en CloudWatch, luego S3 si necesitas histórico
  - Staging: 14 días
  - Dev: 7 días
```

```hcl
# Terraform — Log group con retención
resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/myapp-api"
  retention_in_days = 30  # SIEMPRE configurar retención
}
```

### Log Insights — Queries Útiles

```
# Buscar errores en las últimas 24h
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 50

# Top 10 errores más frecuentes
fields @message
| filter @message like /ERROR/
| stats count(*) as errorCount by @message
| sort errorCount desc
| limit 10

# Latencia de requests
fields @timestamp, @duration
| filter @type = "REPORT"
| stats avg(@duration) as avgDuration,
        max(@duration) as maxDuration,
        p99(@duration) as p99Duration
| sort @timestamp desc

# Cold starts
fields @timestamp, @initDuration
| filter ispresent(@initDuration)
| stats count(*) as coldStarts, avg(@initDuration) as avgColdStart
```

---

## Metrics

### Métricas que Importan

```
Infrastructure:
  - CPU utilization (ECS/EC2)
  - Memory utilization
  - Lambda duration + cold starts
  - Lambda concurrent executions
  - DB connections (RDS)
  - DB CPU + memory (RDS)
  - Cache hit ratio (Redis)
  - Queue depth (SQS)
  - DLQ message count (SQS)

Application:
  - Request count (por endpoint)
  - Error rate (4xx, 5xx)
  - Latencia p50, p95, p99
  - Successful logins / failed logins
  - Orders placed / failed
  - Payments processed / failed

Business:
  - Active users (DAU, MAU)
  - Revenue processed
  - Feature usage
```

### CloudWatch Custom Metrics

```typescript
// Lambda Powertools — métricas custom
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

const metrics = new Metrics({
  namespace: 'MyApp',
  serviceName: 'order-service',
});

async function processOrder(order: Order) {
  const start = Date.now();

  try {
    // ... procesar orden
    metrics.addMetric('OrderProcessed', MetricUnit.Count, 1);
    metrics.addMetric('OrderValue', MetricUnit.None, order.total);
  } catch (error) {
    metrics.addMetric('OrderFailed', MetricUnit.Count, 1);
    throw error;
  } finally {
    metrics.addMetric('OrderProcessingTime', MetricUnit.Milliseconds, Date.now() - start);
    metrics.publishStoredMetrics();
  }
}
```

---

## Error Tracking — Sentry

```
Cuándo SÍ:
  ✅ Frontend (React, Next.js) — captura errores de JS en el browser
  ✅ Backend — stack traces, contexto de request
  ✅ Agrupación inteligente de errores
  ✅ Release tracking (qué deploy introdujo qué error)
  ✅ Performance monitoring (web vitals, transactions)

Setup mínimo (Next.js):
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,  // 10% de transactions (ajustar según volumen)
  replaysSessionSampleRate: 0.01,  // 1% de sessions con replay
  replaysOnErrorSampleRate: 1.0,   // 100% de sessions con error
  environment: process.env.NODE_ENV,
});
```

```
Planes:
  - Developer: gratis (1 usuario, 5K errors/mes)
  - Team: $26/mes (unlimited usuarios, 50K errors)
  - Business: $80/mes (100K errors, más features)
```

---

## Alerting

### Qué Alertar

```
🔴 CRITICAL (notificar inmediatamente — PagerDuty/SMS):
  - Error rate > 5% sostenido por 5 min
  - API completamente down (health check failing)
  - DB down o conexiones agotadas
  - Disco/storage > 90%
  - Payment processing failing
  - DLQ growing (mensajes fallando)

🟡 WARNING (notificar en Slack/email):
  - Error rate > 1% sostenido por 10 min
  - Latencia p99 > 3s sostenido por 10 min
  - Lambda throttling
  - DB connections > 80%
  - Cache hit ratio < 50%
  - SQS queue depth growing

ℹ️ INFO (dashboard, no notificación):
  - Deploy completed
  - Scaling events
  - Cost approaching budget threshold
```

### CloudWatch Alarms

```hcl
# Terraform — Alarma de error rate
resource "aws_cloudwatch_metric_alarm" "api_errors" {
  alarm_name          = "api-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 60
  statistic           = "Sum"
  threshold           = 10  # > 10 errors en 3 minutos consecutivos
  alarm_description   = "API error rate is too high"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  dimensions = {
    ApiName = "myapp-api"
  }
}

# SNS topic → Slack webhook, email, o PagerDuty
resource "aws_sns_topic" "alerts" {
  name = "myapp-alerts"
}
```

---

## Tracing (Distribuido)

```
¿Necesitas tracing distribuido?
│
├── Monolito → Probablemente no. Logs con request-id basta.
│
├── 2-5 servicios → AWS X-Ray (integrado con Lambda, API GW)
│   Costo: 100K traces gratis/mes, luego $5 per 1M traces
│
└── > 5 servicios → Datadog APM o Grafana Tempo
    → Mejor UX, service maps, latency breakdown
```

```typescript
// Lambda Powertools — tracing con X-Ray
import { Tracer } from '@aws-lambda-powertools/tracer';

const tracer = new Tracer({ serviceName: 'order-service' });

export const handler = async (event: APIGatewayEvent) => {
  const segment = tracer.getSegment();
  const subsegment = segment?.addNewSubsegment('processOrder');

  try {
    // ... lógica
    subsegment?.addAnnotation('orderId', orderId);
    subsegment?.addMetadata('orderDetails', order);
  } finally {
    subsegment?.close();
  }
};
```

---

## Stack Recomendado por Presupuesto

| Tier | Logging | Metrics | Errors | Alerting | Tracing |
|------|---------|---------|--------|----------|---------|
| $0–$50 | CloudWatch | CloudWatch | Sentry Free | SNS → Email | — |
| $50–$300 | CloudWatch | CloudWatch | Sentry Team | SNS → Slack | X-Ray |
| $300–$1,500 | CW o Datadog | CW o Datadog | Sentry Pro | PagerDuty | X-Ray |
| $1,500+ | Datadog | Datadog | Sentry/Datadog | PagerDuty | Datadog APM |

---

## Health Checks

```
Todo servicio expone un endpoint de health:

GET /health → 200 OK
  {
    "status": "healthy",
    "version": "1.2.3",
    "uptime": 3600,
    "checks": {
      "database": "healthy",
      "cache": "healthy",
      "queue": "healthy"
    }
  }

GET /health → 503 Service Unavailable
  {
    "status": "unhealthy",
    "checks": {
      "database": "unhealthy",   ← este falló
      "cache": "healthy",
      "queue": "healthy"
    }
  }

Usar: Route53 Health Checks, ALB Health Checks, o UptimeRobot
```

---

## Anti-patrones

```
❌ "Ya agregamos logging después" → desde el día 1
❌ console.log en producción → structured logging obligatorio
❌ Logs sin retención configurada → costo crece indefinidamente
❌ Alertar por todo → alert fatigue, nadie hace caso
❌ No alertar por nada → te enteras por los usuarios
❌ Loguear PII sin enmascarar (emails, passwords, tokens)
❌ Métricas sin contexto (error count sin saber qué endpoint)
❌ Dashboard con 50 gráficos → nadie lo mira. Máximo 8-10 gráficos clave.
❌ Sentry sin configurar environment/release → no sabes qué deploy causó qué
❌ Tracing distribuido en un monolito → overhead innecesario
```
