---
name: pci-compliance
description: >
  PCI DSS v4.0 (Payment Card Industry Data Security Standard) compliance skill. Activate
  this skill when the software processes, stores, or transmits payment card data
  (card number, CVV, expiration date, cardholder data). Includes tokenization,
  encryption, network segmentation, logging, and specific access controls.
---

# 💳 PCI DSS v4.0 — Payment Card Industry Data Security Standard

## General Description

**PCI DSS** (Payment Card Industry Data Security Standard) is the mandatory security standard for any entity that processes, stores, or transmits payment card data (Visa, Mastercard, AMEX, etc.). Version 4.0 (March 2022, mandatory since March 2025) introduces a more flexible, objective-oriented approach.

**Consequences of non-compliance**: Fines from $5,000 to $100,000 monthly, loss of the ability to process cards, liability for fraud.

### Compliance Levels

| Level | Annual Transaction Volume | Requirement |
|-------|--------------------------|-------------|
| 1 | >6 million | Annual audit by QSA, quarterly scan |
| 2 | 1-6 million | Annual SAQ, quarterly scan |
| 3 | 20,000 - 1 million | Annual SAQ, quarterly scan |
| 4 | <20,000 | Annual SAQ recommended |

---

## When to Activate this Skill

Activate this skill **whenever**:

- Your application accepts credit/debit card payments
- You store any card data (even tokenized)
- You integrate with payment processors (Stripe, PayPal, Adyen, etc.)
- You implement payment forms or checkout flows
- You develop APIs that transmit card data
- You work on recurring billing systems (subscriptions)
- You implement refunds or chargebacks
- You handle cardholder data in logs, databases, or files

---

## Fundamental Concepts

### Payment Card Data

```typescript
/**
 * Card data types and their PCI DSS storage rules.
 * 
 * GOLDEN RULE: Store the least amount of card data possible.
 * Ideally, DO NOT store card data — use tokenization.
 */

// Cardholder Data (CHD)
interface CardholderData {
  pan: string;          // Primary Account Number — CAN be stored encrypted
  cardholderName: string; // Cardholder name — CAN be stored
  serviceCode: string;  // Service code — CAN be stored
  expirationDate: string; // Expiration date — CAN be stored
}

// Sensitive Authentication Data (SAD) — NEVER store post-authorization
interface SensitiveAuthData {
  fullTrack: string;     // Full magnetic stripe data — PROHIBITED
  cav2Cvc2Cvv2: string;  // CVV/CVC — PROHIBITED to store EVER
  pinBlock: string;      // PIN or PIN block — PROHIBITED to store EVER
}

// What you CAN safely store
interface SafePaymentStorage {
  paymentToken: string;    // Processor token (Stripe tok_xxx)
  last4: string;           // Last 4 digits of PAN
  brand: string;           // Visa, Mastercard, etc.
  expiryMonth: number;     // Only to notify expiration
  expiryYear: number;
  fingerprint: string;     // Unique card hash (to detect duplicates)
}
```

### The 12 PCI DSS Requirements

```
┌─────────────────────────────────────────────────────────────┐
│                    PCI DSS v4.0 — 12 Requirements            │
├─────────────────────────────────────────────────────────────┤
│ BUILD AND MAINTAIN A SECURE NETWORK                          │
│  1. Install and maintain network security controls           │
│  2. Apply secure configurations to all components            │
├─────────────────────────────────────────────────────────────┤
│ PROTECT ACCOUNT DATA                                         │
│  3. Protect stored account data                              │
│  4. Protect cardholder data in transit with cryptography      │
├─────────────────────────────────────────────────────────────┤
│ MAINTAIN A VULNERABILITY MANAGEMENT PROGRAM                  │
│  5. Protect all systems against malware                      │
│  6. Develop software and maintain secure systems             │
├─────────────────────────────────────────────────────────────┤
│ IMPLEMENT STRONG ACCESS CONTROL MEASURES                     │
│  7. Restrict access by business need                         │
│  8. Identify users and authenticate access                   │
│  9. Restrict physical access to cardholder data              │
├─────────────────────────────────────────────────────────────┤
│ REGULARLY MONITOR AND TEST NETWORKS                          │
│ 10. Log and monitor all access to resources                  │
│ 11. Test system and network security regularly               │
├─────────────────────────────────────────────────────────────┤
│ MAINTAIN AN INFORMATION SECURITY POLICY                      │
│ 12. Support security with policies and programs              │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation Requirements

### 1. Card Data Tokenization (Req. 3)

```typescript
// services/payment-tokenization.service.ts

