---
name: iso-27001
description: >
  ISO/IEC 27001:2022 compliance skill — Information Security Management System (ISMS).
  Activate this skill when designing security architecture, implementing access controls,
  risk management, security policies, business continuity, or any Annex A control.
  Fundamental for organizations seeking ISO 27001 certification.
---

# 🔒 ISO/IEC 27001:2022 — Information Security Management System

## General Description

**ISO/IEC 27001:2022** is the international standard for establishing, implementing, maintaining, and continually improving an **Information Security Management System (ISMS)**. It is the most globally recognized security standard and the foundation for most enterprise security programs.

The 2022 version reorganized Annex A controls into 4 categories (previously 14) with 93 controls (previously 114).

---

## When to Activate this Skill

Activate this skill **whenever** you:

- Design the **security architecture** of an application or service
- Implement **access controls** (authentication, authorization, RBAC)
- Configure **infrastructure** (servers, containers, CI/CD)
- Work on **risk management** and threat assessment
- Implement **logging, monitoring, and incident detection**
- Design **business continuity and disaster recovery** policies
- Configure **vulnerability management** and patching
- Prepare for an ISO 27001 certification audit
- Implement **vendor management** and supply chain security

---

## Standard Structure

### ISMS Clauses (4-10)

| Clause | Topic | Relevance to Development |
|--------|-------|--------------------------|
| 4 | Context of the organization | Understanding what to protect |
| 5 | Leadership | Security policies |
| 6 | Planning | Risk assessment and treatment |
| 7 | Support | Competencies, communication, documentation |
| 8 | Operation | Implementation of controls |
| 9 | Performance evaluation | Monitoring, auditing, review |
| 10 | Improvement | Corrective actions, continual improvement |

### Annex A Controls (ISO 27001:2022)

| Category | Controls | Examples |
|----------|----------|----------|
| **Organizational** (A.5) | 37 controls | Policies, roles, information classification |
| **People** (A.6) | 8 controls | Employee screening, training |
| **Physical** (A.7) | 14 controls | Perimeters, equipment, media |
| **Technological** (A.8) | 34 controls | Authentication, cryptography, secure development |

---

## Technical Implementation Requirements

### 1. Information Classification and Handling (A.5.12, A.5.13)

```typescript
// types/information-classification.ts

/**
 * ISO 27001 A.5.12 — Information classification
 * All information must be classified according to its sensitivity and criticality.
 */
export enum InformationClassification {
  PUBLIC = 'public',               // Public information — no restrictions
  INTERNAL = 'internal',           // Internal use — employees
  CONFIDENTIAL = 'confidential',   // Confidential — restricted access
  RESTRICTED = 'restricted',       // Restricted — maximum protection
}

/**
 * Controls required per classification level.
 */
interface ClassificationControls {
  encryption: {
    atRest: boolean;
    inTransit: boolean;
    algorithm?: string;
  };
  access: {
    requiresMFA: boolean;
    maxAccessLevel: string[];
    requiresApproval: boolean;
  };
  handling: {
    canEmail: boolean;
    canPrint: boolean;
    canExport: boolean;
    canShareExternal: boolean;
    watermark: boolean;
  };
  retention: {
    minDays: number;
    maxDays: number;
    disposalMethod: 'archive' | 'delete' | 'crypto_erase';
  };
  audit: {
    logAccess: boolean;
    logModification: boolean;
    alertOnAccess: boolean;
  };
}

export const CLASSIFICATION_CONTROLS: Record<InformationClassification, ClassificationControls> = {
  [InformationClassification.PUBLIC]: {
    encryption: { atRest: false, inTransit: true },
    access: { requiresMFA: false, maxAccessLevel: ['*'], requiresApproval: false },
    handling: { canEmail: true, canPrint: true, canExport: true, canShareExternal: true, watermark: false },
    retention: { minDays: 0, maxDays: 365 * 5, disposalMethod: 'delete' },
    audit: { logAccess: false, logModification: true, alertOnAccess: false },
  },
  [InformationClassification.INTERNAL]: {
    encryption: { atRest: false, inTransit: true },
    access: { requiresMFA: false, maxAccessLevel: ['employee', 'contractor'], requiresApproval: false },
    handling: { canEmail: true, canPrint: true, canExport: true, canShareExternal: false, watermark: false },
    retention: { minDays: 90, maxDays: 365 * 3, disposalMethod: 'delete' },
    audit: { logAccess: false, logModification: true, alertOnAccess: false },
  },
  [InformationClassification.CONFIDENTIAL]: {
    encryption: { atRest: true, inTransit: true, algorithm: 'AES-256-GCM' },
    access: { requiresMFA: true, maxAccessLevel: ['manager', 'admin'], requiresApproval: true },
    handling: { canEmail: false, canPrint: false, canExport: true, canShareExternal: false, watermark: true },
    retention: { minDays: 365, maxDays: 365 * 7, disposalMethod: 'crypto_erase' },
    audit: { logAccess: true, logModification: true, alertOnAccess: false },
  },
  [InformationClassification.RESTRICTED]: {
    encryption: { atRest: true, inTransit: true, algorithm: 'AES-256-GCM' },
    access: { requiresMFA: true, maxAccessLevel: ['admin', 'security_officer'], requiresApproval: true },
    handling: { canEmail: false, canPrint: false, canExport: false, canShareExternal: false, watermark: true },
    retention: { minDays: 365 * 2, maxDays: 365 * 10, disposalMethod: 'crypto_erase' },
    audit: { logAccess: true, logModification: true, alertOnAccess: true },
  },
};
```

