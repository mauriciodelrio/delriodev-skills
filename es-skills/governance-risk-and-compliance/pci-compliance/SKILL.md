---
name: pci-compliance
description: >
  Skill de cumplimiento PCI DSS v4.0 (Payment Card Industry Data Security Standard). Activa
  esta skill cuando el software procese, almacene o transmita datos de tarjetas de pago
  (número de tarjeta, CVV, fecha de expiración, datos de titular). Incluye tokenización,
  encriptación, segmentación de red, logging y controles de acceso específicos.
---

# 💳 PCI DSS v4.0 — Payment Card Industry Data Security Standard

## Descripción General

**PCI DSS** (Payment Card Industry Data Security Standard) es el estándar de seguridad obligatorio para cualquier entidad que procese, almacene o transmita datos de tarjetas de pago (Visa, Mastercard, AMEX, etc.). La versión 4.0 (marzo 2022, obligatoria desde marzo 2025) introduce un enfoque más flexible y orientado a objetivos.

**Consecuencias del incumplimiento**: Multas de $5,000 a $100,000 mensuales, pérdida de la capacidad de procesar tarjetas, responsabilidad por fraudes.

### Niveles de Cumplimiento

| Nivel | Volumen Anual de Transacciones | Requisito |
|-------|-------------------------------|-----------|
| 1 | >6 millones | Auditoría anual por QSA, escaneo trimestral |
| 2 | 1-6 millones | SAQ anual, escaneo trimestral |
| 3 | 20,000 - 1 millón | SAQ anual, escaneo trimestral |
| 4 | <20,000 | SAQ anual recomendado |

---

## Cuándo Activar esta Skill

Activa esta skill **siempre** que:

- Tu aplicación acepte pagos con tarjeta de crédito/débito
- Almacenes cualquier dato de tarjeta (incluso tokenizado)
- Integres con procesadores de pago (Stripe, PayPal, Adyen, etc.)
- Implementes formularios de pago o checkout
- Desarrolles APIs que transmitan datos de tarjetas
- Trabajes en sistemas de facturación recurrente (suscripciones)
- Implementes refunds o chargebacks
- Manejes datos de titulares de tarjeta en logs, bases de datos o archivos

---

## Conceptos Fundamentales

### Datos de Tarjeta de Pago

```typescript
/**
 * Tipos de datos de tarjeta y sus reglas de almacenamiento PCI DSS.
 * 
 * REGLA DE ORO: Almacenar la menor cantidad posible de datos de tarjeta.
 * Idealmente, NO almacenar datos de tarjeta — usar tokenización.
 */

// Datos del titular (Cardholder Data - CHD)
interface CardholderData {
  pan: string;          // Primary Account Number — PUEDE almacenarse encriptado
  cardholderName: string; // Nombre del titular — PUEDE almacenarse
  serviceCode: string;  // Código de servicio — PUEDE almacenarse
  expirationDate: string; // Fecha de expiración — PUEDE almacenarse
}

// Datos de autenticación sensible (SAD) — NUNCA almacenar post-autorización
interface SensitiveAuthData {
  fullTrack: string;     // Datos completos de la banda magnética — PROHIBIDO
  cav2Cvc2Cvv2: string;  // CVV/CVC — PROHIBIDO almacenar NUNCA
  pinBlock: string;      // PIN o bloque de PIN — PROHIBIDO almacenar NUNCA
}

// Lo que SÍ puedes almacenar de forma segura
interface SafePaymentStorage {
  paymentToken: string;    // Token del procesador (Stripe tok_xxx)
  last4: string;           // Últimos 4 dígitos del PAN
  brand: string;           // Visa, Mastercard, etc.
  expiryMonth: number;     // Solo para notificar expiración
  expiryYear: number;
  fingerprint: string;     // Hash único de la tarjeta (para detectar duplicados)
}
```

### Los 12 Requisitos PCI DSS

