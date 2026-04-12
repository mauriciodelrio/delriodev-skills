---
name: ccpa-cpra
description: >
  CCPA/CPRA compliance skill — California Consumer Privacy Act and California Privacy Rights Act.
  Activate this skill when developing software that collects, stores, or processes personal information
  from California residents. Applies if your company has revenue > $25M, handles data of > 100k
  consumers/households, or earns > 50% of revenue selling personal data.
---

# 🏛️ CCPA/CPRA — California Consumer Privacy Act & Privacy Rights Act

## General Description

The **CCPA** (California Consumer Privacy Act, 2020) and its amendment **CPRA** (California Privacy Rights Act, 2023) grant California residents broad rights over their personal data. It is the strictest privacy law in the United States and is used as a reference for other states.

**Key differences from GDPR:**
| Aspect | GDPR | CCPA/CPRA |
|--------|------|-----------|
| **Applies to** | EU residents | California residents |
| **Legal basis** | 6 legal bases (consent, legitimate interest, etc.) | Opt-out (does not require prior consent to collect) |
| **Data "sale"** | Transfer to third parties | Very broad definition: includes sharing data for advertising |
| **Sensitive data** | Special categories (Art. 9) | "Sensitive Personal Information" (SPI) with separate opt-out |
| **Penalties** | Up to 4% global revenue | $2,500 per violation, $7,500 per intentional violation |
| **Authority** | National DPAs | California Privacy Protection Agency (CPPA) |

---

## When to Activate this Skill

Activate this skill when:

- Your application has **California resident users**
- You collect **personal information** (PI) from California consumers
- Your company has **gross revenue > $25 million**
- You buy, receive, sell, or share PI of **> 100,000 consumers/households**
- You generate **> 50% of revenue** from selling/sharing personal information
- You implement **behavioral advertising** (behavioral advertising)
- You work with **data brokers** or third parties that receive user data

---

## Fundamental Concepts

### Personal Information (PI) under CCPA/CPRA

The definition of "personal information" is *extremely* broad:

- Identifiers: name, email, address, phone, IP, SSN, DL
- Commercial data: purchase history, transaction records
- Biometric data: fingerprints, facial recognition
- Online activity: browsing history, searches, ad interactions
- Precise geolocation
- Employment data
- Inferences: profiles created from any of the above

### Sensitive Personal Information (SPI) — CPRA

Special category with additional protections. Consumers can limit its use:

- SSN, driver's license, passport
- Login + financial credentials
- Precise geolocation
- Race, ethnicity, religion, sexual orientation
- Email content, text messages
- Genetic and biometric data
- Health data

---

## Technical Implementation Requirements

### 1. Privacy Data Model

