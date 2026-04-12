---
name: observability
description: >
  Decision tree for logging, monitoring, alerting, and tracing. Covers
  CloudWatch, Datadog, Sentry, structured logging, custom metrics, dashboards,
  and alerts. Observability is not optional — it is configured from day 1. Includes
  criteria by budget, app complexity, and data volume.
---

# 📊 Observability — Logging, Monitoring, and Alerting

## Principle

> **If you can't observe it, you can't operate it.**
> Observability is configured BEFORE problems occur, not after the first
> production incident. It is part of the initial infrastructure setup.

---

## The Three Pillars

```
1. LOGS    — What happened?     → Record events and errors
2. METRICS — How is it doing?   → Measure health and performance
3. TRACES  — Where did it go?   → Follow requests between services
```

---

## Decision Tree

```
Budget for observability?
│
├── $0–$50/month (Minimal)
│   └── CloudWatch Logs + Metrics (included with AWS)
│       + Sentry free tier (5K errors/month) for frontend error tracking
│       + Free uptime monitoring (Better Uptime, UptimeRobot)
│
├── $50–$300/month (Low)
│   └── CloudWatch Logs + Metrics
│       + Sentry Team ($26/month, 50K errors)
│       + Option: Grafana Cloud free tier for dashboards
│
├── $300–$1,500/month (Medium)
│   └── Datadog ($15/host/month — Infrastructure)
│       Or CloudWatch + X-Ray + Sentry Pro
│       + PagerDuty or Opsgenie for on-call
│
└── $1,500+/month (High)
    └── Datadog full stack (Infra + APM + Logs + RUM)
        Or New Relic, Grafana Cloud Pro
        + PagerDuty + StatusPage
```

---

## Logging

### Structured Logging (Mandatory)

```
RULE: Logs ALWAYS in structured JSON format.
NEVER console.log("Error: " + message) in production.
```

```typescript
// ❌ BAD — unstructured logs
console.log('User login failed for user@email.com');
console.log('Order processed: 12345');
console.error('Database connection failed: ' + error.message);

// ✅ GOOD — structured logging
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
ERROR  → Something failed and needs attention (app errors, DB down)
WARN   → Something unusual but not failed (rate limit near, retry)
INFO   → Important business events (login, order placed, payment)
DEBUG  → Technical details (only in dev, disable in prod)

Production: INFO + WARN + ERROR
Development: DEBUG + INFO + WARN + ERROR

RULE: Do not log sensitive data (passwords, tokens, full PII).
      Mask: email → u***@email.com, card → ****1234
```

### CloudWatch Logs

```
Default configuration for Lambda:
  → Logs are sent automatically to CloudWatch
  → Log Group: /aws/lambda/{function-name}
  → Retention: configure it! (default is INDEFINITE = growing cost)

Recommended retention:
  - Production: 30–90 days in CloudWatch, then S3 if you need historical
  - Staging: 14 days
  - Dev: 7 days
```

```hcl
# Terraform — Log group with retention
resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/myapp-api"
  retention_in_days = 30  # ALWAYS configure retention
}
```

### Log Insights — Useful Queries

```
# Search errors in the last 24h
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 50

# Top 10 most frequent errors
fields @message
| filter @message like /ERROR/
| stats count(*) as errorCount by @message
| sort errorCount desc
| limit 10

# Request latency
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

### Metrics That Matter

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
  - Request count (per endpoint)
  - Error rate (4xx, 5xx)
  - Latency p50, p95, p99
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
// Lambda Powertools — custom metrics
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

const metrics = new Metrics({
  namespace: 'MyApp',
  serviceName: 'order-service',
});

async function processOrder(order: Order) {
  const start = Date.now();

  try {
    // ... process order
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
When YES:
  ✅ Frontend (React, Next.js) — captures JS errors in the browser
  ✅ Backend — stack traces, request context
  ✅ Intelligent error grouping
  ✅ Release tracking (which deploy introduced which error)
  ✅ Performance monitoring (web vitals, transactions)

Minimum setup (Next.js):
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,  // 10% of transactions (adjust based on volume)
  replaysSessionSampleRate: 0.01,  // 1% of sessions with replay
  replaysOnErrorSampleRate: 1.0,   // 100% of sessions with error
  environment: process.env.NODE_ENV,
});
```

