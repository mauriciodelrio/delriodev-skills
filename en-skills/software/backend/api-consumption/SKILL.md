---
name: api-consumption
description: >
  Consuming APIs and external services from the backend. Covers
  HTTP client abstraction, SDKs, retry with exponential backoff,
  circuit breaker, timeouts, rate limiting, webhook handling,
  idempotency, and resilience patterns. Complements api-design
  (building APIs) with HOW to consume third-party APIs.
---

# 🔌 API Consumption — Consuming External APIs

## Principle

> **Every external dependency is a point of failure.**
> Third-party APIs fail, slow down, and change without notice.
> Your code must be resilient to all of these situations.

---

## Scope

```
✅ This skill covers:
  - Typed HTTP clients
  - SDKs and service wrappers
  - Retry with exponential backoff
  - Circuit breaker
  - Timeouts and abort
  - Handling incoming webhooks
  - Idempotency in calls

❌ DOES NOT cover:
  - Designing your own API → backend/api-design
  - Choosing external services → architecture/*
  - Authentication → backend/auth
```

---

## Base HTTP Client

```typescript
// src/lib/http-client.ts
// Typed wrapper over fetch (Node 18+) or ky/got

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

---

## Retry with Exponential Backoff

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

      // Don't retry if the status is not in the list
      if (!retryOn.includes(response.status) || attempt === retries) {
        return response;
      }

      // Respect Retry-After header if present
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : retryDelay * Math.pow(2, attempt) + Math.random() * 1000;  // Jitter

      await sleep(delay);
    } catch (error) {
      if (attempt === retries) throw error;

      // Retry on network errors
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

```
RETRY RULES:
  1. ONLY retry on transient errors (5xx, timeout, network)
  2. NEVER retry on 4xx (except 408 Request Timeout, 429 Too Many Requests)
  3. Exponential backoff: 1s → 2s → 4s → 8s
  4. ALWAYS add jitter (random) to avoid thundering herd
  5. Maximum 3-5 retries — more doesn't make sense
  6. Respect the server's Retry-After header
  7. Only retry if the operation is idempotent (GET, PUT, DELETE)
     ❌ NEVER retry POST without an idempotency key
```

---

## Circuit Breaker

```typescript
// Pattern: If a service fails a lot, stop calling it temporarily

enum CircuitState {
  CLOSED = 'CLOSED',       // Normal, requests pass through
  OPEN = 'OPEN',           // Failing, requests rejected immediately
  HALF_OPEN = 'HALF_OPEN', // Testing if it recovered
}

