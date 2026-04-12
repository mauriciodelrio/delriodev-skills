---
name: messaging-and-events
description: >
  Árbol de decisiones para comunicación entre servicios y procesamiento async.
  Cubre SQS, SNS, EventBridge, WebSockets, y patrones event-driven. Incluye
  criterios por tipo de comunicación, volumen, garantías de entrega, y costo.
  No asumir — evaluar si el proyecto realmente necesita mensajería.
---

# 📨 Messaging & Events — Comunicación Async entre Servicios

## Pregunta Fundamental

> **¿Realmente necesitas mensajería?**
> Un monolito con funciones bien separadas NO necesita mensajería.
> Solo introducir cuando hay: procesamiento async, múltiples servicios
> que reaccionan al mismo evento, o desacoplamiento explícito necesario.

---

## Árbol de Decisión

```
¿Necesitas comunicación entre servicios?
│
├── NO (monolito) → No necesitas messaging. Return early.
│
├── ¿Qué patrón necesitas?
│   │
│   ├── One-to-one: "procesa esto cuando puedas"
│   │   └── SQS (cola de mensajes)
│   │       → Emails, procesamiento de imágenes, imports CSV
│   │       → Garantiza que cada mensaje se procesa exactamente una vez
│   │
│   ├── One-to-many: "avísales a todos que pasó esto"
│   │   └── SNS (pub/sub)
│   │       → Notificar a múltiples servicios del mismo evento
│   │       → Email/SMS notifications
│   │
│   ├── Event bus: "algo pasó, a quien le interese"
│   │   └── EventBridge
│   │       → Eventos del dominio (UserCreated, OrderPlaced)
│   │       → Reglas de routing complejas
│   │       → Integración con servicios AWS y terceros
│   │
│   ├── Real-time a clientes: "muéstrale esto al usuario ahora"
│   │   └── ¿Cuántas conexiones concurrentes?
│   │       ├── < 1,000 → API Gateway WebSocket API
│   │       ├── 1,000–10,000 → API Gateway WebSocket o Pusher/Ably
│   │       └── > 10,000 → Ably, Pusher, o Socket.io en ECS
│   │
│   └── CQRS/Event Sourcing
│       └── EventBridge + DynamoDB Streams o SQS
```

---

## Amazon SQS — Cola de Mensajes

```
Cuándo SÍ:
  ✅ Procesamiento en background (enviar emails, generar PDFs)
  ✅ Desacoplar productor de consumidor
  ✅ Rate limiting natural (consumidor procesa a su ritmo)
  ✅ Retry automático con backoff
  ✅ Dead letter queue para mensajes que fallan repetidamente
  ✅ Picos de carga (cola absorbe el pico)

Cuándo NO:
  ❌ Comunicación síncrona (request-response) → HTTP directo
  ❌ Fan-out a múltiples consumidores → SNS + SQS
  ❌ Real-time a clientes → WebSockets

Tipos:
  - Standard:  At-least-once delivery, orden no garantizado
               → La mayoría de casos
  - FIFO:      Exactly-once, orden garantizado
               → Cuando el orden importa (pagos, secuencias)
               → Throughput: 300 msg/s (3,000 con batching)

Costo:
  - Free tier: 1M requests/mes (permanente)
  - Standard:  $0.40 per 1M requests
  - FIFO:      $0.50 per 1M requests
```

### Ejemplo: Cola de Procesamiento

```yaml
# serverless.yml — Lambda consumiendo SQS
functions:
  processEmail:
    handler: dist/workers/sendEmail.handler
    events:
      - sqs:
          arn: !GetAtt EmailQueue.Arn
          batchSize: 10  # Procesar hasta 10 mensajes por invocación
          maximumBatchingWindow: 5  # Esperar hasta 5s para llenar batch

resources:
  Resources:
    EmailQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: email-queue
        VisibilityTimeout: 300  # 5 min (debe ser > timeout del Lambda)
        MessageRetentionPeriod: 1209600  # 14 días
        RedrivePolicy:
          deadLetterTargetArn: !GetAtt EmailDLQ.Arn
          maxReceiveCount: 3  # Después de 3 fallos → DLQ

    EmailDLQ:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: email-dlq
        MessageRetentionPeriod: 1209600
```

```typescript
// Productor — enviar mensaje a SQS
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({});

async function queueEmail(to: string, template: string, data: Record<string, unknown>) {
  await sqs.send(new SendMessageCommand({
    QueueUrl: process.env.EMAIL_QUEUE_URL,
    MessageBody: JSON.stringify({ to, template, data }),
    MessageGroupId: to,  // Solo para FIFO queues
  }));
}
```

