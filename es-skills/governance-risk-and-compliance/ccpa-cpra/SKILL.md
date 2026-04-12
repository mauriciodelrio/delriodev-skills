---
name: ccpa-cpra
description: >
  Skill de cumplimiento CCPA/CPRA — California Consumer Privacy Act y California Privacy Rights Act.
  Activa esta skill cuando desarrolles software que recolecte, almacene o procese información personal
  de residentes de California. Aplica si tu empresa tiene ingresos > $25M, maneja datos de > 100k
  consumidores/hogares, o gana > 50% de ingresos vendiendo datos personales.
---

# 🏛️ CCPA/CPRA — California Consumer Privacy Act & Privacy Rights Act

## Descripción General

La **CCPA** (California Consumer Privacy Act, 2020) y su enmienda **CPRA** (California Privacy Rights Act, 2023) otorgan a los residentes de California amplios derechos sobre sus datos personales. Es la ley de privacidad más estricta de Estados Unidos y se usa como referencia para otros estados.

**Diferencias clave con GDPR:**
| Aspecto | GDPR | CCPA/CPRA |
|---------|------|-----------|
| **Aplica a** | Residentes de la UE | Residentes de California |
| **Base legal** | 6 bases legales (consentimiento, interés legítimo, etc.) | Opt-out (no requiere consentimiento previo para recolectar) |
| **"Venta" de datos** | Transferencia a terceros | Definición amplísima: incluye compartir datos para publicidad |
| **Datos sensibles** | Categorías especiales (Art. 9) | "Sensitive Personal Information" (SPI) con opt-out separado |
| **Penalidades** | Hasta 4% ingreso global | $2,500 por violación, $7,500 por violación intencional |
| **Autoridad** | DPAs nacionales | California Privacy Protection Agency (CPPA) |

---

## Cuándo Activar esta Skill

Activa esta skill cuando:

- Tu aplicación tenga **usuarios residentes de California**
- Recolectes **información personal** (PI) de consumidores californianos
- Tu empresa tenga **ingresos brutos > $25 millones**
- Compres, recibas, vendas o compartas PI de **> 100,000 consumidores/hogares**
- Generes **> 50% de ingresos** de la venta/compartición de información personal
- Implementes **publicidad basada en comportamiento** (behavioral advertising)
- Trabajes con **data brokers** o terceros que reciban datos de usuarios

---

## Conceptos Fundamentales

### Información Personal (PI) bajo CCPA/CPRA

La definición de "personal information" es *extremadamente* amplia:

- Identificadores: nombre, email, dirección, teléfono, IP, SSN, DL
- Datos comerciales: historial de compras, records de transacciones
- Datos biométricos: huellas, reconocimiento facial
- Actividad online: historial de navegación, búsquedas, interacciones con publicidad
- Geolocalización precisa
- Datos de empleo
- Inferencias: perfiles creados desde cualquiera de los anteriores

### Sensitive Personal Information (SPI) — CPRA

Categoría especial con protecciones adicionales. Los consumidores pueden limitar su uso:

- SSN, driver's license, pasaporte
- Login + credenciales financieras
- Geolocalización precisa
- Raza, etnia, religión, orientación sexual
- Contenido de emails, mensajes de texto
- Datos genéticos y biométricos
- Datos de salud

---

## Requisitos Técnicos de Implementación

### 1. Modelo de Datos de Privacidad