```
Plans:
  - Developer: free (1 user, 5K errors/month)
  - Team: $26/month (unlimited users, 50K errors)
  - Business: $80/month (100K errors, more features)
```

---

## Alerting

### What to Alert On

```
🔴 CRITICAL (notify immediately — PagerDuty/SMS):
  - Error rate > 5% sustained for 5 min
  - API completely down (health check failing)
  - DB down or connections exhausted
  - Disk/storage > 90%
  - Payment processing failing
  - DLQ growing (messages failing)

🟡 WARNING (notify on Slack/email):
  - Error rate > 1% sustained for 10 min
  - Latency p99 > 3s sustained for 10 min
  - Lambda throttling
  - DB connections > 80%
  - Cache hit ratio < 50%
  - SQS queue depth growing

ℹ️ INFO (dashboard, no notification):
  - Deploy completed
  - Scaling events
  - Cost approaching budget threshold
```

### CloudWatch Alarms

```hcl
# Terraform — Error rate alarm
resource "aws_cloudwatch_metric_alarm" "api_errors" {
  alarm_name          = "api-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 60
  statistic           = "Sum"
  threshold           = 10  # > 10 errors in 3 consecutive minutes
  alarm_description   = "API error rate is too high"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  dimensions = {
    ApiName = "myapp-api"
  }
}

# SNS topic → Slack webhook, email, or PagerDuty
resource "aws_sns_topic" "alerts" {
  name = "myapp-alerts"
}
```

---

## Tracing (Distributed)

```
Do you need distributed tracing?
│
├── Monolith → Probably not. Logs with request-id are enough.
│
├── 2-5 services → AWS X-Ray (integrated with Lambda, API GW)
│   Cost: 100K traces free/month, then $5 per 1M traces
│
└── > 5 services → Datadog APM or Grafana Tempo
    → Better UX, service maps, latency breakdown
```

```typescript
// Lambda Powertools — tracing with X-Ray
import { Tracer } from '@aws-lambda-powertools/tracer';

const tracer = new Tracer({ serviceName: 'order-service' });

export const handler = async (event: APIGatewayEvent) => {
  const segment = tracer.getSegment();
  const subsegment = segment?.addNewSubsegment('processOrder');

  try {
    // ... logic
    subsegment?.addAnnotation('orderId', orderId);
    subsegment?.addMetadata('orderDetails', order);
  } finally {
    subsegment?.close();
  }
};
```

---

## Recommended Stack by Budget

| Tier | Logging | Metrics | Errors | Alerting | Tracing |
|------|---------|---------|--------|----------|---------|
| $0–$50 | CloudWatch | CloudWatch | Sentry Free | SNS → Email | — |
| $50–$300 | CloudWatch | CloudWatch | Sentry Team | SNS → Slack | X-Ray |
| $300–$1,500 | CW or Datadog | CW or Datadog | Sentry Pro | PagerDuty | X-Ray |
| $1,500+ | Datadog | Datadog | Sentry/Datadog | PagerDuty | Datadog APM |

---

## Health Checks

```
Every service exposes a health endpoint:

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
      "database": "unhealthy",   ← this one failed
      "cache": "healthy",
      "queue": "healthy"
    }
  }

Use: Route53 Health Checks, ALB Health Checks, or UptimeRobot
```

---

## Anti-patterns

```
❌ "We'll add logging later" → from day 1
❌ console.log in production → structured logging mandatory
❌ Logs without configured retention → cost grows indefinitely
❌ Alerting on everything → alert fatigue, nobody pays attention
❌ Not alerting on anything → you find out from users
❌ Logging PII without masking (emails, passwords, tokens)
❌ Metrics without context (error count without knowing which endpoint)
❌ Dashboard with 50 charts → nobody looks at it. Maximum 8-10 key charts.
❌ Sentry without configuring environment/release → you don't know which deploy caused what
❌ Distributed tracing in a monolith → unnecessary overhead
```
