---
name: background-jobs
description: >
  Procesamiento de tareas en background para backend Node.js. Cubre BullMQ
  (queues, workers, scheduling), patrones de retry, dead letter queues,
  cron jobs, prioridades, y monitoreo de jobs. Enfocado en implementación
  en código (qué servicio de queue cloud usar → architecture/messaging).
---

# ⏳ Background Jobs — Queues y Workers

## Principio

> **Si tarda más de 500ms o puede fallar intermitentemente, no lo hagas en el request.**
> Envíalo a una queue y responde inmediatamente al cliente.

---

## ¿Cuándo Usar Background Jobs?

```
✅ USAR PARA:
  - Envío de emails (welcome, password reset, notificaciones)
  - Generación de reportes (PDFs, CSVs)
  - Procesamiento de imágenes (resize, thumbnails)
  - Webhooks salientes (retry si falla)
  - Sincronización con servicios externos
  - Import/export de datos masivos
  - Cron jobs (limpieza, mantenimiento)
  - Notificaciones push

❌ NO USAR PARA:
  - Validación de input → hacerlo en el request
  - Lectura simple de DB → respuesta inmediata
  - Autenticación → bloqueante por naturaleza
```

---

## BullMQ — Setup

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

---

## Agregar Jobs

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

---

## Retry y Backoff

```
ESTRATEGIAS DE RETRY:
  fixed:       Siempre el mismo delay (1s, 1s, 1s)
  exponential: Delay crece exponencialmente (1s, 2s, 4s, 8s)
  custom:      Función custom según el intento

REGLAS:
  1. Siempre poner límite de attempts (3-5 típico)
  2. Exponential backoff por defecto → evita thundering herd
  3. Jobs que fallan N veces → van a dead letter queue
  4. Idempotencia: el worker DEBE poder procesar el mismo job 2+ veces
     sin efectos secundarios duplicados
```

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

---

## Cron Jobs / Scheduled Tasks

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

---

## Dead Letter Queue

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

---

## Monitoreo

```
HERRAMIENTAS:
  Bull Board      → Dashboard web para BullMQ (desarrollo/staging)
  BullMQ Pro      → Métricas avanzadas
  Custom metrics  → Prometheus + Grafana

MÉTRICAS CLAVE:
  - Jobs waiting       → cola creciendo = workers insuficientes
  - Jobs active        → workers ocupados
  - Jobs completed/min → throughput
  - Jobs failed        → tasa de error
  - Job duration avg   → performance del worker
  - DLQ size           → jobs que necesitan atención manual
```

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

---

## Anti-patrones

```
❌ Job no idempotente → retries causan duplicados (cobros dobles, emails dobles)
❌ Datos pesados en el job payload → pasar solo IDs, leer datos en el worker
❌ Sin límite de retry → job fallido se reintenta para siempre
❌ Worker sin error handling → un throw sin catch mata el worker
❌ Cron job en cada instancia → usar BullMQ repeat (se ejecuta una vez)
❌ Jobs sin logging → imposible debuggear failures
❌ Queue sin monitoreo → no sabes si hay 50k jobs atrasados
❌ Worker con side effects no reversibles → transferencia de dinero sin idempotencia
❌ Jobs que dependen de orden → queues no garantizan orden (salvo FIFO explícito)
❌ Redis efímero para jobs críticos → usar Redis con persistencia (AOF)
```
