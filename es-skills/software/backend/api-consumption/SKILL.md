---
name: api-consumption
description: >
  Usa esta skill cuando consumas APIs y servicios externos desde
  el backend. Cubre abstracción de clientes HTTP, SDKs, retry con
  backoff exponencial, circuit breaker, timeouts, rate limiting,
  manejo de webhooks, idempotencia, y patrones de resiliencia.
  Complementa api-design (construir APIs) con el CÓMO consumir
  APIs de terceros.
---

# API Consumption — Consumo de APIs Externas

## Flujo de trabajo del agente

**1.** Crear cliente HTTP base con timeout y retry (secciones 1–2).
**2.** Implementar circuit breaker para servicios críticos (sección 3).
**3.** Encapsular cada proveedor en un Service tipado (sección 4).
**4.** Configurar timeouts por tipo de operación (sección 5).
**5.** Implementar webhooks con verificación de firma (sección 6).
**6.** Agregar idempotencia y rate limiting (secciones 7–8).
**7.** Verificar contra la lista de gotchas (sección 9).

---

## Scope

Esta skill cubre: clientes HTTP tipados, SDKs y wrappers de servicios, retry con backoff exponencial, circuit breaker, timeouts y abort, manejo de webhooks entrantes, idempotencia en llamadas. No cubre: diseñar tu propia API → `backend/api-design`, elegir servicios externos → `architecture/*`, autenticación → `backend/auth`.

## 1. Cliente HTTP Base

```typescript
// src/lib/http-client.ts
// Wrapper tipado sobre fetch (Node 18+) o ky/got

interface HttpClientConfig {
  baseURL: string;
  timeout?: number;             // ms, default 10_000
  headers?: Record<string, string>;
  retries?: number;             // default 3
  retryDelay?: number;          // ms base, default 1000
}

interface HttpResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

class HttpClient {
  constructor(private config: HttpClientConfig) {}

  async get<T>(path: string, options?: RequestInit): Promise<HttpResponse<T>> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  async post<T>(path: string, body: unknown, options?: RequestInit): Promise<HttpResponse<T>> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
  }

  private async request<T>(path: string, options: RequestInit): Promise<HttpResponse<T>> {
    const url = `${this.config.baseURL}${path}`;
    const timeout = this.config.timeout ?? 10_000;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetchWithRetry(url, {
        ...options,
        signal: controller.signal,
        headers: { ...this.config.headers, ...options.headers },
      }, {
        retries: this.config.retries ?? 3,
        retryDelay: this.config.retryDelay ?? 1000,
      });

      const data = await response.json() as T;
      return { data, status: response.status, headers: response.headers };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
```

## 2. Retry con Backoff Exponencial

```typescript
interface RetryConfig {
  retries: number;
  retryDelay: number;  // Base delay in ms
  retryOn?: number[];  // Status codes to retry on
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: RetryConfig,
): Promise<Response> {
  const { retries, retryDelay, retryOn = [408, 429, 500, 502, 503, 504] } = config;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);

      // No retry si el status no está en la lista
      if (!retryOn.includes(response.status) || attempt === retries) {
        return response;
      }

      // Respetar Retry-After header si existe
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : retryDelay * Math.pow(2, attempt) + Math.random() * 1000;  // Jitter

      await sleep(delay);
    } catch (error) {
      if (attempt === retries) throw error;

      // Retry en network errors
      if (error instanceof TypeError || (error as Error).name === 'AbortError') {
        const delay = retryDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw new Error('Unreachable');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**Reglas de retry:** solo retry en errores transitorios (5xx, timeout, network). Nunca retry en 4xx (excepto 408, 429). Backoff exponencial: 1s → 2s → 4s → 8s. Siempre añadir jitter (random) para evitar thundering herd. Máximo 3–5 retries. Respetar `Retry-After` header del servidor. Retry solo si la operación es idempotente (GET, PUT, DELETE) — nunca retry en POST sin idempotency key.

## 3. Circuit Breaker

```typescript
// Patrón: Si un servicio falla mucho, dejar de llamarlo temporalmente

enum CircuitState {
  CLOSED = 'CLOSED',       // Normal, requests pasan
  OPEN = 'OPEN',           // Fallando, requests rechazados inmediatamente
  HALF_OPEN = 'HALF_OPEN', // Probando si se recuperó
}

class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor(
    private readonly threshold: number = 5,      // Fallos para abrir
    private readonly resetTimeout: number = 30_000, // Tiempo para probar de nuevo
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new CircuitOpenError('Circuit is open, request rejected');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = CircuitState.OPEN;
    }
  }
}

// Uso
const stripeCircuit = new CircuitBreaker(5, 30_000);

async function chargeCustomer(amount: number) {
  return stripeCircuit.execute(() =>
    stripeClient.charges.create({ amount, currency: 'usd' })
  );
}
```

**Cuándo usar circuit breaker:** servicios de pago (Stripe, PayPal), APIs de terceros no críticas (analytics, email), microservicios internos. Parámetros típicos: threshold 5 fallos consecutivos → abrir circuito, resetTimeout 30 segundos → probar de nuevo. Fallback cuando circuito abierto: retornar respuesta default/cache, encolar para procesamiento posterior, notificar al usuario que el servicio está temporalmente no disponible.

## 4. Abstracción de SDK / Service Client

```typescript
// Cada servicio externo tiene su propio client encapsulado

// src/services/stripe/stripe.service.ts
import Stripe from 'stripe';

interface CreatePaymentInput {
  amount: number;       // centavos
  currency: string;
  customerId: string;
  idempotencyKey: string;
}

interface PaymentResult {
  id: string;
  status: 'succeeded' | 'pending' | 'failed';
  amount: number;
}