import Stripe from 'stripe';
import pino from 'pino';

const logger = pino({
  name: 'payment-service',
  redact: {
    // NEVER log card data
    paths: [
      '*.cardNumber', '*.pan', '*.cvv', '*.cvc',
      '*.expirationDate', '*.card.number',
      'body.card_number', 'body.cvv',
    ],
    censor: '[PAN-REDACTED]',
  },
});

/**
 * PCI DSS Requirement 3: Protect stored account data.
 * 
 * RECOMMENDED STRATEGY: Tokenization with a PCI Level 1 provider.
 * This dramatically reduces the PCI scope of your application.
 * 
 * When using Stripe/Braintree/Adyen for tokenization, your server
 * NEVER touches the real card number — only tokens.
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

export class PaymentTokenizationService {
  /**
   * Create a tokenized payment method.
   * The PAN never touches your server — Stripe.js/Elements sends it directly to Stripe.
   */
  async createPaymentMethod(customerId: string, paymentMethodId: string) {
    // The paymentMethodId comes from Stripe.js on the frontend
    // Your backend NEVER receives the full card number

    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    logger.info({
      event: 'payment_method_created',
      customerId,
      paymentMethodId: paymentMethod.id,
      last4: paymentMethod.card?.last4,
      brand: paymentMethod.card?.brand,
    }, 'Tokenized payment method created');

    // Store only safe data in your database
    return {
      tokenId: paymentMethod.id,
      last4: paymentMethod.card?.last4,
      brand: paymentMethod.card?.brand,
      expiryMonth: paymentMethod.card?.exp_month,
      expiryYear: paymentMethod.card?.exp_year,
      fingerprint: paymentMethod.card?.fingerprint,
    };
  }

  /**
   * Process a payment using a token — no card data involved.
   */
  async processPayment(params: {
    customerId: string;
    paymentMethodId: string; // Token, NOT PAN
    amount: number;          // In cents
    currency: string;
    description: string;
    metadata?: Record<string, string>;
  }) {
    const paymentIntent = await stripe.paymentIntents.create({
      customer: params.customerId,
      payment_method: params.paymentMethodId,
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      metadata: params.metadata,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });

    logger.info({
      event: 'payment_processed',
      paymentIntentId: paymentIntent.id,
      customerId: params.customerId,
      amount: params.amount,
      currency: params.currency,
      status: paymentIntent.status,
      // NEVER log card data
    }, 'Payment processed');

    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  }
}
```

#### Database Schema (tokenized data only)

```prisma
// schema.prisma — NEVER store PAN, CVV, or authentication data

model PaymentMethod {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  
  // Only tokenized and partial data
  stripePaymentMethodId String @unique // Processor token
  last4           String              // Last 4 digits (for display)
  brand           String              // visa, mastercard, amex
  expiryMonth     Int
  expiryYear      Int
  fingerprint     String              // Hash to detect duplicates
  
  isDefault       Boolean   @default(false)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // NEVER store:
  // - Full card number (PAN)
  // - CVV/CVC
  // - Magnetic stripe data
  // - PIN
  
  @@index([userId])
  @@map("payment_methods")
}

model Transaction {
  id                  String    @id @default(cuid())
  userId              String
  
  // Payment processor reference
  stripePaymentIntentId String @unique
  
  // Transaction data
  amount              Int       // In cents
  currency            String    @default("usd")
  status              TransactionStatus
  description         String?
  
  // Payment method reference (tokenized)
  paymentMethodLast4  String
  paymentMethodBrand  String
  
  // Audit metadata
  ipAddress           String
  userAgent           String?
  
  // Refunds
  refundedAmount      Int       @default(0)
  refundedAt          DateTime?
  
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  
  @@index([userId])
  @@index([status])
  @@index([createdAt])
  @@map("transactions")
}

enum TransactionStatus {
  PENDING
  PROCESSING
  SUCCEEDED
  FAILED
  CANCELED
  REFUNDED
  PARTIALLY_REFUNDED
  DISPUTED
}
```

---

### 2. Encryption in Transit (Req. 4)

```typescript
// config/tls.config.ts