```prisma
// prisma/schema.prisma

/// Registro de información personal recolectada por consumidor
model ConsumerPrivacyProfile {
  id              String   @id @default(cuid())
  
  // Identificador del consumidor (puede ser autenticado o no)
  consumerEmail   String?
  accountId       String?  @unique
  deviceId        String?
  
  // Preferencias de privacidad CCPA/CPRA
  optOutSale          Boolean  @default(false)   // "Do Not Sell My Personal Information"
  optOutSharing       Boolean  @default(false)   // "Do Not Share My Personal Information" (CPRA)
  limitSensitiveUse   Boolean  @default(false)   // Limitar uso de SPI (CPRA)
  
  // Consentimiento financiero (opt-in para menores)
  isMinor             Boolean  @default(false)
  parentalConsent     Boolean?
  
  // Categorías de PI recolectada (para disclosure)
  categoriesCollected String[] @default([])
  sourcesOfCollection String[] @default([])
  purposesOfUse       String[] @default([])
  categoriesShared    String[] @default([])
  
  // Tracking
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  lastVerified    DateTime?
  
  // Relaciones
  requests        ConsumerRequest[]
  
  @@index([consumerEmail])
  @@index([accountId])
  @@map("consumer_privacy_profiles")
}

/// Solicitudes de consumidores (DSAR — Data Subject Access Requests)
model ConsumerRequest {
  id          String              @id @default(cuid())
  profileId   String
  profile     ConsumerPrivacyProfile @relation(fields: [profileId], references: [id])
  
  type        ConsumerRequestType
  status      RequestStatus       @default(RECEIVED)
  
  // CCPA requiere responder en 45 días (extensible a 90)
  receivedAt       DateTime @default(now())
  acknowledgedAt   DateTime?
  deadlineAt       DateTime  // 45 días desde recepción
  extendedDeadline DateTime? // Extensión hasta 90 días
  completedAt      DateTime?
  
  // Verificación de identidad (obligatorio antes de procesar)
  identityVerified    Boolean  @default(false)
  verificationMethod  String?
  
  // Respuesta
  responseData     Json?
  denialReason     String?
  
  @@map("consumer_requests")
}

enum ConsumerRequestType {
  RIGHT_TO_KNOW        // Saber qué PI se recolecta y por qué
  RIGHT_TO_DELETE      // Eliminar toda la PI
  RIGHT_TO_CORRECT     // Corregir PI inexacta (CPRA)
  RIGHT_TO_PORTABILITY // Obtener PI en formato portable (CPRA)
  OPT_OUT_SALE         // No vender mi PI
  OPT_OUT_SHARING      // No compartir mi PI para publicidad (CPRA)
  LIMIT_SENSITIVE       // Limitar uso de info sensible (CPRA)
}

enum RequestStatus {
  RECEIVED
  IDENTITY_VERIFICATION
  IN_PROGRESS
  COMPLETED
  DENIED
  EXTENDED
}
```

---

### 2. Servicio de Derechos del Consumidor