---

## Amazon SNS — Pub/Sub

```
Cuándo SÍ:
  ✅ Fan-out: un evento → múltiples consumidores
  ✅ Notificaciones push (email, SMS, HTTP)
  ✅ SNS → SQS (cada consumidor tiene su cola independiente)
  ✅ Alertas de monitoring (CloudWatch → SNS → Slack)

Cuándo NO:
  ❌ Procesamiento en background simple → SQS directamente
  ❌ Routing complejo basado en contenido → EventBridge
  ❌ Necesitas replay de eventos → EventBridge Archive
```

### Patrón: SNS + SQS Fan-out

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

---

## Amazon EventBridge — Event Bus

```
Cuándo SÍ:
  ✅ Arquitectura event-driven con múltiples dominios
  ✅ Routing complejo basado en contenido del evento
  ✅ Integración con servicios AWS (S3, CodePipeline, etc.)
  ✅ Integración con SaaS (Stripe, Auth0, Shopify)
  ✅ Need event replay (Archive & Replay)
  ✅ Schema Registry para documentar eventos
  ✅ Scheduling (EventBridge Scheduler reemplaza cron)

Cuándo NO:
  ❌ Cola simple de procesamiento → SQS
  ❌ Presupuesto mínimo y solo 1-2 eventos → SQS/SNS basta
  ❌ Throughput > 10,000 events/s por regla → evaluar limites

Costo:
  - Custom events: $1.00 per 1M events
  - AWS events: gratis
  - Schema Registry: gratis
  - Archive: $0.023/GB almacenado
  - Scheduler: gratis (invocaciones serverless)
```

```typescript
// Publicar evento de dominio
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

// Uso
await publishEvent('myapp.orders', 'OrderPlaced', {
  orderId: '123',
  userId: 'user-456',
  total: 99.99,
  items: [{ sku: 'ITEM-1', qty: 2 }],
});
```

```yaml
# serverless.yml — Lambda que reacciona a eventos
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

---

## Real-time — WebSockets

### Decisión

```
¿Cuántas conexiones concurrentes?
│
├── < 100 → Long polling con TanStack Query (refetchInterval)
│          → Simple, sin infra adicional, suficiente para dashboards
│
├── 100–5,000 → API Gateway WebSocket API
│               → Serverless, escala automática
│               → $1 per 1M messages + $0.25 per 1M connection-min
│               → Lambda maneja connect/disconnect/message
│
├── 1,000–50,000 → Pusher o Ably (managed)
│                  → Pusher: $49/mes (Startup plan, 500 concurrent)
│                  → Ably: $29/mes (100 concurrent)
│                  → SDK simple, channels, presence
│
└── > 50,000 → Socket.io en ECS Fargate con Redis adapter
              → Control total pero más complejo
              → Necesita sticky sessions o Redis pub/sub
```

---

## Cuándo Introducir Messaging

```
MONOLITO (la mayoría de proyectos empiezan aquí):
  → No necesitas messaging
  → Funciones async: Simple job queue con BullMQ + Redis
  → Cuando sientas dolor real (acoplamiento, escalabilidad), entonces migra

MODULAR MONOLITH:
  → EventBridge para comunicación entre módulos
  → SQS para trabajo async pesado
  → Mantén la DB compartida pero comunica vía eventos

MICROSERVICIOS (solo si escala lo exige):
  → EventBridge como backbone
  → SQS para cada consumidor
  → Cada servicio tiene su DB (database per service)
  → Saga pattern para transacciones distribuidas
```

---

## Anti-patrones

```
❌ Messaging "por si acaso" en un monolito → complejidad innecesaria
❌ HTTP síncrono entre microservicios para todo → acopla y hace frágil
❌ SQS sin Dead Letter Queue → mensajes se pierden silenciosamente
❌ Lambda procesando SQS con VisibilityTimeout < Lambda timeout
❌ EventBridge sin Schema Registry → nadie sabe qué contiene cada evento
❌ WebSockets para datos que se actualizan cada minuto → long polling basta
❌ Un solo event bus gigante sin namespacing de source
❌ No monitorear la DLQ → mensajes failing acumulándose sin que nadie sepa
❌ Eventos con demasiado payload → poner referencia y que el consumidor consulte
❌ Fire-and-forget sin confirmación ni retry para operaciones críticas
```