import https from 'node:https';
import fs from 'node:fs';
import { Express } from 'express';

/**
 * PCI DSS Requirement 4: Use strong cryptography to protect
 * cardholder data during transmission over open, public networks.
 * 
 * Requirements:
 * - TLS 1.2 minimum (TLS 1.3 recommended)
 * - Valid certificates from a recognized CA
 * - Strong cipher suites
 * - HSTS enabled
 */

export function createSecureServer(app: Express) {
  if (process.env.NODE_ENV !== 'production') {
    return app; // In dev, HTTP is OK
  }

  const options: https.ServerOptions = {
    cert: fs.readFileSync(process.env.TLS_CERT_PATH!),
    key: fs.readFileSync(process.env.TLS_KEY_PATH!),
    ca: process.env.TLS_CA_PATH ? fs.readFileSync(process.env.TLS_CA_PATH) : undefined,
    
    // TLS 1.2 and 1.3 only
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3',
    
    // Strong cipher suites (PCI DSS compliant)
    ciphers: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256',
      'ECDHE-ECDSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-ECDSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES128-GCM-SHA256',
    ].join(':'),
    
    // Prefer server cipher suites
    honorCipherOrder: true,
  };

  return https.createServer(options, app);
}

/**
 * Middleware to enforce HTTPS and HSTS.
 */
export function enforceHTTPS(req: any, res: any, next: any) {
  if (process.env.NODE_ENV === 'production') {
    // Check if the connection is HTTPS
    if (!req.secure && req.get('X-Forwarded-Proto') !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    
    // HSTS Header
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  next();
}
```

---

### 3. Secure Development (Req. 6)

```typescript
// middleware/pci-input-validation.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'pci-validation' });

/**
 * PCI DSS Requirement 6.2: Custom software developed securely.
 * 6.2.4: Software engineering techniques to prevent vulnerabilities.
 * 
 * Strict validation of all inputs to prevent:
 * - SQL Injection
 * - Cross-Site Scripting (XSS)
 * - Cross-Site Request Forgery (CSRF)
 * - Buffer overflow
 * - Parameter manipulation
 */

/**
 * Strict validation schemas for payment operations.
 * Use Zod for runtime validation with TypeScript typing.
 */
export const PaymentSchemas = {
  // Validate payment amount
  amount: z.number()
    .int('Amount must be an integer (cents)')
    .min(50, 'Minimum amount: 50 cents')
    .max(99999999, 'Maximum amount: $999,999.99'),

  // Validate currency
  currency: z.string()
    .length(3, 'Currency code must be 3 characters')
    .regex(/^[a-z]{3}$/, 'Invalid currency code')
    .transform(val => val.toLowerCase()),

  // Validate payment method token (NEVER accept PAN directly)
  paymentMethodToken: z.string()
    .regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid payment method token')
    .max(255),

  // Complete checkout schema
  checkout: z.object({
    paymentMethodId: z.string().regex(/^pm_[a-zA-Z0-9]+$/),
    amount: z.number().int().min(50).max(99999999),
    currency: z.string().length(3).regex(/^[a-z]{3}$/),
    description: z.string().max(500).optional(),
    metadata: z.record(z.string().max(200)).optional(),
  }).strict(), // .strict() rejects undeclared fields
};

/**
 * Middleware factory to validate requests against Zod schema.
 */
export function validateSchema(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      logger.warn({
        event: 'validation_failed',
        path: req.originalUrl,
        errors: result.error.flatten(),
        ip: req.ip,
      }, 'Input validation failed');

      return res.status(400).json({
        error: 'Invalid input data',
        details: result.error.flatten().fieldErrors,
      });
    }

    // Replace body with validated and sanitized data
    req.body = result.data;
    next();
  };
}

/**
 * Middleware that detects and blocks card numbers in logs/requests.
 * PCI DSS 3.4: Render the PAN unreadable wherever it is stored.
 */