#### Classification Middleware

```typescript
// middleware/classification.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { InformationClassification, CLASSIFICATION_CONTROLS } from '../types/information-classification';
import pino from 'pino';

const logger = pino({ name: 'classification-control' });

/**
 * A.5.13 — Information labelling
 * Middleware that applies controls based on the resource's classification.
 */
export function classificationGuard(classification: InformationClassification) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const controls = CLASSIFICATION_CONTROLS[classification];

    // Verify MFA if required
    if (controls.access.requiresMFA && !req.user?.mfaVerified) {
      return res.status(403).json({
        error: 'Multi-factor authentication required',
        code: 'MFA_REQUIRED',
        classification,
      });
    }

    // Verify access level
    if (!controls.access.maxAccessLevel.includes('*')) {
      const hasAccessLevel = controls.access.maxAccessLevel.includes(req.user?.role ?? '');
      if (!hasAccessLevel) {
        logger.warn({
          event: 'access_denied_classification',
          userId: req.user?.id,
          userRole: req.user?.role,
          classification,
          requiredLevels: controls.access.maxAccessLevel,
        }, 'Access denied by information classification');

        return res.status(403).json({
          error: 'Insufficient access level',
          code: 'INSUFFICIENT_CLEARANCE',
          classification,
        });
      }
    }

    // Add classification headers to the response
    res.setHeader('X-Information-Classification', classification);
    
    if (controls.handling.watermark) {
      res.setHeader('X-Watermark', `${req.user?.id}-${Date.now()}`);
    }

    // Log access if required
    if (controls.audit.logAccess) {
      logger.info({
        event: 'classified_resource_access',
        userId: req.user?.id,
        classification,
        resource: req.originalUrl,
        method: req.method,
      }, 'Classified resource accessed');
    }

    next();
  };
}
```

---

### 2. Access Control (A.5.15 — A.5.18, A.8.2 — A.8.5)