```
┌─────────────────────────────────────────────────────────────┐
│                    PCI DSS v4.0 — 12 Requisitos              │
├─────────────────────────────────────────────────────────────┤
│ CONSTRUIR Y MANTENER RED SEGURA                              │
│  1. Instalar y mantener controles de seguridad de red        │
│  2. Aplicar configuraciones seguras a todos los componentes  │
├─────────────────────────────────────────────────────────────┤
│ PROTEGER DATOS DE CUENTAS                                    │
│  3. Proteger datos de cuentas almacenados                    │
│  4. Proteger datos de titulares en tránsito con criptografía │
├─────────────────────────────────────────────────────────────┤
│ MANTENER PROGRAMA DE GESTIÓN DE VULNERABILIDADES             │
│  5. Proteger todos los sistemas contra malware               │
│  6. Desarrollar software y mantener sistemas seguros         │
├─────────────────────────────────────────────────────────────┤
│ IMPLEMENTAR MEDIDAS FUERTES DE CONTROL DE ACCESO             │
│  7. Restringir acceso por necesidad de negocio               │
│  8. Identificar usuarios y autenticar acceso                 │
│  9. Restringir acceso físico a datos de titulares            │
├─────────────────────────────────────────────────────────────┤
│ MONITOREAR Y PROBAR REDES REGULARMENTE                       │
│ 10. Registrar y monitorear todo acceso a recursos            │
│ 11. Probar seguridad del sistema y redes regularmente        │
├─────────────────────────────────────────────────────────────┤
│ MANTENER POLÍTICA DE SEGURIDAD DE LA INFORMACIÓN             │
│ 12. Soportar seguridad con políticas y programas             │
└─────────────────────────────────────────────────────────────┘
```

---

## Requisitos Técnicos de Implementación

### 1. Tokenización de Datos de Tarjeta (Req. 3)

```typescript
// services/payment-tokenization.service.ts

import Stripe from 'stripe';
import pino from 'pino';

const logger = pino({
  name: 'payment-service',
  redact: {
    // NUNCA loggear datos de tarjeta
    paths: [
      '*.cardNumber', '*.pan', '*.cvv', '*.cvc',
      '*.expirationDate', '*.card.number',
      'body.card_number', 'body.cvv',
    ],
    censor: '[PAN-REDACTED]',
  },
});

/**
 * PCI DSS Requisito 3: Proteger datos de cuentas almacenados.
 * 
 * ESTRATEGIA RECOMENDADA: Tokenización con un proveedor PCI Level 1.
 * Esto reduce dramáticamente el alcance PCI de tu aplicación.
 * 
 * Cuando usas Stripe/Braintree/Adyen para tokenizar, tu servidor
 * NUNCA toca el número de tarjeta real — solo tokens.
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

export class PaymentTokenizationService {
  /**
   * Crear un método de pago tokenizado.
   * El PAN nunca toca tu servidor — Stripe.js/Elements lo envía directo a Stripe.
   */
  async createPaymentMethod(customerId: string, paymentMethodId: string) {
    // El paymentMethodId viene de Stripe.js en el frontend
    // Tu backend NUNCA recibe el número de tarjeta completo

    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    logger.info({
      event: 'payment_method_created',
      customerId,
      paymentMethodId: paymentMethod.id,
      last4: paymentMethod.card?.last4,
      brand: paymentMethod.card?.brand,
    }, 'Método de pago tokenizado creado');

    // Almacenar solo datos seguros en tu base de datos
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
   * Procesar un pago usando token — sin datos de tarjeta.
   */
  async processPayment(params: {
    customerId: string;
    paymentMethodId: string; // Token, NO PAN
    amount: number;          // En centavos
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
      // NUNCA loggear datos de tarjeta
    }, 'Pago procesado');

    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  }
}
```

#### Schema de Base de Datos (solo datos tokenizados)