export function panDetectionGuard(req: Request, res: Response, next: NextFunction) {
  const body = JSON.stringify(req.body);
  const queryString = JSON.stringify(req.query);
  const allInput = `${body} ${queryString}`;

  // Pattern to detect card numbers (Luhn-compatible sequences)
  const panPattern = /\b(?:\d[ -]*?){13,19}\b/g;
  const matches = allInput.match(panPattern);

  if (matches) {
    // Verify with Luhn algorithm if they are real PANs
    const possiblePANs = matches.filter(m => {
      const digits = m.replace(/\D/g, '');
      return digits.length >= 13 && digits.length <= 19 && luhnCheck(digits);
    });

    if (possiblePANs.length > 0) {
      logger.error({
        event: 'pan_detected_in_request',
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userId: req.user?.id,
        // DO NOT log the actual PAN
        panCount: possiblePANs.length,
      }, '🚨 PAN detected in request — BLOCKED');

      return res.status(400).json({
        error: 'Card data not allowed on this route',
        message: 'Use the payment processor\'s frontend SDK to send card data securely.',
      });
    }
  }

  next();
}

/**
 * Luhn algorithm to validate card numbers.
 */
function luhnCheck(cardNumber: string): boolean {
  let sum = 0;
  let isEven = false;

  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}
```

---

### 4. Logging and Monitoring (Req. 10)

```typescript
// services/pci-audit-logger.service.ts

import pino from 'pino';

/**
 * PCI DSS Requirement 10: Log and monitor all access
 * to network resources and cardholder data.
 * 
 * 10.2: Implement automated audit trails.
 * 10.3: Record at least: user ID, event type, date/time,
 *        success/failure, event origin, identity/name of the affected resource.
 * 10.5: Ensure that audit trails cannot be altered.
 * 10.7: Retain logs for at least 12 months (3 months immediately available).
 */