```typescript
// services/access-control.service.ts

import { z } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'access-control' });

/**
 * A.5.15 — Access control
 * A.5.18 — Access rights
 * A.8.2 — Privileged access rights
 * A.8.3 — Information access restriction
 * 
 * ABAC (Attribute-Based Access Control) implementation combining:
 * - User role (RBAC)
 * - Resource attributes (classification, owner)
 * - Context (time, IP, device)
 */

interface AccessPolicy {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'admin';
  conditions: {
    roles?: string[];
    departments?: string[];
    timeRestriction?: { startHour: number; endHour: number };
    ipWhitelist?: string[];
    mfaRequired?: boolean;
    maxClassification?: string;
  };
}

// Declarative access policies
const ACCESS_POLICIES: AccessPolicy[] = [
  {
    resource: 'users:*',
    action: 'read',
    conditions: {
      roles: ['admin', 'manager', 'hr'],
    },
  },
  {
    resource: 'users:*',
    action: 'admin',
    conditions: {
      roles: ['admin'],
      mfaRequired: true,
      ipWhitelist: ['10.0.0.0/8', '172.16.0.0/12'], // Internal network only
    },
  },
  {
    resource: 'financial:*',
    action: 'read',
    conditions: {
      roles: ['cfo', 'finance_manager', 'auditor'],
      mfaRequired: true,
      timeRestriction: { startHour: 8, endHour: 20 }, // Business hours only
    },
  },
  {
    resource: 'security:audit_logs',
    action: 'read',
    conditions: {
      roles: ['security_officer', 'auditor'],
      mfaRequired: true,
    },
  },
];

interface AccessContext {
  userId: string;
  role: string;
  department: string;
  ipAddress: string;
  mfaVerified: boolean;
  timestamp: Date;
}

export class AccessControlService {
  /**
   * Evaluate whether access is permitted according to defined policies.
   */
  evaluate(
    resource: string,
    action: AccessPolicy['action'],
    context: AccessContext,
  ): { allowed: boolean; reason: string } {
    // Find applicable policies
    const applicablePolicies = ACCESS_POLICIES.filter(
      p => this.matchResource(p.resource, resource) && p.action === action
    );

    if (applicablePolicies.length === 0) {
      // A.5.15: By default, deny access (deny by default)
      logger.warn({
        event: 'access_denied_no_policy',
        resource,
        action,
        userId: context.userId,
      }, 'Access denied: no applicable policy');

      return { allowed: false, reason: 'No access policy exists for this resource' };
    }

    // Evaluate each policy (OR: one allowing is sufficient)
    for (const policy of applicablePolicies) {
      const result = this.evaluatePolicy(policy, context);
      if (result.allowed) {
        logger.info({
          event: 'access_granted',
          resource,
          action,
          userId: context.userId,
          role: context.role,
          policy: policy.resource,
        }, 'Access granted');
        return result;
      }
    }

    return { allowed: false, reason: 'No applicable access policy grants permissions' };
  }

  private evaluatePolicy(policy: AccessPolicy, context: AccessContext): { allowed: boolean; reason: string } {
    const { conditions } = policy;

    // Verify role
    if (conditions.roles && !conditions.roles.includes(context.role)) {
      return { allowed: false, reason: `Role ${context.role} not authorized` };
    }

    // Verify department
    if (conditions.departments && !conditions.departments.includes(context.department)) {
      return { allowed: false, reason: `Department ${context.department} not authorized` };
    }

    // Verify MFA
    if (conditions.mfaRequired && !context.mfaVerified) {
      return { allowed: false, reason: 'Multi-factor authentication required' };
    }

    // Verify time restriction
    if (conditions.timeRestriction) {
      const hour = context.timestamp.getHours();
      if (hour < conditions.timeRestriction.startHour || hour >= conditions.timeRestriction.endHour) {
        return { allowed: false, reason: 'Access outside permitted hours' };
      }
    }

    // Verify IP whitelist
    if (conditions.ipWhitelist) {
      const isAllowed = conditions.ipWhitelist.some(cidr => this.ipInCIDR(context.ipAddress, cidr));
      if (!isAllowed) {
        return { allowed: false, reason: 'Unauthorized IP' };
      }
    }

    return { allowed: true, reason: 'Access authorized by policy' };
  }

  private matchResource(pattern: string, resource: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(resource);
  }

  private ipInCIDR(ip: string, cidr: string): boolean {
    // Simplified implementation — use a library like 'ip-cidr' in production
    const [range, bits] = cidr.split('/');
    if (!bits) return ip === range;
    // Basic network prefix check
    const ipParts = ip.split('.').map(Number);
    const rangeParts = range.split('.').map(Number);
    const mask = parseInt(bits, 10);
    const octets = Math.floor(mask / 8);
    return ipParts.slice(0, octets).every((part, i) => part === rangeParts[i]);
  }
}
```