class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor(
    private readonly threshold: number = 5,      // Failures to open
    private readonly resetTimeout: number = 30_000, // Time to try again
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

// Usage
const stripeCircuit = new CircuitBreaker(5, 30_000);

async function chargeCustomer(amount: number) {
  return stripeCircuit.execute(() =>
    stripeClient.charges.create({ amount, currency: 'usd' })
  );
}
```

```
WHEN TO USE CIRCUIT BREAKER:
  ✅ Payment services (Stripe, PayPal)
  ✅ Non-critical third-party APIs (analytics, email)
  ✅ Internal microservices

TYPICAL PARAMETERS:
  threshold: 5 consecutive failures → open circuit
  resetTimeout: 30 seconds → try again
  
FALLBACK when circuit is open:
  - Return default/cached response
  - Queue for later processing
  - Notify the user that the service is temporarily unavailable
```

---

## SDK / Service Client Abstraction

```typescript
// Each external service has its own encapsulated client

// src/services/stripe/stripe.service.ts
import Stripe from 'stripe';

interface CreatePaymentInput {
  amount: number;       // cents
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

```
ABSTRACTION RULES:
  1. NEVER use SDKs directly in controllers/resolvers
     → Always encapsulate in a Service
  
  2. Own types for input/output
     → Don't expose Stripe/AWS/etc types to the rest of the app
     → Map to internal types
  
  3. One service per external provider
     → StripeService, SendGridService, S3Service
  
  4. Pin the API version
     → apiVersion: '2024-04-10' — don't rely on the default
  
  5. Inject config (don't import from env directly)
     → Constructor receives apiKey, makes testing easier
```

---

## Timeouts

```typescript
// RULE: Every external request MUST have a timeout

// Timeout levels (from strictest to most relaxed):
//   Internal API calls: 3-5s
//   External APIs: 5-10s
//   Uploads/downloads: 30-60s
//   Outgoing webhooks: 10-15s

// Implementation with AbortController (Node 18+)
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

---

## Webhooks — Receiving Events from Third Parties

```typescript
// POST /webhooks/stripe
async function handleStripeWebhook(req: Request, res: Response) {
  // 1. VERIFY SIGNATURE — ALWAYS
  const signature = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,          // Raw body, not parsed
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // 2. RESPOND QUICKLY — 200 before processing
  //    If you take >30s, the provider retries
  res.status(200).json({ received: true });

  // 3. PROCESS ASYNC — Enqueue the event
  await eventQueue.add('stripe-webhook', {
    eventId: event.id,
    type: event.type,
    data: event.data.object,
  });
}
```

```
WEBHOOK RULES:
  1. VERIFY SIGNATURE — ALWAYS
     Each provider has its own method: HMAC, asymmetric, etc.
     Stripe: stripe-signature header
     GitHub: x-hub-signature-256 header
     ❌ NEVER trust the payload without verification

  2. RESPOND 200 IMMEDIATELY
     Don't process in the handler
     Enqueue and process in the background
     If you take too long, the provider retries → duplicates

  3. IDEMPOTENCY
     Store processed event_ids
     Before processing: check if already processed
     Webhooks ARE RESENT — your code must be idempotent

  4. RAW BODY FOR VERIFICATION
     Configure endpoint to receive raw body
     Express: app.use('/webhooks/stripe', express.raw({ type: 'application/json' }))
     NestJS: @RawBody() in the controller

  5. DEDICATED ENDPOINT
     /webhooks/stripe, /webhooks/github
     DO NOT mix with your API routes
     Separate middleware (no app auth, with signature verification)
```

---

## Idempotency in Outgoing Calls

```typescript
// Problem: If you retry a POST, you might create duplicates
// Solution: Idempotency key

// Stripe supports idempotency keys natively
await stripe.charges.create(
  { amount: 2000, currency: 'usd', customer: 'cus_xxx' },
  { idempotencyKey: `charge_${orderId}` },  // Same orderId = same charge
);

// For APIs without native support:
// 1. Generate idempotency key based on the operation
const idempotencyKey = `${operation}_${entityId}_${timestamp}`;

// 2. Save to DB before calling
await db.externalCalls.create({
  idempotencyKey,
  status: 'pending',
  request: payload,
});

// 3. Before executing, check if already completed
const existing = await db.externalCalls.findUnique({
  where: { idempotencyKey },
});
if (existing?.status === 'completed') {
  return existing.response;
}

// 4. Execute and save the result
const result = await externalApi.call(payload);
await db.externalCalls.update({
  where: { idempotencyKey },
  data: { status: 'completed', response: result },
});
```

---

## Outgoing Call Rate Limiting

```typescript
// Respect the provider's rate limits

class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,     // Requests per window
    private refillRate: number,    // ms between refills
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
    // Wait until the next refill
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

// Usage: Stripe allows ~100 req/s
const stripeRateLimiter = new RateLimiter(100, 1000);

async function callStripe() {
  await stripeRateLimiter.acquire();
  return stripe.charges.list();
}
```

---

## Anti-patterns

```
❌ Calling external APIs without timeout → a slow service freezes your app
❌ Retry on POST without idempotency key → duplicates in charges, emails
❌ Retry on 4xx errors → the request is wrong, repeating it won't fix it
❌ Using SDK directly in controllers → hard to test and replace
❌ Exposing SDK types to the rest of the app → coupling to provider
❌ Webhooks without signature verification → anyone can forge events
❌ Processing webhook in the handler → timeout, provider retries
❌ Ignoring provider rate limits → you get temporarily banned
❌ Circuit breaker on critical services without fallback → ungraceful error
❌ Not logging external calls → impossible to debug in production
❌ Hardcoding API keys → use env vars or secrets manager
```
