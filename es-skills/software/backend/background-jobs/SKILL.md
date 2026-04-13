---
name: background-jobs
description: >
  Usa esta skill cuando implementes procesamiento de tareas en
  background para backend Node.js. Cubre BullMQ (queues, workers,
  scheduling), patrones de retry, dead letter queues, cron jobs,
  prioridades y monitoreo. Enfocado en implementación (qué servicio
  de queue cloud usar → architecture/messaging).
---

# Background Jobs — Queues y Workers

## Flujo de trabajo del agente

**1.** Decidir si la tarea requiere background (sección 1).
**2.** Configurar queue y worker con BullMQ (secciones 2–3).
**3.** Integrar con NestJS si aplica (sección 4).
**4.** Configurar retry, backoff e idempotencia (sección 5).
**5.** Agregar cron jobs y DLQ según necesidad (secciones 6–7).
**6.** Verificar contra la lista de gotchas (sección 9).

## 1. Cuándo usar background jobs

**Usar para:** envío de emails (welcome, password reset, notificaciones), generación de reportes (PDFs, CSVs), procesamiento de imágenes (resize, thumbnails), webhooks salientes con retry, sincronización con servicios externos, import/export masivos, cron jobs (limpieza, mantenimiento), notificaciones push.

**No usar para:** validación de input (hacerlo en el request), lectura simple de DB (respuesta inmediata), autenticación (bloqueante por naturaleza).

## 2. BullMQ — Setup

```typescript
// queue.ts — definición de la queue
import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // Requerido por BullMQ
});

// Definir queue
export const emailQueue = new Queue('email', {
  connection,
  defaultJobOptions: {
    attempts: 3,                        // Reintentar 3 veces
    backoff: {
      type: 'exponential',              // 1s, 2s, 4s
      delay: 1000,
    },
    removeOnComplete: { count: 1000 },  // Mantener últimos 1000 completed
    removeOnFail: { count: 5000 },      // Mantener últimos 5000 failed
  },
});

// Definir worker
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
    concurrency: 5,    // 5 jobs simultáneos
    limiter: {
      max: 10,          // Máximo 10 jobs
      duration: 1000,   // por segundo (rate limiting)
    },
  },
);
```

## 3. Agregar Jobs

```typescript
// Desde un service
async function registerUser(dto: RegisterDto) {
  const user = await this.usersRepo.create(dto);

  // Encolar email de bienvenida (no bloquea la respuesta)
  await emailQueue.add('welcome', {
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  return user;
}

// Job con delay
await emailQueue.add('reminder', { userId }, {
  delay: 24 * 60 * 60 * 1000, // Enviar en 24 horas
});

// Job con prioridad (menor número = mayor prioridad)
await emailQueue.add('urgent-notification', data, {
  priority: 1,
});

// Job único (no duplicar si ya existe)
await emailQueue.add('sync-user', { userId }, {
  jobId: `sync-user:${userId}`, // Mismo ID = no se duplica
});
```

## 4. NestJS — BullMQ Module

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

// Inyectar queue en un service
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

## 5. Retry y Backoff

**Estrategias:** fixed (siempre el mismo delay), exponential (crece: 1 s, 2 s, 4 s, 8 s), custom (función según intento).

Siempre poner límite de attempts (3–5 típico). Exponential backoff por defecto para evitar thundering herd. Jobs que fallan N veces van a dead letter queue. El worker DEBE ser idempotente: poder procesar el mismo job 2+ veces sin efectos duplicados.

```typescript
// Job idempotente
async function processPayment(job: Job<{ orderId: string }>) {
  const { orderId } = job.data;
  
  // Verificar si ya se procesó (idempotencia)
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (order.paymentStatus === 'paid') {
    return; // Ya procesado, skip
  }

  await stripe.charges.create({ ... });
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: 'paid' },
  });
}
```

## 6. Cron Jobs / Scheduled Tasks

```typescript
// BullMQ — repeatable jobs
await maintenanceQueue.add(
  'cleanup-expired-sessions',
  {},
  {
    repeat: {
      pattern: '0 3 * * *', // Todos los días a las 3 AM
    },
  },
);

await reportQueue.add(
  'daily-summary',
  {},
  {
    repeat: {
      pattern: '0 8 * * 1-5', // Lunes a viernes a las 8 AM
    },
  },
);

// NestJS — @nestjs/schedule (alternativa sin Redis)
@Injectable()
export class TasksService {
  @Cron('0 3 * * *')
  async cleanupExpiredSessions() {
    await this.sessionsService.deleteExpired();
  }

  @Interval(60_000) // Cada 60 segundos
  async checkHealthOfExternalServices() {
    await this.healthService.checkAll();
  }
}

// ¿Cuándo @nestjs/schedule vs BullMQ?
//   @nestjs/schedule: tareas simples, single instance, no retry
//   BullMQ: tareas que necesitan retry, distribución, persistencia
```

## 7. Dead Letter Queue

```typescript
// Jobs que exceden max attempts van a una DLQ para revisión manual

const emailWorker = new Worker('email', processor, {
  connection,
});

emailWorker.on('failed', async (job, error) => {
  if (job && job.attemptsMade >= job.opts.attempts!) {
    // Mover a DLQ
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

## 8. Monitoreo

**Herramientas:** Bull Board (dashboard web, desarrollo/staging), BullMQ Pro (métricas avanzadas), custom metrics (Prometheus + Grafana).

**Métricas clave:** jobs waiting (cola creciendo = workers insuficientes), jobs active (workers ocupados), jobs completed/min (throughput), jobs failed (tasa de error), job duration avg (performance), DLQ size (atención manual).

```typescript
// Bull Board setup (desarrollo)
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

## 9. Gotchas

- Job no idempotente — retries causan duplicados (cobros dobles, emails dobles).
- Datos pesados en el job payload — pasar solo IDs, leer datos en el worker.
- Sin límite de retry — job fallido se reintenta para siempre.
- Worker sin error handling — un throw sin catch mata el worker.
- Cron job en cada instancia — usar BullMQ repeat (se ejecuta una vez).
- Jobs sin logging — imposible debuggear failures.
- Queue sin monitoreo — no sabes si hay 50k jobs atrasados.
- Worker con side effects no reversibles — transferencia de dinero sin idempotencia.
- Jobs que dependen de orden — queues no garantizan orden (salvo FIFO explícito).
- Redis efímero para jobs críticos — usar Redis con persistencia (AOF).
