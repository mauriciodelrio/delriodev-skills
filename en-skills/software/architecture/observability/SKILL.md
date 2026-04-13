---
name: observability
description: >
  Use this skill when you need to configure logging, monitoring, alerting,
  or tracing. Covers CloudWatch, Datadog, Sentry, structured logging, custom
  metrics, and alerts. Observability is configured from day 1, not after
  the first incident.
---

# Observability — Logging, Monitoring, and Alerting

## Agent workflow

1. Determine observability budget (section 1).
2. Configure structured logging (section 2).
3. Define key metrics by layer: infra, app, business (section 3).
4. Configure error tracking and alerts (sections 4–5).
5. Evaluate whether distributed tracing is needed (section 6).

> If you can't observe it, you can't operate it. Observability is part of
> the initial setup, not something added after the first incident.

**The three pillars:** **Logs** (What happened? → events and errors), **Metrics** (How is it doing? → health and performance), **Traces** (Where did it go? → requests between services).

## 1. Decision tree

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

## 2. Logging

### Structured logging (mandatory)

**Rule:** Logs always in structured JSON format. Never `console.log("Error: " + message)` in production.

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

- **ERROR** → Something failed and needs attention (app errors, DB down)
- **WARN** → Something unusual but not failed (rate limit near, retry)
- **INFO** → Important business events (login, order placed, payment)
- **DEBUG** → Technical details (only in dev, disable in prod)

**Production:** INFO + WARN + ERROR. **Development:** DEBUG + INFO + WARN + ERROR.

**Rule:** Do not log sensitive data (passwords, tokens, full PII). Mask: email → `u***@email.com`, card → `****1234`.

### CloudWatch Logs

Lambda sends logs automatically to CloudWatch (Log Group: `/aws/lambda/{function-name}`). **Default retention is INDEFINITE** = growing cost. Always configure:

- **Production:** 30–90 days in CloudWatch, then S3 if you need historical
- **Staging:** 14 days
- **Dev:** 7 days

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

## 3. Metrics

### Metrics that matter

**Infrastructure:** CPU utilization (ECS/EC2), memory utilization, Lambda duration + cold starts, Lambda concurrent executions, DB connections (RDS), DB CPU + memory (RDS), cache hit ratio (Redis), queue depth (SQS), DLQ message count (SQS).

**Application:** Request count (per endpoint), error rate (4xx, 5xx), latency p50/p95/p99, successful/failed logins, orders placed/failed, payments processed/failed.

**Business:** Active users (DAU, MAU), revenue processed, feature usage.

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

## 4. Error Tracking — Sentry

**When to use:**
- Frontend (React, Next.js) — captures JS errors in the browser
- Backend — stack traces, request context
- Intelligent error grouping
- Release tracking (which deploy introduced which error)
- Performance monitoring (web vitals, transactions)

**Minimum setup (Next.js):**

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

**Plans:** Developer free (1 user, 5K errors/month). Team $26/month (unlimited users, 50K errors). Business $80/month (100K errors, more features).

## 5. Alerting

### What to alert on

**CRITICAL** (notify immediately — PagerDuty/SMS):
- Error rate > 5% sustained for 5 min
- API completely down (health check failing)
- DB down or connections exhausted
- Disk/storage > 90%
- Payment processing failing
- DLQ growing (messages failing)

**WARNING** (notify on Slack/email):
- Error rate > 1% sustained for 10 min
- Latency p99 > 3s sustained for 10 min
- Lambda throttling
- DB connections > 80%
- Cache hit ratio < 50%
- SQS queue depth growing

**INFO** (dashboard, no notification):
- Deploy completed
- Scaling events
- Cost approaching budget threshold

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

## 6. Tracing (Distributed)

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

## 7. Recommended stack by budget

| Tier | Logging | Metrics | Errors | Alerting | Tracing |
|------|---------|---------|--------|----------|---------|
| $0–$50 | CloudWatch | CloudWatch | Sentry Free | SNS → Email | — |
| $50–$300 | CloudWatch | CloudWatch | Sentry Team | SNS → Slack | X-Ray |
| $300–$1,500 | CW or Datadog | CW or Datadog | Sentry Pro | PagerDuty | X-Ray |
| $1,500+ | Datadog | Datadog | Sentry/Datadog | PagerDuty | Datadog APM |

## 8. Health Checks

Every service exposes a health endpoint:

```json
// GET /health → 200 OK
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
```

```json
// GET /health → 503 Service Unavailable
{
  "status": "unhealthy",
  "checks": {
    "database": "unhealthy",
    "cache": "healthy",
    "queue": "healthy"
  }
}
```

Use Route53 Health Checks, ALB Health Checks, or UptimeRobot.

## 9. Gotchas

- "We'll add logging later" — from day 1.
- `console.log` in production — structured logging mandatory.
- Logs without configured retention — cost grows indefinitely.
- Alerting on everything — alert fatigue, nobody pays attention.
- Not alerting on anything — you find out from users.
- Logging PII without masking (emails, passwords, tokens).
- Metrics without context (error count without knowing which endpoint).
- Dashboard with 50 charts — nobody looks at it; maximum 8–10 key charts.
- Sentry without configuring environment/release — you don't know which deploy caused what.
- Distributed tracing in a monolith — unnecessary overhead.