class StripeService {
  private client: Stripe;
  private circuit: CircuitBreaker;

  constructor(apiKey: string) {
    this.client = new Stripe(apiKey, { apiVersion: '2024-04-10' });
    this.circuit = new CircuitBreaker(5, 30_000);
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    return this.circuit.execute(async () => {
      const intent = await this.client.paymentIntents.create(
        {
          amount: input.amount,
          currency: input.currency,
          customer: input.customerId,
        },
        { idempotencyKey: input.idempotencyKey },
      );

      return {
        id: intent.id,
        status: this.mapStatus(intent.status),
        amount: intent.amount,
      };
    });
  }

  private mapStatus(status: Stripe.PaymentIntent.Status): PaymentResult['status'] {
    switch (status) {
      case 'succeeded': return 'succeeded';
      case 'requires_action':
      case 'processing': return 'pending';
      default: return 'failed';
    }
  }
}
```

**Reglas de abstracción:** nunca usar SDK directo en controllers/resolvers — siempre encapsular en un Service. Tipos propios para input/output — no exponer tipos de Stripe/AWS/etc al resto de la app, mapear a tipos internos. Un servicio por proveedor externo (StripeService, SendGridService, S3Service). Fijar versión del API (`apiVersion: '2024-04-10'`) — no confiar en default. Inyectar config (no importar de env directamente) — constructor recibe apiKey, facilita testing.

## 5. Timeouts

```typescript
// REGLA: Todo request externo DEBE tener timeout

// Nivel de timeout (de más estricto a más relajado):
//   API calls internos: 3-5s
//   APIs externas: 5-10s
//   Uploads/downloads: 30-60s
//   Webhooks outgoing: 10-15s

// Implementación con AbortController (Node 18+)
async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new TimeoutError(`Request to ${url} timed out after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

## 6. Webhooks — Recibir Eventos de Terceros

```typescript
// POST /webhooks/stripe
async function handleStripeWebhook(req: Request, res: Response) {
  // 1. VERIFICAR FIRMA — SIEMPRE
  const signature = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,          // Raw body, no parseado
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // 2. RESPONDER RÁPIDO — 200 antes de procesar
  //    Si tardas >30s, el proveedor reintenta
  res.status(200).json({ received: true });

  // 3. PROCESAR ASYNC — Encolar el evento
  await eventQueue.add('stripe-webhook', {
    eventId: event.id,
    type: event.type,
    data: event.data.object,
  });
}
```

**Reglas de webhooks:** verificar firma siempre — cada proveedor tiene su método (Stripe: `stripe-signature`, GitHub: `x-hub-signature-256`), nunca confiar en el payload sin verificar. Responder 200 inmediatamente — no procesar en el handler, encolar y procesar en background, si tardas mucho el proveedor reintenta y genera duplicados. Idempotencia — guardar event_id procesados, verificar antes de procesar, webhooks se reenvían. Raw body para verificación — Express: `express.raw()`, NestJS: `@RawBody()`. Endpoint dedicado — `/webhooks/stripe`, `/webhooks/github`, no mezclar con API routes, middleware separado.

## 7. Idempotencia en Llamadas Salientes

```typescript
// Problema: Si haces retry de un POST, podrías crear duplicados
// Solución: Idempotency key

// Stripe soporta idempotency keys nativo
await stripe.charges.create(
  { amount: 2000, currency: 'usd', customer: 'cus_xxx' },
  { idempotencyKey: `charge_${orderId}` },  // Mismo orderId = misma charge
);

// Para APIs sin soporte nativo:
// 1. Generar idempotency key basada en la operación
const idempotencyKey = `${operation}_${entityId}_${timestamp}`;

// 2. Guardar en DB antes de llamar
await db.externalCalls.create({
  idempotencyKey,
  status: 'pending',
  request: payload,
});

// 3. Antes de ejecutar, verificar si ya se completó
const existing = await db.externalCalls.findUnique({
  where: { idempotencyKey },
});
if (existing?.status === 'completed') {
  return existing.response;
}

// 4. Ejecutar y guardar resultado
const result = await externalApi.call(payload);
await db.externalCalls.update({
  where: { idempotencyKey },
  data: { status: 'completed', response: result },
});
```

## 8. Rate Limiting de Llamadas Salientes

```typescript
// Respetar rate limits del proveedor

class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,     // Requests por ventana
    private refillRate: number,    // ms entre refills
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
      return;
    }
    // Esperar hasta el próximo refill
    const waitTime = this.refillRate - (Date.now() - this.lastRefill);
    await sleep(waitTime);
    return this.acquire();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = Math.floor(elapsed / this.refillRate) * this.maxTokens;
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }
}

// Uso: Stripe permite ~100 req/s
const stripeRateLimiter = new RateLimiter(100, 1000);

async function callStripe() {
  await stripeRateLimiter.acquire();
  return stripe.charges.list();
}
```

## 9. Gotchas

- Llamar APIs externas sin timeout — un servicio lento congela tu app.
- Retry en POST sin idempotency key — duplicados en cobros, emails.
- Retry en errores 4xx — el request está mal, repetirlo no lo arregla.
- Usar SDK directo en controllers — difícil de testear y reemplazar.
- Exponer tipos del SDK al resto de la app — acoplamiento a proveedor.
- Webhooks sin verificación de firma — cualquiera puede falsificar eventos.
- Procesar webhook en el handler — timeout, reintentos del proveedor.
- Ignorar rate limits del proveedor — te banean temporalmente.
- Circuit breaker en servicios críticos sin fallback — error sin gracia.
- No loguear llamadas externas — imposible debuggear en producción.
- Hardcodear API keys — usar env vars o secrets manager.
