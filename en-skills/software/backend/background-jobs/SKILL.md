---
name: background-jobs
description: >
  Background task processing for Node.js backend. Covers BullMQ
  (queues, workers, scheduling), retry patterns, dead letter queues,
  cron jobs, priorities, and job monitoring. Focused on code-level
  implementation (which cloud queue service to use → architecture/messaging).
---

# ⏳ Background Jobs — Queues and Workers

## Principle

> **If it takes more than 500ms or can fail intermittently, don't do it in the request.**
> Send it to a queue and respond immediately to the client.

---

## When to Use Background Jobs?

```
✅ USE FOR:
  - Sending emails (welcome, password reset, notifications)
  - Report generation (PDFs, CSVs)
  - Image processing (resize, thumbnails)
  - Outgoing webhooks (retry on failure)
  - Synchronization with external services
  - Bulk data import/export
  - Cron jobs (cleanup, maintenance)
  - Push notifications

❌ DO NOT USE FOR:
  - Input validation → do it in the request
  - Simple DB reads → respond immediately
  - Authentication → blocking by nature
```

---

## BullMQ — Setup

```typescript
// queue.ts — queue definition
import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

// Define queue
export const emailQueue = new Queue('email', {
  connection,
  defaultJobOptions: {
    attempts: 3,                        // Retry 3 times
    backoff: {
      type: 'exponential',              // 1s, 2s, 4s
      delay: 1000,
    },
    removeOnComplete: { count: 1000 },  // Keep last 1000 completed
    removeOnFail: { count: 5000 },      // Keep last 5000 failed
  },
});

// Define worker
export const emailWorker = new Worker(
  'email',
  async (job) => {
    switch (job.name) {
      case 'welcome':
        await sendWelcomeEmail(job.data);
        break;
      case 'password-reset':
        await sendPasswordResetEmail(job.data);
        break;
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  },
  {
    connection,
    concurrency: 5,    // 5 simultaneous jobs
    limiter: {
      max: 10,          // Maximum 10 jobs
      duration: 1000,   // per second (rate limiting)
    },
  },
);
```

---

## Adding Jobs

```typescript
// From a service
async function registerUser(dto: RegisterDto) {
  const user = await this.usersRepo.create(dto);

  // Enqueue welcome email (does not block the response)
  await emailQueue.add('welcome', {
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  return user;
}

// Job with delay
await emailQueue.add('reminder', { userId }, {
  delay: 24 * 60 * 60 * 1000, // Send in 24 hours
});

// Job with priority (lower number = higher priority)
await emailQueue.add('urgent-notification', data, {
  priority: 1,
});

// Unique job (don't duplicate if it already exists)
await emailQueue.add('sync-user', { userId }, {
  jobId: `sync-user:${userId}`, // Same ID = no duplication
});
```

---

## NestJS — BullMQ Module

```typescript
// app.module.ts
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: 'email' }),
    BullModule.registerQueue({ name: 'reports' }),
  ],
})

// email.processor.ts
@Processor('email')
export class EmailProcessor extends WorkerHost {
  constructor(private mailerService: MailerService) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case 'welcome':
        return this.sendWelcome(job.data);
      case 'password-reset':
        return this.sendPasswordReset(job.data);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    logger.error({
      message: 'Job failed',
      queue: 'email',
      jobName: job.name,
      jobId: job.id,
      attempt: job.attemptsMade,
      error: error.message,
    });
  }
}

// Inject queue in a service
@Injectable()
export class UsersService {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async register(dto: RegisterDto) {
    const user = await this.create(dto);
    await this.emailQueue.add('welcome', { userId: user.id });
    return user;
  }
}
```

---

## Retry and Backoff

```
RETRY STRATEGIES:
  fixed:       Always the same delay (1s, 1s, 1s)
  exponential: Delay grows exponentially (1s, 2s, 4s, 8s)
  custom:      Custom function based on the attempt

RULES:
  1. Always set an attempts limit (3-5 is typical)
  2. Exponential backoff by default → avoids thundering herd
  3. Jobs that fail N times → go to dead letter queue
  4. Idempotency: the worker MUST be able to process the same job 2+ times
     without duplicate side effects
```

```typescript
// Idempotent job
async function processPayment(job: Job<{ orderId: string }>) {
  const { orderId } = job.data;
  
  // Check if already processed (idempotency)
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (order.paymentStatus === 'paid') {
    return; // Already processed, skip
  }

  await stripe.charges.create({ ... });
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: 'paid' },
  });
}
```

---

## Cron Jobs / Scheduled Tasks

```typescript
// BullMQ — repeatable jobs
await maintenanceQueue.add(
  'cleanup-expired-sessions',
  {},
  {
    repeat: {
      pattern: '0 3 * * *', // Every day at 3 AM
    },
  },
);

await reportQueue.add(
  'daily-summary',
  {},
  {
    repeat: {
      pattern: '0 8 * * 1-5', // Monday to Friday at 8 AM
    },
  },
);

// NestJS — @nestjs/schedule (alternative without Redis)
@Injectable()
export class TasksService {
  @Cron('0 3 * * *')
  async cleanupExpiredSessions() {
    await this.sessionsService.deleteExpired();
  }

  @Interval(60_000) // Every 60 seconds
  async checkHealthOfExternalServices() {
    await this.healthService.checkAll();
  }
}

// When to use @nestjs/schedule vs BullMQ?
//   @nestjs/schedule: simple tasks, single instance, no retry
//   BullMQ: tasks that need retry, distribution, persistence
```

---

## Dead Letter Queue

```typescript
// Jobs that exceed max attempts go to a DLQ for manual review

const emailWorker = new Worker('email', processor, {
  connection,
});

emailWorker.on('failed', async (job, error) => {
  if (job && job.attemptsMade >= job.opts.attempts!) {
    // Move to DLQ
    await deadLetterQueue.add('email-failed', {
      originalQueue: 'email',
      jobName: job.name,
      jobData: job.data,
      error: error.message,
      failedAt: new Date().toISOString(),
      attempts: job.attemptsMade,
    });
    
    logger.error({
      message: 'Job moved to DLQ',
      queue: 'email',
      jobId: job.id,
    });
  }
});
```

---

## Monitoring

```
TOOLS:
  Bull Board      → Web dashboard for BullMQ (development/staging)
  BullMQ Pro      → Advanced metrics
  Custom metrics  → Prometheus + Grafana

KEY METRICS:
  - Jobs waiting       → queue growing = insufficient workers
  - Jobs active        → workers busy
  - Jobs completed/min → throughput
  - Jobs failed        → error rate
  - Job duration avg   → worker performance
  - DLQ size           → jobs that need manual attention
```

```typescript
// Bull Board setup (development)
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(reportQueue),
  ],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
```

---

## Anti-patterns

```
❌ Non-idempotent job → retries cause duplicates (double charges, double emails)
❌ Heavy data in the job payload → pass only IDs, read data in the worker
❌ No retry limit → failed job retries forever
❌ Worker without error handling → an unhandled throw kills the worker
❌ Cron job on every instance → use BullMQ repeat (runs only once)
❌ Jobs without logging → impossible to debug failures
❌ Queue without monitoring → you don't know if there are 50k backlogged jobs
❌ Worker with non-reversible side effects → money transfer without idempotency
❌ Jobs that depend on order → queues don't guarantee order (unless explicit FIFO)
❌ Ephemeral Redis for critical jobs → use Redis with persistence (AOF)
```