---

### 3. Technical Vulnerability Management (A.8.8)

```typescript
// scripts/vulnerability-check.ts

import { execSync } from 'node:child_process';
import pino from 'pino';

const logger = pino({ name: 'vulnerability-management' });

/**
 * A.8.8 — Management of technical vulnerabilities.
 * Automatic verification of vulnerable dependencies.
 * Integrate into CI/CD pipeline.
 */

interface VulnerabilityReport {
  timestamp: string;
  totalDependencies: number;
  vulnerabilities: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
  details: VulnerabilityDetail[];
  policyViolation: boolean;
}

interface VulnerabilityDetail {
  package: string;
  severity: string;
  title: string;
  fixAvailable: boolean;
  recommendation: string;
}

export async function runVulnerabilityCheck(): Promise<VulnerabilityReport> {
  logger.info({ event: 'vuln_check_started' }, 'Starting vulnerability verification');

  try {
    // Run npm audit in JSON format
    const output = execSync('npm audit --json 2>/dev/null', {
      encoding: 'utf-8',
      timeout: 60000,
    });

    const auditResult = JSON.parse(output);

    const report: VulnerabilityReport = {
      timestamp: new Date().toISOString(),
      totalDependencies: auditResult.metadata?.totalDependencies ?? 0,
      vulnerabilities: {
        critical: auditResult.metadata?.vulnerabilities?.critical ?? 0,
        high: auditResult.metadata?.vulnerabilities?.high ?? 0,
        moderate: auditResult.metadata?.vulnerabilities?.moderate ?? 0,
        low: auditResult.metadata?.vulnerabilities?.low ?? 0,
      },
      details: [],
      policyViolation: false,
    };

    // ISO 27001 Policy: Critical or high vulnerabilities are not allowed in production
    report.policyViolation = report.vulnerabilities.critical > 0 || report.vulnerabilities.high > 0;

    if (report.policyViolation) {
      logger.error({
        event: 'vuln_policy_violation',
        critical: report.vulnerabilities.critical,
        high: report.vulnerabilities.high,
      }, '🚨 POLICY VIOLATION: Critical/high vulnerabilities detected');
    }

    return report;
  } catch (error) {
    logger.error({ event: 'vuln_check_error', error }, 'Error in vulnerability verification');
    throw error;
  }
}

/**
 * GitHub Actions workflow for continuous verification.
 * Create as .github/workflows/security-audit.yml
 */
export const SECURITY_AUDIT_WORKFLOW = `
name: ISO 27001 - Security Audit
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # Every Monday at 6 AM