```prisma
// prisma/schema.prisma

/// Personal information collection record per consumer
model ConsumerPrivacyProfile {
  id              String   @id @default(cuid())
  
  // Consumer identifier (can be authenticated or not)
  consumerEmail   String?
  accountId       String?  @unique
  deviceId        String?
  
  // CCPA/CPRA privacy preferences
  optOutSale          Boolean  @default(false)   // "Do Not Sell My Personal Information"
  optOutSharing       Boolean  @default(false)   // "Do Not Share My Personal Information" (CPRA)
  limitSensitiveUse   Boolean  @default(false)   // Limit SPI use (CPRA)
  
  // Financial consent (opt-in for minors)
  isMinor             Boolean  @default(false)
  parentalConsent     Boolean?
  
  // Categories of PI collected (for disclosure)
  categoriesCollected String[] @default([])
  sourcesOfCollection String[] @default([])
  purposesOfUse       String[] @default([])
  categoriesShared    String[] @default([])
  
  // Tracking
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  lastVerified    DateTime?
  
  // Relations
  requests        ConsumerRequest[]
  
  @@index([consumerEmail])
  @@index([accountId])
  @@map("consumer_privacy_profiles")
}

/// Consumer requests (DSAR — Data Subject Access Requests)
model ConsumerRequest {
  id          String              @id @default(cuid())
  profileId   String
  profile     ConsumerPrivacyProfile @relation(fields: [profileId], references: [id])
  
  type        ConsumerRequestType
  status      RequestStatus       @default(RECEIVED)
  
  // CCPA requires response within 45 days (extendable to 90)
  receivedAt       DateTime @default(now())
  acknowledgedAt   DateTime?
  deadlineAt       DateTime  // 45 days from receipt
  extendedDeadline DateTime? // Extension up to 90 days
  completedAt      DateTime?
  
  // Identity verification (required before processing)
  identityVerified    Boolean  @default(false)
  verificationMethod  String?
  
  // Response
  responseData     Json?
  denialReason     String?
  
  @@map("consumer_requests")
}

enum ConsumerRequestType {
  RIGHT_TO_KNOW        // Know what PI is collected and why
  RIGHT_TO_DELETE      // Delete all PI
  RIGHT_TO_CORRECT     // Correct inaccurate PI (CPRA)
  RIGHT_TO_PORTABILITY // Get PI in portable format (CPRA)
  OPT_OUT_SALE         // Do not sell my PI
  OPT_OUT_SHARING      // Do not share my PI for advertising (CPRA)
  LIMIT_SENSITIVE       // Limit use of sensitive info (CPRA)
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

### 2. Consumer Rights Service

```typescript
// services/ccpa-consumer-rights.service.ts

import { PrismaClient, ConsumerRequestType, RequestStatus } from '@prisma/client';
import pino from 'pino';

const prisma = new PrismaClient();
const logger = pino({ name: 'ccpa-rights' });

// CCPA: The consumer can make requests 2 times in a 12-month period
const MAX_REQUESTS_PER_YEAR = 2;
const RESPONSE_DEADLINE_DAYS = 45;
const MAX_EXTENSION_DAYS = 90;