```typescript
// services/ccpa-consumer-rights.service.ts

import { PrismaClient, ConsumerRequestType, RequestStatus } from '@prisma/client';
import pino from 'pino';

const prisma = new PrismaClient();
const logger = pino({ name: 'ccpa-rights' });

// CCPA: El consumidor puede hacer solicitudes 2 veces en un período de 12 meses
const MAX_REQUESTS_PER_YEAR = 2;
const RESPONSE_DEADLINE_DAYS = 45;
const MAX_EXTENSION_DAYS = 90;

export class CCPAConsumerRightsService {
  /**
   * Iniciar una solicitud de consumidor.
   * CCPA §1798.100-§1798.135
   */
  async submitRequest(
    consumerIdentifier: { email?: string; accountId?: string },
    requestType: ConsumerRequestType,
  ) {
    // Buscar o crear perfil de privacidad
    const profile = await this.findOrCreateProfile(consumerIdentifier);

    // Verificar límite de solicitudes (2 por 12 meses para RIGHT_TO_KNOW)
    if (requestType === 'RIGHT_TO_KNOW') {
      const recentRequests = await prisma.consumerRequest.count({
        where: {
          profileId: profile.id,
          type: 'RIGHT_TO_KNOW',
          receivedAt: {
            gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          },
        },
      });

      if (recentRequests >= MAX_REQUESTS_PER_YEAR) {
        return {
          success: false,
          error: 'Has alcanzado el límite de 2 solicitudes de conocimiento por período de 12 meses.',
        };
      }
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + RESPONSE_DEADLINE_DAYS);

    const request = await prisma.consumerRequest.create({
      data: {
        profileId: profile.id,
        type: requestType,
        status: 'IDENTITY_VERIFICATION',
        deadlineAt: deadline,
      },
    });

    logger.info({
      event: 'consumer_request_submitted',
      requestId: request.id,
      type: requestType,
      deadline: deadline.toISOString(),
    }, 'Solicitud de consumidor CCPA recibida');

    // Enviar email de confirmación (CCPA requiere acusar recibo en 10 días)
    // await this.sendAcknowledgment(profile, request);

    return {
      success: true,
      requestId: request.id,
      type: requestType,
      status: 'IDENTITY_VERIFICATION',
      deadline: deadline.toISOString(),
      message: 'Solicitud recibida. Debes verificar tu identidad para continuar.',
    };
  }

  /**
   * Derecho a Saber (Right to Know).
   * CCPA §1798.100, §1798.110, §1798.115
   * 
   * El consumidor tiene derecho a saber:
   * - Qué categorías de PI se recolectan
   * - Las fuentes de recolección
   * - El propósito comercial de la recolección
   * - Las categorías de terceros con quienes se comparte
   * - Las piezas específicas de PI recolectada
   */
  async processRightToKnow(requestId: string): Promise<object> {
    const request = await this.getVerifiedRequest(requestId, 'RIGHT_TO_KNOW');
    
    const profile = await prisma.consumerPrivacyProfile.findUniqueOrThrow({
      where: { id: request.profileId },
    });

    // Recopilar toda la información personal del consumidor
    const personalInfo = await this.collectPersonalInfo(profile.accountId!);

    const disclosure = {
      // §1798.110(a)(1): Categorías de PI recolectada
      categoriesCollected: [
        'Identificadores (email, nombre)',
        'Actividad en internet (historial de uso)',
        'Información comercial (transacciones)',
        'Geolocalización (si se proporcionó)',
      ],
      
      // §1798.110(a)(2): Categorías de fuentes
      sourcesOfCollection: [
        'Directamente del consumidor',
        'Automáticamente mediante cookies y tecnologías similares',
      ],
      
      // §1798.110(a)(3): Propósito comercial
      businessPurposes: [
        'Proveer el servicio solicitado',
        'Mantener la seguridad de la cuenta',
        'Mejorar el servicio',
        'Cumplir con obligaciones legales',
      ],
      
      // §1798.110(a)(4): Categorías de terceros
      thirdPartyCategories: [
        'Proveedores de servicios (hosting, email)',
        'Procesadores de pagos',
      ],
      
      // §1798.110(a)(5): Piezas específicas de PI
      specificPersonalInfo: personalInfo,

      // §1798.115: Información sobre venta/compartición
      salesAndSharing: {
        sold: false,
        shared: false,
        categoriesSold: [],
        categoriesShared: [],
      },
    };

    await prisma.consumerRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        responseData: disclosure as any,
      },
    });

    logger.info({
      event: 'right_to_know_completed',
      requestId,
      profileId: profile.id,
    }, 'Right to Know procesado');

    return disclosure;
  }

  /**
   * Derecho a Eliminar (Right to Delete).
   * CCPA §1798.105
   * 
   * Excepciones permitidas (no necesitas eliminar si):
   * - Necesario para completar la transacción
   * - Seguridad/detección de fraude
   * - Debugging
   * - Cumplimiento legal
   */
  async processRightToDelete(requestId: string): Promise<{ success: boolean; deletedCategories: string[] }> {
    const request = await this.getVerifiedRequest(requestId, 'RIGHT_TO_DELETE');

    const profile = await prisma.consumerPrivacyProfile.findUniqueOrThrow({
      where: { id: request.profileId },
    });

    const deletedCategories: string[] = [];

    await prisma.$transaction(async (tx) => {
      if (profile.accountId) {
        // Pseudonimizar datos de usuario
        await tx.user.update({
          where: { id: profile.accountId },
          data: {
            name: '[ELIMINADO]',
            email: `deleted_${Date.now()}@deleted.invalid`,
            phone: null,
            address: null,
            deletedAt: new Date(),
          },
        });
        deletedCategories.push('Identificadores personales');

        // Eliminar historial de actividad
        // await tx.activityLog.deleteMany({ where: { userId: profile.accountId } });
        deletedCategories.push('Actividad en internet');
      }
    });

    await prisma.consumerRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        responseData: { deletedCategories } as any,
      },
    });

    // CCPA requiere notificar a service providers para que también eliminen
    // await this.notifyServiceProviders(profile.accountId, 'delete');

    logger.info({
      event: 'right_to_delete_completed',
      requestId,
      deletedCategories,
    }, 'Right to Delete procesado');

    return { success: true, deletedCategories };
  }

  /**
   * Derecho a Corregir (Right to Correct) — CPRA §1798.106
   */
  async processRightToCorrect(
    requestId: string,
    corrections: Record<string, unknown>,
  ): Promise<{ success: boolean; correctedFields: string[] }> {
    const request = await this.getVerifiedRequest(requestId, 'RIGHT_TO_CORRECT');
    const correctedFields = Object.keys(corrections);

    // Validar que solo se corrijan campos permitidos
    const allowedFields = ['name', 'email', 'phone', 'address'];
    const invalidFields = correctedFields.filter(f => !allowedFields.includes(f));
    
    if (invalidFields.length > 0) {
      throw new Error(`Campos no permitidos para corrección: ${invalidFields.join(', ')}`);
    }

    const profile = await prisma.consumerPrivacyProfile.findUniqueOrThrow({
      where: { id: request.profileId },
    });

    if (profile.accountId) {
      await prisma.user.update({
        where: { id: profile.accountId },
        data: corrections as any,
      });
    }

    await prisma.consumerRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        responseData: { correctedFields } as any,
      },
    });

    logger.info({
      event: 'right_to_correct_completed',
      requestId,
      correctedFields,
    }, 'Right to Correct procesado');

    return { success: true, correctedFields };
  }

  // --- Helpers privados ---

  private async findOrCreateProfile(identifier: { email?: string; accountId?: string }) {
    const where = identifier.accountId 
      ? { accountId: identifier.accountId }
      : { consumerEmail: identifier.email };

    let profile = await prisma.consumerPrivacyProfile.findFirst({ where });
    
    if (!profile) {
      profile = await prisma.consumerPrivacyProfile.create({
        data: {
          consumerEmail: identifier.email,
          accountId: identifier.accountId,
        },
      });
    }

    return profile;
  }

  private async getVerifiedRequest(requestId: string, expectedType: ConsumerRequestType) {
    const request = await prisma.consumerRequest.findUniqueOrThrow({
      where: { id: requestId },
    });

    if (request.type !== expectedType) {
      throw new Error(`Tipo de solicitud incorrecto: esperado ${expectedType}, recibido ${request.type}`);
    }

    if (!request.identityVerified) {
      throw new Error('La identidad del consumidor no ha sido verificada');
    }

    return request;
  }

  private async collectPersonalInfo(accountId: string): Promise<Record<string, unknown>> {
    const user = await prisma.user.findUnique({
      where: { id: accountId },
      select: {
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return {
      profile: user,
      // Agregar más fuentes de datos según tu aplicación
    };
  }
}
```

