---
name: messaging-and-events
description: >
  Use this skill when you need to decide on inter-service communication and
  async processing. Covers SQS, SNS, EventBridge, WebSockets, and event-driven
  patterns. Evaluate whether the project really needs messaging before
  introducing it.
---

# Messaging & Events — Async Communication Between Services

## Agent workflow

1. Ask whether the project really needs messaging (section 1).
2. Identify the required communication pattern with the decision tree.
3. Select the service (SQS, SNS, EventBridge, WebSockets) based on criteria.
4. Configure using the code examples in the corresponding section.
5. Validate that over-engineering is avoided (section 6).

> A monolith with well-separated functions does NOT need messaging.
> Only introduce it when there is async processing, multiple services
> reacting to the same event, or explicit decoupling needed.

## 1. Decision tree

```
Do you need communication between services?
│
├── NO (monolith) → You don't need messaging. Return early.
│
├── What pattern do you need?
│   │
│   ├── One-to-one: "process this when you can"
│   │   └── SQS (message queue)
│   │       → Emails, image processing, CSV imports
│   │       → Guarantees each message is processed exactly once
│   │
│   ├── One-to-many: "notify everyone that this happened"
│   │   └── SNS (pub/sub)
│   │       → Notify multiple services of the same event
│   │       → Email/SMS notifications
│   │
│   ├── Event bus: "something happened, whoever is interested"
│   │   └── EventBridge
│   │       → Domain events (UserCreated, OrderPlaced)
│   │       → Complex routing rules
│   │       → Integration with AWS services and third parties
│   │
│   ├── Real-time to clients: "show this to the user now"
│   │   └── How many concurrent connections?
│   │       ├── < 1,000 → API Gateway WebSocket API
│   │       ├── 1,000–10,000 → API Gateway WebSocket or Pusher/Ably
│   │       └── > 10,000 → Ably, Pusher, or Socket.io on ECS
│   │
│   └── CQRS/Event Sourcing
│       └── EventBridge + DynamoDB Streams or SQS
```

## 2. Amazon SQS — Message queue

**When to use:**
- Background processing (send emails, generate PDFs)
- Decouple producer from consumer
- Natural rate limiting (consumer processes at its own pace)
- Automatic retry with backoff
- Dead letter queue for messages that fail repeatedly
- Load spikes (queue absorbs the spike)

**When NOT to use:**
- Synchronous communication (request-response) → direct HTTP
- Fan-out to multiple consumers → SNS + SQS
- Real-time to clients → WebSockets

**Types:** Standard (at-least-once, order not guaranteed — most use cases) and FIFO (exactly-once, guaranteed order — payments, sequences; 300 msg/s, 3,000 with batching).

**Cost:** Free tier 1M requests/month (permanent). Standard $0.40/1M requests. FIFO $0.50/1M requests.

### Example: Processing Queue

```yaml
# serverless.yml — Lambda consuming SQS
functions:
  processEmail:
    handler: dist/workers/sendEmail.handler
    events:
      - sqs:
          arn: !GetAtt EmailQueue.Arn
          batchSize: 10  # Process up to 10 messages per invocation
          maximumBatchingWindow: 5  # Wait up to 5s to fill batch

resources:
  Resources:
    EmailQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: email-queue
        VisibilityTimeout: 300  # 5 min (must be > Lambda timeout)
        MessageRetentionPeriod: 1209600  # 14 days
        RedrivePolicy:
          deadLetterTargetArn: !GetAtt EmailDLQ.Arn
          maxReceiveCount: 3  # After 3 failures → DLQ

    EmailDLQ:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: email-dlq
        MessageRetentionPeriod: 1209600
```

```typescript
// Producer — send message to SQS
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({});

async function queueEmail(to: string, template: string, data: Record<string, unknown>) {
  await sqs.send(new SendMessageCommand({
    QueueUrl: process.env.EMAIL_QUEUE_URL,
    MessageBody: JSON.stringify({ to, template, data }),
    MessageGroupId: to,  // Only for FIFO queues
  }));
}
```

## 3. Amazon SNS — Pub/Sub