```prisma
// schema.prisma — NUNCA almacenar PAN, CVV o datos de autenticación

model PaymentMethod {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  
  // Solo datos tokenizados y parciales
  stripePaymentMethodId String @unique // Token del procesador
  last4           String              // Últimos 4 dígitos (para display)
  brand           String              // visa, mastercard, amex
  expiryMonth     Int
  expiryYear      Int
  fingerprint     String              // Hash para detectar duplicados
  
  isDefault       Boolean   @default(false)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // NUNCA almacenar:
  // - Número de tarjeta completo (PAN)
  // - CVV/CVC
  // - Datos de banda magnética
  // - PIN
  
  @@index([userId])
  @@map("payment_methods")
}

model Transaction {
  id                  String    @id @default(cuid())
  userId              String
  
  // Referencia al procesador de pago
  stripePaymentIntentId String @unique
  
  // Datos de la transacción
  amount              Int       // En centavos
  currency            String    @default("usd")
  status              TransactionStatus
  description         String?
  
  // Referencia al método de pago (tokenizado)
  paymentMethodLast4  String
  paymentMethodBrand  String
  
  // Metadata de auditoría
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

### 2. Encriptación en Tránsito (Req. 4)

```typescript
// config/tls.config.ts

import https from 'node:https';
import fs from 'node:fs';
import { Express } from 'express';

/**
 * PCI DSS Requisito 4: Usar criptografía fuerte para proteger
 * datos de titulares durante la transmisión en redes abiertas y públicas.
 * 
 * Requisitos:
 * - TLS 1.2 como mínimo (TLS 1.3 recomendado)
 * - Certificados válidos de una CA reconocida
 * - Suites de cifrado fuertes
 * - HSTS habilitado
 */

export function createSecureServer(app: Express) {
  if (process.env.NODE_ENV !== 'production') {
    return app; // En dev, usar HTTP está OK
  }

  const options: https.ServerOptions = {
    cert: fs.readFileSync(process.env.TLS_CERT_PATH!),
    key: fs.readFileSync(process.env.TLS_KEY_PATH!),
    ca: process.env.TLS_CA_PATH ? fs.readFileSync(process.env.TLS_CA_PATH) : undefined,
    
    // Solo TLS 1.2 y 1.3
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3',
    
    // Cipher suites fuertes (PCI DSS compliant)
    ciphers: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256',
      'ECDHE-ECDSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-ECDSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES128-GCM-SHA256',
    ].join(':'),
    
    // Preferir las cipher suites del servidor
    honorCipherOrder: true,
  };

  return https.createServer(options, app);
}

/**
 * Middleware para forzar HTTPS y HSTS.
 */