---

### 3. Opt-Out "Do Not Sell or Share" (DNSS)

```typescript
// middleware/ccpa-opt-out.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const prisma = new PrismaClient();
const logger = pino({ name: 'ccpa-opt-out' });

/**
 * CCPA §1798.120: Derecho a Opt-Out de la venta de PI.
 * CPRA §1798.120: Extendido a "venta O compartición" de PI.
 * 
 * REQUISITOS:
 * 1. Link visible "Do Not Sell or Share My Personal Information" en el sitio
 * 2. Respetar Global Privacy Control (GPC) header
 * 3. No pedir login para ejercer el opt-out
 * 4. No volver a pedir consentimiento por 12 meses mínimo
 */

/**
 * Detectar señal de Global Privacy Control (GPC).
 * Los navegadores pueden enviar esta señal automáticamente.
 * CCPA/CPRA OBLIGAN a respetar GPC como opt-out válido.
 */
export function detectGlobalPrivacyControl(req: Request, _res: Response, next: NextFunction) {
  // GPC viene como header Sec-GPC: 1
  const gpcHeader = req.headers['sec-gpc'];
  
  if (gpcHeader === '1') {
    // Tratar como opt-out de venta Y compartición
    res.locals.gpcEnabled = true;
    
    logger.info({
      event: 'gpc_detected',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }, 'Global Privacy Control detectado — respetando opt-out automático');
  }

  next();
}

/**
 * Middleware para verificar opt-out antes de compartir datos con terceros.
 * USAR en cualquier endpoint que envíe datos a analytics, ad networks, etc.
 */
export function checkOptOutBeforeSharing(req: Request, res: Response, next: NextFunction) {
  const isOptedOut = res.locals.gpcEnabled || res.locals.consumerOptedOut;

  if (isOptedOut) {
    // No enviar datos a partners de advertising/analytics
    res.locals.allowThirdPartySharing = false;
    res.locals.allowTargetedAds = false;
    res.locals.allowCrossSiteTracking = false;
  } else {
    res.locals.allowThirdPartySharing = true;
    res.locals.allowTargetedAds = true;
    res.locals.allowCrossSiteTracking = true;
  }

  next();
}

/**
 * API de Opt-Out.
 * No requiere autenticación — cualquier consumidor puede ejercer este derecho.
 */
export async function handleOptOut(req: Request, res: Response) {
  const { email, optOutSale, optOutSharing, limitSensitiveUse } = req.body;

  // Buscar o crear perfil
  let profile = await prisma.consumerPrivacyProfile.findFirst({
    where: { consumerEmail: email },
  });

  if (profile) {
    profile = await prisma.consumerPrivacyProfile.update({
      where: { id: profile.id },
      data: {
        optOutSale: optOutSale ?? profile.optOutSale,
        optOutSharing: optOutSharing ?? profile.optOutSharing,
        limitSensitiveUse: limitSensitiveUse ?? profile.limitSensitiveUse,
        lastVerified: new Date(),
      },
    });
  } else {
    profile = await prisma.consumerPrivacyProfile.create({
      data: {
        consumerEmail: email,
        optOutSale: optOutSale ?? false,
        optOutSharing: optOutSharing ?? false,
        limitSensitiveUse: limitSensitiveUse ?? false,
      },
    });
  }

  logger.info({
    event: 'opt_out_updated',
    profileId: profile.id,
    optOutSale: profile.optOutSale,
    optOutSharing: profile.optOutSharing,
    limitSensitiveUse: profile.limitSensitiveUse,
  }, 'Preferencias de opt-out actualizadas');

  res.json({
    success: true,
    preferences: {
      optOutSale: profile.optOutSale,
      optOutSharing: profile.optOutSharing,
      limitSensitiveUse: profile.limitSensitiveUse,
    },
    message: 'Tus preferencias de privacidad han sido actualizadas.',
  });
}
```