**When to use:**
- Fan-out: one event → multiple consumers
- Push notifications (email, SMS, HTTP)
- SNS → SQS (each consumer has its own independent queue)
- Monitoring alerts (CloudWatch → SNS → Slack)

**When NOT to use:**
- Simple background processing → SQS directly
- Complex content-based routing → EventBridge
- You need event replay → EventBridge Archive

### Pattern: SNS + SQS Fan-out

```
UserCreated event
      │
      ▼
    [SNS Topic]
      │
      ├── → [SQS: send-welcome-email]    → Lambda: sendEmail
      ├── → [SQS: create-stripe-customer] → Lambda: setupStripe
      └── → [SQS: send-to-analytics]      → Lambda: trackEvent
```

## 4. Amazon EventBridge — Event Bus

**When to use:**
- Event-driven architecture with multiple domains
- Complex content-based routing
- Integration with AWS services (S3, CodePipeline, etc.)
- Integration with SaaS (Stripe, Auth0, Shopify)
- Event replay (Archive & Replay)
- Schema Registry to document events
- Scheduling (EventBridge Scheduler replaces cron)

**When NOT to use:**
- Simple processing queue → SQS
- Minimal budget and only 1-2 events → SQS/SNS is enough
- Throughput > 10,000 events/s per rule → evaluate limits

**Cost:** Custom events $1.00/1M. AWS events free. Schema Registry free. Archive $0.023/GB. Scheduler free.

```typescript
// Publish domain event
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const eventBridge = new EventBridgeClient({});

async function publishEvent(source: string, type: string, detail: unknown) {
  await eventBridge.send(new PutEventsCommand({
    Entries: [{
      Source: source,
      DetailType: type,
      Detail: JSON.stringify(detail),
      EventBusName: process.env.EVENT_BUS_NAME,
    }],
  }));
}

// Usage
await publishEvent('myapp.orders', 'OrderPlaced', {
  orderId: '123',
  userId: 'user-456',
  total: 99.99,
  items: [{ sku: 'ITEM-1', qty: 2 }],
});
```

```yaml
# serverless.yml — Lambda reacting to events
functions:
  onOrderPlaced:
    handler: dist/events/onOrderPlaced.handler
    events:
      - eventBridge:
          eventBus: !Ref AppEventBus
          pattern:
            source:
              - myapp.orders
            detail-type:
              - OrderPlaced
```

## 5. Real-time — WebSockets

### Decision

```
How many concurrent connections?
│
├── < 100 → Long polling with TanStack Query (refetchInterval)
│           → Simple, no additional infra, sufficient for dashboards
│
├── 100–5,000 → API Gateway WebSocket API
│                → Serverless, automatic scaling
│                → $1 per 1M messages + $0.25 per 1M connection-min
│                → Lambda handles connect/disconnect/message
│
├── 1,000–50,000 → Pusher or Ably (managed)
│                   → Pusher: $49/month (Startup plan, 500 concurrent)
│                   → Ably: $29/month (100 concurrent)
│                   → Simple SDK, channels, presence
│
└── > 50,000 → Socket.io on ECS Fargate with Redis adapter
               → Full control but more complex
               → Needs sticky sessions or Redis pub/sub
```

## 6. When to introduce messaging

**Monolith (most projects start here):** You don't need messaging. Async functions with BullMQ + Redis. Migrate when there is real pain (coupling, scalability).

**Modular monolith:** EventBridge for communication between modules. SQS for heavy async work. Keep the shared DB but communicate via events.

**Microservices (only if scale demands it):** EventBridge as backbone. SQS per consumer. Database per service. Saga pattern for distributed transactions.

## 7. Gotchas

- Messaging "just in case" in a monolith — unnecessary complexity.
- Synchronous HTTP between microservices for everything — couples and makes fragile.
- SQS without Dead Letter Queue — messages silently lost.
- Lambda processing SQS with VisibilityTimeout < Lambda timeout.
- EventBridge without Schema Registry — nobody knows what each event contains.
- WebSockets for data that updates every minute — long polling is enough.
- A single giant event bus without source namespacing.
- Not monitoring the DLQ — failing messages accumulating without anyone knowing.
- Events with too much payload — put a reference and let the consumer query.
- Fire-and-forget without confirmation or retry for critical operations.