export function enforceHTTPS(req: any, res: any, next: any) {
  if (process.env.NODE_ENV === 'production') {
    // Verificar si la conexión es HTTPS
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

### 3. Desarrollo Seguro (Req. 6)

```typescript
// middleware/pci-input-validation.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'pci-validation' });

/**
 * PCI DSS Requisito 6.2: Software a medida desarrollado de forma segura.
 * 6.2.4: Técnicas de ingeniería de software para prevenir vulnerabilidades.
 * 
 * Validación estricta de todas las entradas para prevenir:
 * - Inyección SQL
 * - Cross-Site Scripting (XSS)
 * - Cross-Site Request Forgery (CSRF)
 * - Buffer overflow
 * - Manipulación de parámetros
 */

/**
 * Schemas de validación estrictos para operaciones de pago.
 * Usar Zod para validación runtime con tipado TypeScript.
 */
export const PaymentSchemas = {
  // Validar monto de pago
  amount: z.number()
    .int('El monto debe ser un entero (centavos)')
    .min(50, 'Monto mínimo: 50 centavos')
    .max(99999999, 'Monto máximo: $999,999.99'),

  // Validar moneda
  currency: z.string()
    .length(3, 'Código de moneda debe ser de 3 caracteres')
    .regex(/^[a-z]{3}$/, 'Código de moneda inválido')
    .transform(val => val.toLowerCase()),

  // Validar token de método de pago (NUNCA aceptar PAN directo)
  paymentMethodToken: z.string()
    .regex(/^pm_[a-zA-Z0-9]+$/, 'Token de método de pago inválido')
    .max(255),

  // Crear schema completo de checkout
  checkout: z.object({
    paymentMethodId: z.string().regex(/^pm_[a-zA-Z0-9]+$/),
    amount: z.number().int().min(50).max(99999999),
    currency: z.string().length(3).regex(/^[a-z]{3}$/),
    description: z.string().max(500).optional(),
    metadata: z.record(z.string().max(200)).optional(),
  }).strict(), // .strict() rechaza campos no declarados
};

/**
 * Middleware factory para validar requests contra schema Zod.
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
      }, 'Validación de entrada fallida');

      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: result.error.flatten().fieldErrors,
      });
    }

    // Reemplazar body con datos validados y sanitizados
    req.body = result.data;
    next();
  };
}

/**
 * Middleware que detecta y bloquea números de tarjeta en logs/requests.
 * PCI DSS 3.4: Hacer ilegible el PAN dondequiera que se almacene.
 */
export function panDetectionGuard(req: Request, res: Response, next: NextFunction) {
  const body = JSON.stringify(req.body);
  const queryString = JSON.stringify(req.query);
  const allInput = `${body} ${queryString}`;

  // Patrón para detectar números de tarjeta (Luhn-compatible sequences)
  const panPattern = /\b(?:\d[ -]*?){13,19}\b/g;
  const matches = allInput.match(panPattern);

  if (matches) {
    // Verificar con algoritmo de Luhn si son PANs reales
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
        // NO loggear el PAN real
        panCount: possiblePANs.length,
      }, '🚨 PAN detectado en request — BLOQUEADO');

      return res.status(400).json({
        error: 'Datos de tarjeta no permitidos en esta ruta',
        message: 'Use el frontend SDK del procesador de pagos para enviar datos de tarjeta de forma segura.',
      });
    }
  }

  next();
}

/**
 * Algoritmo de Luhn para validar números de tarjeta.
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

### 4. Logging y Monitoreo (Req. 10)

```typescript
// services/pci-audit-logger.service.ts

import pino from 'pino';

/**
 * PCI DSS Requisito 10: Registrar y monitorear todo acceso
 * a recursos de red y datos de titulares de tarjeta.
 * 
 * 10.2: Implementar audit trails automatizados.
 * 10.3: Registrar al menos: ID usuario, tipo de evento, fecha/hora,
 *        éxito/fallo, origen del evento, identidad/nombre del recurso.
 * 10.5: Asegurar que las audit trails no pueden ser alteradas.
 * 10.7: Retener logs por al menos 12 meses (3 meses disponibles inmediatamente).
 */

const auditLogger = pino({
  name: 'pci-audit',
  level: 'info',
  // En producción, enviar a SIEM centralizado (Splunk, ELK, Datadog)
  // para cumplir con 10.5 (logs no alterables)
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
  // 10.2.1 — Acceso de usuario a datos de titulares
  CARDHOLDER_DATA_ACCESS = 'cardholder_data_access',
  
  // 10.2.2 — Acciones realizadas por cualquier usuario root/admin
  ADMIN_ACTION = 'admin_action',
  
  // 10.2.3 — Acceso a audit trails
  AUDIT_TRAIL_ACCESS = 'audit_trail_access',
  
  // 10.2.4 — Intentos de acceso lógico inválidos
  INVALID_ACCESS_ATTEMPT = 'invalid_access_attempt',
  
  // 10.2.5 — Uso e identificación de mecanismos de autenticación
  AUTHENTICATION_EVENT = 'authentication_event',
  
  // 10.2.6 — Inicialización, detención o pausa de audit logs
  AUDIT_LOG_LIFECYCLE = 'audit_log_lifecycle',
  
  // 10.2.7 — Creación y eliminación de objetos a nivel de sistema
  SYSTEM_OBJECT_CHANGE = 'system_object_change',
  
  // Eventos de pago
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_COMPLETED = 'payment_completed',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_INITIATED = 'refund_initiated',
  REFUND_COMPLETED = 'refund_completed',
}

interface PCIAuditEntry {
  event: PCIAuditEvent;
  // 10.3.1 — Identificación del usuario
  userId: string;
  userRole?: string;
  // 10.3.2 — Tipo de evento
  // (incluido en 'event')
  // 10.3.3 — Fecha y hora
  timestamp: string;
  // 10.3.4 — Indicación de éxito o fallo
  success: boolean;
  // 10.3.5 — Origen del evento
  sourceIp: string;
  sourceComponent: string;
  // 10.3.6 — Identidad o nombre del dato/recurso/componente afectado
  resource: string;
  resourceId?: string;
  // Detalles adicionales
  details?: Record<string, unknown>;
  errorMessage?: string;
}

export class PCIAuditLogger {
  /**
   * Registrar evento de auditoría PCI.
   * Cumple con todos los requisitos de 10.2 y 10.3.
   */
  log(entry: Omit<PCIAuditEntry, 'timestamp'>) {
    const fullEntry: PCIAuditEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    // Usar nivel adecuado según éxito/fallo
    if (entry.success) {
      auditLogger.info(fullEntry, `PCI Audit: ${entry.event}`);
    } else {
      auditLogger.warn(fullEntry, `PCI Audit FAILED: ${entry.event}`);
    }
  }

  /**
   * Registrar evento de pago.
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
        // NUNCA incluir datos de tarjeta aquí
      },
      errorMessage: params.errorMessage,
    });
  }

  /**
   * Registrar intento de acceso inválido (10.2.4).
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

### 5. Segmentación del Entorno de Datos de Tarjeta (CDE)

```typescript
// config/network-segmentation.config.ts

/**
 * PCI DSS Requisito 1: Controles de seguridad de red.
 * 
 * El Cardholder Data Environment (CDE) debe estar segmentado
 * del resto de la red. Solo los componentes que necesitan
 * acceder a datos de tarjeta deben estar en el CDE.
 * 
 * En arquitectura Node.js/microservicios, esto se traduce en:
 * - Microservicio de pagos aislado
 * - Red privada para comunicación con procesador
 * - API Gateway como único punto de entrada al CDE
 */

// Ejemplo de docker-compose para segmentación
export const DOCKER_COMPOSE_PCI = `
version: '3.8'

services:
  # ═══ FUERA DEL CDE ═══
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
    # Sin acceso a la red de pagos
    
  # ═══ DENTRO DEL CDE ═══
  payment-service:
    build: ./services/payment-service
    networks:
      - payment-network  # Red aislada para pagos
      - internal         # Comunicación interna limitada
    environment:
      - STRIPE_SECRET_KEY=\${STRIPE_SECRET_KEY}
      - PCI_ENCRYPTION_KEY=\${PCI_ENCRYPTION_KEY}
    # Sin acceso directo a internet
    
  payment-db:
    image: postgres:16-alpine
    networks:
      - payment-network  # Solo accesible desde payment-service
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
    internal: true  # Sin acceso a internet
  payment-network:
    driver: bridge
    internal: true  # Sin acceso a internet, aislada

volumes:
  payment-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /encrypted-storage/payment-data  # Almacenamiento encriptado
`;
```

---

### 6. Formulario de Pago Seguro (Frontend)

```typescript
// components/SecurePaymentForm.tsx

/**
 * PCI DSS — Formulario de pago que NUNCA envía datos de tarjeta a tu servidor.
 * Usa Stripe Elements que tokeniza directamente en los servidores de Stripe.
 * 
 * Esto reduce tu alcance PCI de SAQ D (más riguroso) a SAQ A (más simple).
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

    // 1. Crear PaymentMethod — datos van DIRECTO a Stripe, no a tu servidor
    const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Error al procesar la tarjeta');
      setProcessing(false);
      return;
    }

    // 2. Enviar solo el TOKEN a tu servidor (NUNCA datos de tarjeta)
    const response = await fetch('/api/v1/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethodId: paymentMethod.id, // Solo el token
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
          hidePostalCode: false, // Solicitar ZIP para verificación AVS
        }}
      />
      {error && <div role="alert">{error}</div>}
      <button type="submit" disabled={!stripe || processing}>
        {processing ? 'Procesando...' : `Pagar $${(amount / 100).toFixed(2)}`}
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

## Buenas Prácticas PCI DSS

### ✅ HACER

1. **Usar tokenización** — delegarle el manejo de PAN a un procesador PCI Level 1
2. **Stripe Elements / Hosted Fields** en frontend para reducir alcance PCI a SAQ A
3. **TLS 1.2+** obligatorio para toda transmisión de datos de pago
4. **Segmentar el CDE** — aislar la infraestructura de pagos
5. **Audit log completo** de toda operación de pago
6. **Escaneos de vulnerabilidades** trimestrales (ASV para externos)
7. **Penetration testing** anual del CDE
8. **Rotar claves de encriptación** anualmente
9. **Monitoreo en tiempo real** de transacciones sospechosas
10. **Validación de entrada estricta** — detectar PANs en inputs

### ❌ NO HACER

1. **NUNCA** almacenar CVV/CVC después de la autorización
2. **NUNCA** almacenar datos de banda magnética o PIN
3. **NUNCA** loggear números de tarjeta completos
4. **NUNCA** enviar datos de tarjeta por email, chat o canales no seguros
5. **NUNCA** almacenar PAN sin encriptar (si debes almacenarlo)
6. **NUNCA** usar cuentas/contraseñas por defecto en sistemas del CDE
7. **NUNCA** permitir acceso al CDE sin MFA
8. **NUNCA** copiar datos de producción (con PAN) a ambientes de test

---

## Checklist de Cumplimiento PCI DSS v4.0

### Req. 1-2: Red Segura
- [ ] Firewall/WAF configurado para el CDE
- [ ] CDE segmentado de la red general
- [ ] Configuración segura de todos los componentes
- [ ] Cambio de credenciales por defecto

### Req. 3-4: Protección de Datos
- [ ] Inventario de dónde se almacenan datos de tarjeta
- [ ] No almacenar datos de autenticación sensible (CVV, PIN)
- [ ] PAN enmascarado en displays (solo últimos 4 dígitos)
- [ ] PAN encriptado si se almacena (tokenización preferida)
- [ ] TLS 1.2+ para transmisión de datos de tarjeta
- [ ] HSTS habilitado

### Req. 5-6: Gestión de Vulnerabilidades
- [ ] Antimalware en sistemas del CDE
- [ ] Parches de seguridad aplicados oportunamente
- [ ] Proceso de desarrollo seguro (SDLC)
- [ ] Revisión de código de cambios en el CDE
- [ ] Aplicaciones web protegidas (WAF o revisión de código)

### Req. 7-9: Control de Acceso
- [ ] Acceso al CDE restringido por necesidad de negocio
- [ ] IDs únicos para cada usuario con acceso al CDE
- [ ] MFA para acceso remoto y administrativo al CDE
- [ ] Acceso físico al CDE controlado

### Req. 10-11: Monitoreo
- [ ] Audit trails para todo acceso al CDE
- [ ] Logs sincronizados con NTP
- [ ] Logs revisados diariamente
- [ ] Retención de logs: 12 meses (3 meses inmediatamente accesibles)
- [ ] Escaneo trimestral de vulnerabilidades (externo por ASV)
- [ ] Penetration testing anual del CDE

### Req. 12: Políticas
- [ ] Política de seguridad documentada
- [ ] Plan de respuesta a incidentes para brechas de datos de tarjeta
- [ ] Formación de seguridad para personal con acceso al CDE

---

## Referencias y Recursos

- [PCI DSS v4.0 Official](https://www.pcisecuritystandards.org/document_library/)
- [PCI SSC Resources](https://www.pcisecuritystandards.org/)
- [Stripe PCI Compliance Guide](https://stripe.com/guides/pci-compliance)
- [SAQ Types Overview](https://www.pcisecuritystandards.org/assessors_and_solutions/self_assessment_questionnaire)
- [PCI DSS Quick Reference Guide](https://www.pcisecuritystandards.org/documents/PCI_DSS-QRG-v4_0.pdf)