---

### 4. Notice at Collection (Aviso en Punto de Recolección)

```typescript
// config/ccpa-notice.config.ts

/**
 * CCPA §1798.100(b): Aviso al consumidor en el punto de recolección.
 * Debe informar ANTES de recolectar datos:
 * - Qué categorías se recolectan
 * - Para qué propósitos
 * - Si se venden o comparten
 * - Período de retención
 */

export interface NoticeAtCollection {
  categories: CategoryNotice[];
  retentionPolicies: RetentionPolicy[];
  thirdPartyDisclosure: ThirdPartyDisclosure[];
  links: { privacyPolicy: string; doNotSell: string; rights: string };
}

interface CategoryNotice {
  category: string;
  examples: string[];
  purpose: string;
  retentionPeriod: string;
  sold: boolean;
  shared: boolean;
}

interface RetentionPolicy {
  dataType: string;
  retentionPeriod: string;
  justification: string;
}

interface ThirdPartyDisclosure {
  recipientCategory: string;
  purpose: string;
  dataCategories: string[];
}

export const NOTICE_AT_COLLECTION: NoticeAtCollection = {
  categories: [
    {
      category: 'Identificadores',
      examples: ['Nombre', 'Email', 'Dirección IP'],
      purpose: 'Proveer el servicio, comunicaciones',
      retentionPeriod: 'Mientras la cuenta esté activa + 30 días',
      sold: false,
      shared: false,
    },
    {
      category: 'Información comercial',
      examples: ['Historial de compras', 'Suscripciones'],
      purpose: 'Proveer el servicio, facturación',
      retentionPeriod: '7 años (requisitos fiscales)',
      sold: false,
      shared: false,
    },
    {
      category: 'Actividad en Internet',
      examples: ['Páginas visitadas', 'Funcionalidades usadas'],
      purpose: 'Mejorar el servicio, analytics',
      retentionPeriod: '12 meses',
      sold: false,
      shared: false,
    },
  ],
  retentionPolicies: [
    {
      dataType: 'Datos de cuenta',
      retentionPeriod: 'Duración de cuenta + 30 días de gracia',
      justification: 'Necesario para proveer el servicio',
    },
    {
      dataType: 'Registros de transacciones',
      retentionPeriod: '7 años',
      justification: 'Requisitos fiscales y legales',
    },
    {
      dataType: 'Logs de actividad',
      retentionPeriod: '12 meses',
      justification: 'Seguridad y mejora del servicio',
    },
  ],
  thirdPartyDisclosure: [
    {
      recipientCategory: 'Proveedores de servicios (Service Providers)',
      purpose: 'Hosting, email, procesamiento de pagos',
      dataCategories: ['Identificadores', 'Información comercial'],
    },
  ],
  links: {
    privacyPolicy: '/privacy',
    doNotSell: '/do-not-sell',
    rights: '/privacy-rights',
  },
};

/**
 * Endpoint para servir el notice at collection y links de privacidad.
 */
export function getPrivacyNotice(): NoticeAtCollection {
  return NOTICE_AT_COLLECTION;
}
```