export class CCPAConsumerRightsService {
  /**
   * Submit a consumer request.
   * CCPA §1798.100-§1798.135
   */
  async submitRequest(
    consumerIdentifier: { email?: string; accountId?: string },
    requestType: ConsumerRequestType,
  ) {
    // Find or create privacy profile
    const profile = await this.findOrCreateProfile(consumerIdentifier);

    // Check request limit (2 per 12 months for RIGHT_TO_KNOW)
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
          error: 'You have reached the limit of 2 right-to-know requests per 12-month period.',
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
    }, 'CCPA consumer request received');

    // Send confirmation email (CCPA requires acknowledging receipt within 10 days)
    // await this.sendAcknowledgment(profile, request);

    return {
      success: true,
      requestId: request.id,
      type: requestType,
      status: 'IDENTITY_VERIFICATION',
      deadline: deadline.toISOString(),
      message: 'Request received. You must verify your identity to continue.',
    };
  }

  /**
   * Right to Know.
   * CCPA §1798.100, §1798.110, §1798.115
   * 
   * The consumer has the right to know:
   * - What categories of PI are collected
   * - The sources of collection
   * - The business purpose for collection
   * - The categories of third parties with whom it is shared
   * - The specific pieces of PI collected
   */
  async processRightToKnow(requestId: string): Promise<object> {
    const request = await this.getVerifiedRequest(requestId, 'RIGHT_TO_KNOW');
    
    const profile = await prisma.consumerPrivacyProfile.findUniqueOrThrow({
      where: { id: request.profileId },
    });

    // Collect all personal information about the consumer
    const personalInfo = await this.collectPersonalInfo(profile.accountId!);

    const disclosure = {
      // §1798.110(a)(1): Categories of PI collected
      categoriesCollected: [
        'Identifiers (email, name)',
        'Internet activity (usage history)',
        'Commercial information (transactions)',
        'Geolocation (if provided)',
      ],
      
      // §1798.110(a)(2): Categories of sources
      sourcesOfCollection: [
        'Directly from the consumer',
        'Automatically through cookies and similar technologies',
      ],
      
      // §1798.110(a)(3): Business purpose
      businessPurposes: [
        'Provide the requested service',
        'Maintain account security',
        'Improve the service',
        'Comply with legal obligations',
      ],
      
      // §1798.110(a)(4): Categories of third parties
      thirdPartyCategories: [
        'Service providers (hosting, email)',
        'Payment processors',
      ],
      
      // §1798.110(a)(5): Specific pieces of PI
      specificPersonalInfo: personalInfo,

      // §1798.115: Information about sale/sharing
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
    }, 'Right to Know processed');

    return disclosure;
  }

  /**
   * Right to Delete.
   * CCPA §1798.105
   * 
   * Permitted exceptions (you don't need to delete if):
   * - Necessary to complete the transaction
   * - Security/fraud detection
   * - Debugging
   * - Legal compliance
   */
  async processRightToDelete(requestId: string): Promise<{ success: boolean; deletedCategories: string[] }> {
    const request = await this.getVerifiedRequest(requestId, 'RIGHT_TO_DELETE');

    const profile = await prisma.consumerPrivacyProfile.findUniqueOrThrow({
      where: { id: request.profileId },
    });

    const deletedCategories: string[] = [];

    await prisma.$transaction(async (tx) => {
      if (profile.accountId) {
        // Pseudonymize user data
        await tx.user.update({
          where: { id: profile.accountId },
          data: {
            name: '[DELETED]',
            email: `deleted_${Date.now()}@deleted.invalid`,
            phone: null,
            address: null,
            deletedAt: new Date(),
          },
        });
        deletedCategories.push('Personal identifiers');

        // Delete activity history
        // await tx.activityLog.deleteMany({ where: { userId: profile.accountId } });
        deletedCategories.push('Internet activity');
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

    // CCPA requires notifying service providers to also delete
    // await this.notifyServiceProviders(profile.accountId, 'delete');

    logger.info({
      event: 'right_to_delete_completed',
      requestId,
      deletedCategories,
    }, 'Right to Delete processed');

    return { success: true, deletedCategories };
  }

  /**
   * Right to Correct — CPRA §1798.106
   */
  async processRightToCorrect(
    requestId: string,
    corrections: Record<string, unknown>,
  ): Promise<{ success: boolean; correctedFields: string[] }> {
    const request = await this.getVerifiedRequest(requestId, 'RIGHT_TO_CORRECT');
    const correctedFields = Object.keys(corrections);

    // Validate that only allowed fields are corrected
    const allowedFields = ['name', 'email', 'phone', 'address'];
    const invalidFields = correctedFields.filter(f => !allowedFields.includes(f));
    
    if (invalidFields.length > 0) {
      throw new Error(`Fields not allowed for correction: ${invalidFields.join(', ')}`);
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
    }, 'Right to Correct processed');

    return { success: true, correctedFields };
  }

  // --- Private helpers ---

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
      throw new Error(`Incorrect request type: expected ${expectedType}, received ${request.type}`);
    }

    if (!request.identityVerified) {
      throw new Error('Consumer identity has not been verified');
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
      // Add more data sources as needed for your application
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
 * CCPA §1798.120: Right to Opt-Out of PI sale.
 * CPRA §1798.120: Extended to "sale OR sharing" of PI.
 * 
 * REQUIREMENTS:
 * 1. Visible "Do Not Sell or Share My Personal Information" link on the site
 * 2. Respect Global Privacy Control (GPC) header
 * 3. Do not require login to exercise opt-out
 * 4. Do not re-request consent for at least 12 months
 */

/**
 * Detect Global Privacy Control (GPC) signal.
 * Browsers can send this signal automatically.
 * CCPA/CPRA REQUIRES respecting GPC as a valid opt-out.
 */
export function detectGlobalPrivacyControl(req: Request, _res: Response, next: NextFunction) {
  // GPC comes as header Sec-GPC: 1
  const gpcHeader = req.headers['sec-gpc'];
  
  if (gpcHeader === '1') {
    // Treat as opt-out of both sale AND sharing
    res.locals.gpcEnabled = true;
    
    logger.info({
      event: 'gpc_detected',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }, 'Global Privacy Control detected — respecting automatic opt-out');
  }

  next();
}

/**
 * Middleware to check opt-out before sharing data with third parties.
 * USE on any endpoint that sends data to analytics, ad networks, etc.
 */
export function checkOptOutBeforeSharing(req: Request, res: Response, next: NextFunction) {
  const isOptedOut = res.locals.gpcEnabled || res.locals.consumerOptedOut;

  if (isOptedOut) {
    // Do not send data to advertising/analytics partners
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
 * Opt-Out API.
 * Does not require authentication — any consumer can exercise this right.
 */
export async function handleOptOut(req: Request, res: Response) {
  const { email, optOutSale, optOutSharing, limitSensitiveUse } = req.body;

  // Find or create profile
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
  }, 'Opt-out preferences updated');

  res.json({
    success: true,
    preferences: {
      optOutSale: profile.optOutSale,
      optOutSharing: profile.optOutSharing,
      limitSensitiveUse: profile.limitSensitiveUse,
    },
    message: 'Your privacy preferences have been updated.',
  });
}
```

---

### 4. Notice at Collection

```typescript
// config/ccpa-notice.config.ts

/**
 * CCPA §1798.100(b): Notice to the consumer at the point of collection.
 * Must inform BEFORE collecting data:
 * - What categories are collected
 * - For what purposes
 * - If data is sold or shared
 * - Retention period
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
      category: 'Identifiers',
      examples: ['Name', 'Email', 'IP Address'],
      purpose: 'Provide the service, communications',
      retentionPeriod: 'While the account is active + 30 days',
      sold: false,
      shared: false,
    },
    {
      category: 'Commercial information',
      examples: ['Purchase history', 'Subscriptions'],
      purpose: 'Provide the service, billing',
      retentionPeriod: '7 years (tax requirements)',
      sold: false,
      shared: false,
    },
    {
      category: 'Internet activity',
      examples: ['Pages visited', 'Features used'],
      purpose: 'Improve the service, analytics',
      retentionPeriod: '12 months',
      sold: false,
      shared: false,
    },
  ],
  retentionPolicies: [
    {
      dataType: 'Account data',
      retentionPeriod: 'Account duration + 30-day grace period',
      justification: 'Necessary to provide the service',
    },
    {
      dataType: 'Transaction records',
      retentionPeriod: '7 years',
      justification: 'Tax and legal requirements',
    },
    {
      dataType: 'Activity logs',
      retentionPeriod: '12 months',
      justification: 'Security and service improvement',
    },
  ],
  thirdPartyDisclosure: [
    {
      recipientCategory: 'Service Providers',
      purpose: 'Hosting, email, payment processing',
      dataCategories: ['Identifiers', 'Commercial information'],
    },
  ],
  links: {
    privacyPolicy: '/privacy',
    doNotSell: '/do-not-sell',
    rights: '/privacy-rights',
  },
};

/**
 * Endpoint to serve the notice at collection and privacy links.
 */
export function getPrivacyNotice(): NoticeAtCollection {
  return NOTICE_AT_COLLECTION;
}
```

---

### 5. Minors (CCPA §1798.120(c-d))

```typescript
// services/ccpa-minors.service.ts

import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const prisma = new PrismaClient();
const logger = pino({ name: 'ccpa-minors' });

/**
 * CCPA treats minors specially:
 * - Under 13: Require PARENTAL consent (opt-in) to sell/share PI
 * - 13-15 years: Require the MINOR's consent (opt-in) to sell/share PI
 * - 16+: Normal rules apply (opt-out)
 * 
 * CPRA extends this to SHARING data, not just selling.
 */

export class CCPAMinorsService {
  /**
   * Check if we can sell/share data of a minor consumer.
   */
  async canSellOrShareData(consumerId: string): Promise<{
    allowed: boolean;
    reason: string;
  }> {
    const profile = await prisma.consumerPrivacyProfile.findFirst({
      where: { accountId: consumerId },
    });

    if (!profile) {
      return { allowed: false, reason: 'Privacy profile not found' };
    }

    // If the consumer has opted out (any age > 16)
    if (profile.optOutSale || profile.optOutSharing) {
      return { allowed: false, reason: 'Consumer exercised opt-out' };
    }

    // Minor verification
    if (profile.isMinor) {
      if (!profile.parentalConsent) {
        return {
          allowed: false,
          reason: 'Minor — verified parental consent required',
        };
      }
    }

    return { allowed: true, reason: 'Allowed' };
  }
}
```

---

## CCPA/CPRA Best Practices

### ✅ DO

1. **"Do Not Sell or Share My Personal Information" link** visible on every page of the site
2. **Respect Global Privacy Control** (GPC) as a valid opt-out signal
3. **Verify identity** before processing rights requests (but DO NOT require login for opt-out)
4. **Respond within 45 days** to consumer requests (maximum 90 with notified extension)
5. **Acknowledge receipt** of requests within 10 business days
6. **Maintain a record** of all requests for 24 months
7. **Notice at Collection** — inform before collecting data, not after
8. **Contracts with Service Providers** — clauses prohibiting PI use outside the service
9. **Opt-in for minors** under 16 before selling/sharing data
10. **Minimum retention** — don't keep PI longer than necessary

### ❌ DO NOT

1. **DO NOT** require an account/login to exercise the opt-out right
2. **DO NOT** discriminate against consumers for exercising their rights (no higher prices, no degraded service)
3. **DO NOT** sell data of minors under 16 without verified opt-in
4. **DO NOT** ignore the GPC browser signal
5. **DO NOT** make the opt-out process intentionally difficult (dark patterns)
6. **DO NOT** collect more data than necessary for the stated purpose
7. **DO NOT** retain PI indefinitely without justification
8. **DO NOT** share data with third parties without service provider contracts

---

## CCPA/CPRA Compliance Checklist

### Consumer Rights
- [ ] Right to Know (what PI is collected and how it's used)
- [ ] Right to Delete (delete PI)
- [ ] Right to Correct (correct inaccurate PI) — CPRA
- [ ] Right to Portability (get PI in portable format) — CPRA
- [ ] Right to Opt-Out of PI sale
- [ ] Right to Opt-Out of PI sharing — CPRA
- [ ] Right to Limit use of Sensitive Personal Information — CPRA
- [ ] Right to Non-Discrimination

### Notices and Links
- [ ] Privacy Policy updated with CCPA/CPRA disclosures
- [ ] Notice at Collection (before collecting data)
- [ ] Visible "Do Not Sell or Share My Personal Information" link
- [ ] "Limit the Use of My Sensitive Personal Information" link — CPRA
- [ ] Data retention information

### Operations
- [ ] Identity verification for consumer requests
- [ ] Response process within 45 days (maximum 90 with extension)
- [ ] Acknowledgment of receipt within 10 business days
- [ ] Request records maintained for 24 months
- [ ] Global Privacy Control (GPC) respected
- [ ] Special protection for minors under 16
- [ ] Contracts with service providers with privacy clauses
- [ ] Training for employees who handle consumer requests

---

## References and Resources

- [CCPA Full Text — California Legislative Information](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&part=4.&lawCode=CIV&title=1.81.5)
- [CPRA Full Text](https://thecpra.org/)
- [California Privacy Protection Agency (CPPA)](https://cppa.ca.gov/)
- [Global Privacy Control (GPC)](https://globalprivacycontrol.org/)
- [CCPA Regulations — Final Text](https://www.oag.ca.gov/privacy/ccpa/regs)