jobs:
  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
      - run: npm ci
      - name: Run npm audit
        run: npm audit --audit-level=high
        continue-on-error: true
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: \${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  sast-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          languages: javascript-typescript

  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Detect secrets
        uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified
`;
```

---

### 4. Secure Development (A.8.25 — A.8.28, A.8.31)

```typescript
// config/secure-development.config.ts

/**
 * A.8.25 — Secure development lifecycle
 * A.8.26 — Application security requirements
 * A.8.27 — Secure systems engineering principles
 * A.8.28 — Secure coding
 * A.8.31 — Separation of environments
 */

/**
 * Security configuration per environment.
 * A.8.31: Development, testing, and production environments
 * must be separated to reduce risks.
 */
interface EnvironmentConfig {
  name: string;
  security: {
    tlsMinVersion: string;
    corsOrigins: string[];
    rateLimitRpm: number;
    logLevel: string;
    debugMode: boolean;
    sourceMap: boolean;
    errorDetails: boolean;
  };
  data: {
    useRealData: boolean;
    encryptionRequired: boolean;
    backupFrequency: string;
  };
}

const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  development: {
    name: 'development',
    security: {
      tlsMinVersion: 'TLSv1.2',
      corsOrigins: ['http://localhost:3000'],
      rateLimitRpm: 1000,
      logLevel: 'debug',
      debugMode: true,
      sourceMap: true,
      errorDetails: true, // OK in dev
    },
    data: {
      useRealData: false, // NEVER real data in dev
      encryptionRequired: false,
      backupFrequency: 'never',
    },
  },
  staging: {
    name: 'staging',
    security: {
      tlsMinVersion: 'TLSv1.2',
      corsOrigins: ['https://staging.example.com'],
      rateLimitRpm: 500,
      logLevel: 'info',
      debugMode: false,
      sourceMap: false,
      errorDetails: false,
    },
    data: {
      useRealData: false, // Anonymized data
      encryptionRequired: true,
      backupFrequency: 'daily',
    },
  },
  production: {
    name: 'production',
    security: {
      tlsMinVersion: 'TLSv1.3', // Maximum security in production
      corsOrigins: ['https://app.example.com'],
      rateLimitRpm: 100,
      logLevel: 'warn',
      debugMode: false,
      sourceMap: false,
      errorDetails: false, // NEVER error details in production
    },
    data: {
      useRealData: true,
      encryptionRequired: true,
      backupFrequency: 'hourly',
    },
  },
};

export function getEnvironmentConfig(): EnvironmentConfig {
  const env = process.env.NODE_ENV ?? 'development';
  const config = ENVIRONMENTS[env];

  if (!config) {
    throw new Error(`Configuration not found for environment: ${env}`);
  }

  return config;
}
```

#### Secure Express/Fastify Configuration

```typescript
// config/server-security.config.ts

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { Express } from 'express';
import { getEnvironmentConfig } from './secure-development.config';

/**
 * A.8.26 — Application security requirements.
 * Apply all security measures to the HTTP server.
 */
export function applySecurityMiddleware(app: Express) {
  const config = getEnvironmentConfig();

  // 1. Helmet — HTTP security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Minimize unsafe-inline
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'same-origin' },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  }));

  // 2. CORS
  app.use(cors({
    origin: config.security.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    maxAge: 86400, // 24 hours
  }));

  // 3. Rate Limiting (A.8.6 — Capacity management)
  app.use(rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: config.security.rateLimitRpm,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
  }));

  // 4. Disable X-Powered-By header
  app.disable('x-powered-by');

  // 5. Secure body parsing
  app.use(require('express').json({ limit: '1mb' }));
  app.use(require('express').urlencoded({ extended: false, limit: '1mb' }));
}
```

---

### 5. Security Incident Management (A.5.24 — A.5.28)

```typescript
// services/incident-management.service.ts

import pino from 'pino';

const logger = pino({ name: 'incident-management' });

/**
 * A.5.24 — Incident management planning and preparation
 * A.5.25 — Assessment and decision on security events
 * A.5.26 — Response to security incidents
 * A.5.27 — Learning from incidents
 * A.5.28 — Collection of evidence
 */

export enum IncidentSeverity {
  CRITICAL = 'P1', // Active breach, data compromised, service down
  HIGH = 'P2',     // Exploitable vulnerability, intrusion attempt
  MEDIUM = 'P3',   // Vulnerability detected, traffic anomaly
  LOW = 'P4',      // Minor policy violation, suspicious event
}

export enum IncidentCategory {
  DATA_BREACH = 'data_breach',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  MALWARE = 'malware',
  DENIAL_OF_SERVICE = 'denial_of_service',
  SOCIAL_ENGINEERING = 'social_engineering',
  POLICY_VIOLATION = 'policy_violation',
  SYSTEM_COMPROMISE = 'system_compromise',
  INSIDER_THREAT = 'insider_threat',
}

interface SecurityIncident {
  id: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  title: string;
  description: string;
  detectedAt: Date;
  detectedBy: string;
  affectedSystems: string[];
  affectedData: string[];
  status: 'detected' | 'triaged' | 'contained' | 'eradicated' | 'recovered' | 'closed';
  timeline: IncidentEvent[];
}

interface IncidentEvent {
  timestamp: Date;
  action: string;
  performedBy: string;
  notes: string;
}

export class IncidentManagementService {
  /**
   * Detect and register a new security incident.
   */
  async reportIncident(params: {
    severity: IncidentSeverity;
    category: IncidentCategory;
    title: string;
    description: string;
    detectedBy: string;
    affectedSystems: string[];
    affectedData: string[];
  }): Promise<SecurityIncident> {
    const incident: SecurityIncident = {
      id: `INC-${Date.now()}`,
      ...params,
      detectedAt: new Date(),
      status: 'detected',
      timeline: [{
        timestamp: new Date(),
        action: 'Incident detected and registered',
        performedBy: params.detectedBy,
        notes: params.description,
      }],
    };

    logIncident(incident, 'incident_detected');

    // Escalate based on severity
    await this.escalate(incident);

    return incident;
  }

  /**
   * Escalate the incident based on its severity.
   * Response times defined by policy:
   * - P1 (Critical): Immediate response (< 15 min)
   * - P2 (High): < 1 hour
   * - P3 (Medium): < 4 hours
   * - P4 (Low): < 24 hours
   */
  private async escalate(incident: SecurityIncident) {
    const escalationTargets = {
      [IncidentSeverity.CRITICAL]: {
        channels: ['pagerduty', 'sms', 'phone'],
        targets: ['security_officer', 'cto', 'ceo'],
        sla: '15 minutes',
      },
      [IncidentSeverity.HIGH]: {
        channels: ['slack', 'email'],
        targets: ['security_team', 'engineering_lead'],
        sla: '1 hour',
      },
      [IncidentSeverity.MEDIUM]: {
        channels: ['slack', 'email'],
        targets: ['security_team'],
        sla: '4 hours',
      },
      [IncidentSeverity.LOW]: {
        channels: ['email'],
        targets: ['security_team'],
        sla: '24 hours',
      },
    };

    const escalation = escalationTargets[incident.severity];

    logger.info({
      event: 'incident_escalated',
      incidentId: incident.id,
      severity: incident.severity,
      targets: escalation.targets,
      channels: escalation.channels,
      sla: escalation.sla,
    }, `Incident escalated: ${incident.title}`);
  }

  /**
   * A.5.28 — Collection of evidence.
   * Preserve forensic evidence of the incident.
   */
  async collectEvidence(incidentId: string, evidence: {
    type: 'log' | 'screenshot' | 'memory_dump' | 'network_capture' | 'file';
    source: string;
    description: string;
    data: Buffer | string;
    collectedBy: string;
  }) {
    // In production: store in secure, immutable bucket with integrity hash
    const hash = require('node:crypto')
      .createHash('sha256')
      .update(typeof evidence.data === 'string' ? evidence.data : evidence.data)
      .digest('hex');

    logger.info({
      event: 'evidence_collected',
      incidentId,
      evidenceType: evidence.type,
      source: evidence.source,
      hash,
      collectedBy: evidence.collectedBy,
    }, 'Forensic evidence collected');

    return { hash, collectedAt: new Date() };
  }
}

function logIncident(incident: SecurityIncident, event: string) {
  const logFn = incident.severity === IncidentSeverity.CRITICAL ? logger.fatal.bind(logger) :
                incident.severity === IncidentSeverity.HIGH ? logger.error.bind(logger) :
                logger.warn.bind(logger);

  logFn({
    event,
    incidentId: incident.id,
    severity: incident.severity,
    category: incident.category,
    affectedSystems: incident.affectedSystems,
    status: incident.status,
  }, `[${incident.severity}] ${incident.title}`);
}
```

---

### 6. Business Continuity (A.5.29, A.5.30, A.8.13, A.8.14)

```typescript
// config/backup-recovery.config.ts

/**
 * A.5.29 — Information security during disruption
 * A.5.30 — ICT readiness for business continuity
 * A.8.13 — Information backup
 * A.8.14 — Redundancy of information processing facilities
 */

interface BackupPolicy {
  resource: string;
  frequency: string;
  retention: string;
  encryptionRequired: boolean;
  offSiteRequired: boolean;
  testFrequency: string;
  rto: string; // Recovery Time Objective
  rpo: string; // Recovery Point Objective
}

export const BACKUP_POLICIES: BackupPolicy[] = [
  {
    resource: 'database_primary',
    frequency: 'every_hour',
    retention: '90_days',
    encryptionRequired: true,
    offSiteRequired: true,
    testFrequency: 'monthly',
    rto: '1_hour',
    rpo: '1_hour',
  },
  {
    resource: 'database_audit_logs',
    frequency: 'every_6_hours',
    retention: '2_years',
    encryptionRequired: true,
    offSiteRequired: true,
    testFrequency: 'quarterly',
    rto: '4_hours',
    rpo: '6_hours',
  },
  {
    resource: 'application_config',
    frequency: 'on_change',
    retention: '1_year',
    encryptionRequired: true,
    offSiteRequired: true,
    testFrequency: 'monthly',
    rto: '30_minutes',
    rpo: '0', // No loss (versioned in git)
  },
  {
    resource: 'user_uploads',
    frequency: 'daily',
    retention: '1_year',
    encryptionRequired: true,
    offSiteRequired: true,
    testFrequency: 'quarterly',
    rto: '4_hours',
    rpo: '24_hours',
  },
];

/**
 * Backup verification script.
 * Run at least monthly.
 */
export async function verifyBackupIntegrity(resource: string): Promise<{
  healthy: boolean;
  lastBackup: Date;
  backupSize: number;
  restorationTest: boolean;
}> {
  // Implement real verification according to your infrastructure
  // 1. Verify that the backup exists
  // 2. Verify integrity (checksum)
  // 3. Attempt restoration in an isolated environment
  // 4. Verify that restored data is consistent

  return {
    healthy: true,
    lastBackup: new Date(),
    backupSize: 0,
    restorationTest: true,
  };
}
```

---

## ISO 27001 Best Practices

### ✅ DO

1. **Maintain an information asset inventory** (A.5.9) — know what you're protecting
2. **Classify all information** by sensitivity (A.5.12)
3. **Apply the principle of least privilege** to all access (A.5.15)
4. **Encrypt sensitive data** at rest and in transit (A.8.24)
5. **Implement centralized and immutable logging** (A.8.15)
6. **Automate vulnerability scans** in CI/CD (A.8.8)
7. **Keep documentation updated** for policies and procedures
8. **Perform periodic risk assessments** (Clause 6.1.2)
9. **Test backup restoration** monthly (A.8.13)
10. **Separate environments** for development, staging, and production (A.8.31)

### ❌ DO NOT

1. **DO NOT** grant access without justified business need
2. **DO NOT** use shared credentials
3. **DO NOT** deploy without prior security scanning
4. **DO NOT** ignore security alerts in dependencies
5. **DO NOT** store secrets in source code
6. **DO NOT** omit HTTP security headers
7. **DO NOT** disable TLS/HTTPS in any environment
8. **DO NOT** proceed without an incident response plan

---

## ISO 27001 Compliance Checklist

### Organizational Controls (A.5)
- [ ] Security policies documented and approved
- [ ] Security roles and responsibilities defined
- [ ] Information asset inventory
- [ ] Information classification and labelling
- [ ] Access control policies
- [ ] Identity management
- [ ] Confidentiality agreements (NDA)
- [ ] Incident response plan
- [ ] Business continuity plan

### Technological Controls (A.8)
- [ ] Multi-factor authentication (MFA)
- [ ] Privileged access rights management
- [ ] Information access restriction
- [ ] Secure access to source code
- [ ] Encryption (at rest + in transit)
- [ ] Secure development lifecycle
- [ ] Application security requirements
- [ ] Secure coding
- [ ] Technical vulnerability management
- [ ] Configuration management
- [ ] Secure information disposal
- [ ] Data masking
- [ ] Data leakage prevention (DLP)
- [ ] Activity monitoring
- [ ] Web filtering
- [ ] Separation of environments
- [ ] Change management

---

## References and Resources

- [ISO/IEC 27001:2022](https://www.iso.org/standard/27001)
- [ISO/IEC 27002:2022 (Controls Guide)](https://www.iso.org/standard/75652.html)
- [ISO 27001 Annex A Controls List](https://www.iso.org/standard/27001)
- [ENISA Guidelines on ISO 27001](https://www.enisa.europa.eu/)
- [BSI IT-Grundschutz](https://www.bsi.bund.de/EN/)