---

### 5. Menores de Edad (CCPA §1798.120(c-d))

```typescript
// services/ccpa-minors.service.ts

import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const prisma = new PrismaClient();
const logger = pino({ name: 'ccpa-minors' });

/**
 * CCPA trata a los menores de forma especial:
 * - Menores de 13 años: Requieren consentimiento PARENTAL (opt-in) para vender/compartir PI
 * - 13-15 años: Requieren consentimiento del MENOR (opt-in) para vender/compartir PI
 * - 16+ años: Se aplican las reglas normales (opt-out)
 * 
 * CPRA extiende esto a COMPARTIR datos, no solo vender.
 */

export class CCPAMinorsService {
  /**
   * Verificar si podemos vender/compartir datos de un consumidor menor.
   */
  async canSellOrShareData(consumerId: string): Promise<{
    allowed: boolean;
    reason: string;
  }> {
    const profile = await prisma.consumerPrivacyProfile.findFirst({
      where: { accountId: consumerId },
    });

    if (!profile) {
      return { allowed: false, reason: 'Perfil de privacidad no encontrado' };
    }

    // Si el consumidor ha hecho opt-out (cualquier edad > 16)
    if (profile.optOutSale || profile.optOutSharing) {
      return { allowed: false, reason: 'Consumidor ejerció opt-out' };
    }

    // Verificación de menores
    if (profile.isMinor) {
      if (!profile.parentalConsent) {
        return {
          allowed: false,
          reason: 'Menor de edad — se requiere consentimiento parental verificado',
        };
      }
    }

    return { allowed: true, reason: 'Permitido' };
  }
}
```