const auditLogger = pino({
  name: 'pci-audit',
  level: 'info',
  // In production, send to centralized SIEM (Splunk, ELK, Datadog)
  // to comply with 10.5 (non-alterable logs)
  redact: {
    paths: [
      '*.pan', '*.cardNumber', '*.cvv', '*.cvc',
      '*.password', '*.token', '*.secret',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export enum PCIAuditEvent {
  // 10.2.1 — User access to cardholder data
  CARDHOLDER_DATA_ACCESS = 'cardholder_data_access',
  
  // 10.2.2 — Actions performed by any root/admin user
  ADMIN_ACTION = 'admin_action',
  
  // 10.2.3 — Access to audit trails
  AUDIT_TRAIL_ACCESS = 'audit_trail_access',
  
  // 10.2.4 — Invalid logical access attempts
  INVALID_ACCESS_ATTEMPT = 'invalid_access_attempt',
  
  // 10.2.5 — Use and identification of authentication mechanisms
  AUTHENTICATION_EVENT = 'authentication_event',
  
  // 10.2.6 — Initialization, stopping, or pausing of audit logs
  AUDIT_LOG_LIFECYCLE = 'audit_log_lifecycle',
  
  // 10.2.7 — Creation and deletion of system-level objects
  SYSTEM_OBJECT_CHANGE = 'system_object_change',
  
  // Payment events
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_COMPLETED = 'payment_completed',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_INITIATED = 'refund_initiated',
  REFUND_COMPLETED = 'refund_completed',
}

interface PCIAuditEntry {
  event: PCIAuditEvent;
  // 10.3.1 — User identification
  userId: string;
  userRole?: string;
  // 10.3.2 — Event type
  // (included in 'event')
  // 10.3.3 — Date and time
  timestamp: string;
  // 10.3.4 — Success or failure indication
  success: boolean;
  // 10.3.5 — Event origin
  sourceIp: string;
  sourceComponent: string;
  // 10.3.6 — Identity or name of affected data/resource/component
  resource: string;
  resourceId?: string;
  // Additional details
  details?: Record<string, unknown>;
  errorMessage?: string;
}

export class PCIAuditLogger {
  /**
   * Record PCI audit event.
   * Complies with all requirements of 10.2 and 10.3.
   */
  log(entry: Omit<PCIAuditEntry, 'timestamp'>) {
    const fullEntry: PCIAuditEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    // Use appropriate level based on success/failure
    if (entry.success) {
      auditLogger.info(fullEntry, `PCI Audit: ${entry.event}`);
    } else {
      auditLogger.warn(fullEntry, `PCI Audit FAILED: ${entry.event}`);
    }
  }

  /**
   * Record payment event.
   */
  logPayment(params: {
    event: PCIAuditEvent;
    userId: string;
    transactionId: string;
    amount: number;
    currency: string;
    success: boolean;
    sourceIp: string;
    errorMessage?: string;
  }) {
    this.log({
      event: params.event,
      userId: params.userId,
      success: params.success,
      sourceIp: params.sourceIp,
      sourceComponent: 'payment-service',
      resource: 'transaction',
      resourceId: params.transactionId,
      details: {
        amount: params.amount,
        currency: params.currency,
        // NEVER include card data here
      },
      errorMessage: params.errorMessage,
    });
  }

  /**
   * Record invalid access attempt (10.2.4).
   */
  logInvalidAccess(params: {
    userId?: string;
    sourceIp: string;
    resource: string;
    reason: string;
  }) {
    this.log({
      event: PCIAuditEvent.INVALID_ACCESS_ATTEMPT,
      userId: params.userId ?? 'anonymous',
      success: false,
      sourceIp: params.sourceIp,
      sourceComponent: 'access-control',
      resource: params.resource,
      errorMessage: params.reason,
    });
  }
}

export const pciAuditLogger = new PCIAuditLogger();
```

---

### 5. Cardholder Data Environment (CDE) Segmentation

```typescript
// config/network-segmentation.config.ts

/**
 * PCI DSS Requirement 1: Network security controls.
 * 
 * The Cardholder Data Environment (CDE) must be segmented
 * from the rest of the network. Only components that need
 * to access card data should be in the CDE.
 * 
 * In Node.js/microservices architecture, this translates to:
 * - Isolated payment microservice
 * - Private network for processor communication
 * - API Gateway as the only entry point to the CDE
 */

// Docker compose example for segmentation
export const DOCKER_COMPOSE_PCI = `
version: '3.8'

services:
  # ═══ OUTSIDE THE CDE ═══
  api-gateway:
    build: ./services/api-gateway
    networks:
      - public
      - internal
    ports:
      - "443:443"
    environment:
      - NODE_ENV=production
    
  web-app:
    build: ./services/web-app
    networks:
      - public
    depends_on:
      - api-gateway
    
  user-service:
    build: ./services/user-service
    networks:
      - internal
    # No access to the payment network
    
  # ═══ INSIDE THE CDE ═══
  payment-service:
    build: ./services/payment-service
    networks:
      - payment-network  # Isolated network for payments
      - internal         # Limited internal communication
    environment:
      - STRIPE_SECRET_KEY=\${STRIPE_SECRET_KEY}
      - PCI_ENCRYPTION_KEY=\${PCI_ENCRYPTION_KEY}
    # No direct internet access
    
  payment-db:
    image: postgres:16-alpine
    networks:
      - payment-network  # Only accessible from payment-service
    volumes:
      - payment-data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=payments
      - POSTGRES_PASSWORD=\${PAYMENT_DB_PASSWORD}

networks:
  public:
    driver: bridge
  internal:
    driver: bridge
    internal: true  # No internet access
  payment-network:
    driver: bridge
    internal: true  # No internet access, isolated

volumes:
  payment-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /encrypted-storage/payment-data  # Encrypted storage
`;
```

---

### 6. Secure Payment Form (Frontend)

```typescript
// components/SecurePaymentForm.tsx

/**
 * PCI DSS — Payment form that NEVER sends card data to your server.
 * Uses Stripe Elements which tokenizes directly on Stripe's servers.
 * 
 * This reduces your PCI scope from SAQ D (most rigorous) to SAQ A (simplest).
 */

/*
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm({ amount, currency }: { amount: number; currency: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) return;
    
    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    // 1. Create PaymentMethod — data goes DIRECTLY to Stripe, not to your server
    const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Error processing the card');
      setProcessing(false);
      return;
    }

    // 2. Send only the TOKEN to your server (NEVER card data)
    const response = await fetch('/api/v1/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethodId: paymentMethod.id, // Only the token
        amount,
        currency,
      }),
    });

    const result = await response.json();
    
    if (result.error) {
      setError(result.error);
    }

    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement
        options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#32325d',
            },
          },
          hidePostalCode: false, // Request ZIP for AVS verification
        }}
      />
      {error && <div role="alert">{error}</div>}
      <button type="submit" disabled={!stripe || processing}>
        {processing ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
      </button>
    </form>
  );
}

export function SecurePaymentPage({ amount, currency }: { amount: number; currency: string }) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm amount={amount} currency={currency} />
    </Elements>
  );
}
*/
```

---

## Agent workflow

1. Implement tokenization with a PCI Level 1 processor (Stripe): the backend never touches the PAN, only tokens (Req. 3).
2. Configure Prisma schema storing only tokenized data (stripePaymentMethodId, last4, brand, fingerprint) — never PAN, CVV, PIN, or magnetic stripe data.
3. Configure TLS 1.2+ with strong cipher suites (AES-256-GCM, CHACHA20), HSTS, and HTTP→HTTPS redirect in production (Req. 4).
4. Implement strict Zod validation for payment operations: amounts in cents (min 50, max 99999999), tokens with regex pm_*, and .strict() to reject undeclared fields (Req. 6).
5. Implement PAN detection middleware with Luhn algorithm that blocks requests containing card numbers (Req. 3.4).
6. Implement complete PCI audit logging: user ID, event type, date/time, success/failure, origin, affected resource; with PAN/CVV/password redaction; 12-month retention (Req. 10).
7. Segment the CDE with isolated Docker networks: payment-service and payment-db on internal network without internet access (Req. 1).
8. Use Stripe Elements on frontend so card data never touches the server — reduces PCI scope from SAQ D to SAQ A (Req. 3).
9. Validate against the compliance checklist (Req. 1-12) before deploying.

## Gotchas

Never store CVV/CVC after authorization — it is explicitly prohibited by PCI DSS. Never store magnetic stripe data or PIN. Never log full card numbers — configure redact in pino for paths like *.cardNumber, *.pan, *.cvv. Never send card data via email, chat, or insecure channels. If you must store PAN, it must be encrypted — but tokenization is preferred because it dramatically reduces PCI scope. Never use default credentials in CDE systems. CDE access always requires MFA. Never copy production data with PANs to test environments. Encryption keys must be rotated annually. Vulnerability scans must be quarterly (ASV for external) and penetration testing annual. Audit logs must be retained for 12 months with 3 months immediately accessible. PAN must be masked in displays showing only the last 4 digits. Suspicious transaction monitoring must be real-time.

---

## PCI DSS v4.0 Compliance Checklist

### Req. 1-2: Secure Network
- [ ] Firewall/WAF configured for the CDE
- [ ] CDE segmented from the general network
- [ ] Secure configuration of all components
- [ ] Default credentials changed

### Req. 3-4: Data Protection
- [ ] Inventory of where card data is stored
- [ ] No sensitive authentication data stored (CVV, PIN)
- [ ] PAN masked in displays (last 4 digits only)
- [ ] PAN encrypted if stored (tokenization preferred)
- [ ] TLS 1.2+ for card data transmission
- [ ] HSTS enabled

### Req. 5-6: Vulnerability Management
- [ ] Anti-malware on CDE systems
- [ ] Security patches applied promptly
- [ ] Secure development process (SDLC)
- [ ] Code review of CDE changes
- [ ] Web applications protected (WAF or code review)

### Req. 7-9: Access Control
- [ ] CDE access restricted by business need
- [ ] Unique IDs for each user with CDE access
- [ ] MFA for remote and administrative CDE access
- [ ] Physical access to the CDE controlled

### Req. 10-11: Monitoring
- [ ] Audit trails for all CDE access
- [ ] Logs synchronized with NTP
- [ ] Logs reviewed daily
- [ ] Log retention: 12 months (3 months immediately accessible)
- [ ] Quarterly vulnerability scan (external by ASV)
- [ ] Annual penetration testing of the CDE

### Req. 12: Policies
- [ ] Security policy documented
- [ ] Incident response plan for card data breaches
- [ ] Security training for personnel with CDE access

---

## References and Resources

- [PCI DSS v4.0 Official](https://www.pcisecuritystandards.org/document_library/)
- [PCI SSC Resources](https://www.pcisecuritystandards.org/)
- [Stripe PCI Compliance Guide](https://stripe.com/guides/pci-compliance)
- [SAQ Types Overview](https://www.pcisecuritystandards.org/assessors_and_solutions/self_assessment_questionnaire)
- [PCI DSS Quick Reference Guide](https://www.pcisecuritystandards.org/documents/PCI_DSS-QRG-v4_0.pdf)