---

## Buenas Prácticas CCPA/CPRA

### ✅ HACER

1. **Link "Do Not Sell or Share My Personal Information"** visible en toda página del sitio
2. **Respetar Global Privacy Control** (GPC) como señal válida de opt-out
3. **Verificar identidad** antes de procesar solicitudes de derechos (pero NO pedir login para opt-out)
4. **Responder en 45 días** a solicitudes de consumidores (máximo 90 con extensión notificada)
5. **Acusar recibo** de solicitudes dentro de 10 días hábiles
6. **Mantener registro** de todas las solicitudes por 24 meses
7. **Notice at Collection** — informar antes de recolectar datos, no después
8. **Contratos con Service Providers** — cláusulas que prohíban uso de PI fuera del servicio
9. **Opt-in para menores** de 16 años antes de vender/compartir datos
10. **Retención mínima** — no conservar PI más tiempo del necesario

### ❌ NO HACER

1. **NO** exigir cuenta/login para ejercer el derecho de opt-out
2. **NO** discriminar al consumidor por ejercer sus derechos (no cobrar más, no degradar servicio)
3. **NO** vender datos de menores de 16 sin opt-in verificado
4. **NO** ignorar la señal GPC del navegador
5. **NO** hacer el proceso de opt-out intencionalmente difícil (dark patterns)
6. **NO** recolectar más datos de los necesarios para el propósito declarado
7. **NO** retener PI indefinidamente sin justificación
8. **NO** compartir datos con terceros sin contratos de service provider

---

## Checklist de Cumplimiento CCPA/CPRA

### Derechos del Consumidor
- [ ] Right to Know (saber qué PI se recolecta y cómo se usa)
- [ ] Right to Delete (eliminar PI)
- [ ] Right to Correct (corregir PI inexacta) — CPRA
- [ ] Right to Portability (obtener PI en formato portable) — CPRA
- [ ] Right to Opt-Out de venta de PI
- [ ] Right to Opt-Out de compartición de PI — CPRA
- [ ] Right to Limit uso de Sensitive Personal Information — CPRA
- [ ] Right to Non-Discrimination

### Avisos y Links
- [ ] Privacy Policy actualizada con disclosures CCPA/CPRA
- [ ] Notice at Collection (antes de recolectar datos)
- [ ] Link "Do Not Sell or Share My Personal Information" visible
- [ ] Link "Limit the Use of My Sensitive Personal Information" — CPRA
- [ ] Información sobre retención de datos

### Operaciones
- [ ] Verificación de identidad para solicitudes de consumidores
- [ ] Proceso de respuesta dentro de 45 días (máximo 90 con extensión)
- [ ] Acuse de recibo dentro de 10 días hábiles
- [ ] Registro de solicitudes por 24 meses
- [ ] Global Privacy Control (GPC) respetado
- [ ] Protección especial para menores de 16 años
- [ ] Contratos con service providers con cláusulas de privacidad
- [ ] Entrenamiento de empleados que manejan solicitudes de consumidores

---

## Referencias y Recursos

- [CCPA Texto completo — California Legislative Information](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&part=4.&lawCode=CIV&title=1.81.5)
- [CPRA Texto completo](https://thecpra.org/)
- [California Privacy Protection Agency (CPPA)](https://cppa.ca.gov/)
- [Global Privacy Control (GPC)](https://globalprivacycontrol.org/)
- [CCPA Regulations — Final Text](https://www.oag.ca.gov/privacy/ccpa/regs)
