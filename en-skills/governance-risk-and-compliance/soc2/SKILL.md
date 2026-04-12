---
name: soc2
description: >
  SOC 2 Type II compliance skill — Trust Service Criteria (AICPA). Activate this skill
  when developing SaaS software or cloud services that need to demonstrate security,
  availability, processing integrity, confidentiality, and/or privacy controls.
  Essential for selling to enterprises that require SOC 2.
---

# 🔐 SOC 2 Type II — Trust Service Criteria

## General Description

**SOC 2** (System and Organization Controls 2) is an auditing framework developed by AICPA that evaluates an organization's controls according to the **Trust Service Criteria (TSC)**. It is the de facto standard for SaaS companies and cloud service providers that handle customer data.

- **Type I**: Evaluation of control design at a point in time
- **Type II**: Evaluation of operational effectiveness of controls over a period (usually 6-12 months)

**Why does it matter?** Most enterprise clients (B2B) require a SOC 2 Type II report before purchasing your product. Without it, you lose deals.

---

## When to Activate this Skill

Activate this skill **whenever**:

- You develop a **SaaS** application or **cloud** service
- Your customers are **enterprises (B2B)** that require compliance
- You implement **access controls** and robust authentication
- You design **monitoring systems**, alerts, and logging
- You work on **availability** and service resilience
- You implement **change management** and deployment pipelines
- You need to demonstrate **confidentiality** controls for customer data

---

## The 5 Trust Service Criteria (TSC)

| Criteria | Code | Description | Required? |
|----------|------|-------------|-----------|
| **Security** | CC (Common Criteria) | Protect against unauthorized access | Yes (always included) |
| **Availability** | A | System availability per SLA | Optional |
| **Processing Integrity** | PI | Complete, valid, accurate, and timely processing | Optional |
| **Confidentiality** | C | Protect confidential information | Optional |
| **Privacy** | P | Collection, use, retention, and disclosure of personal info | Optional |

---

## Technical Implementation Requirements

### 1. CC1 — Control Environment

```typescript
// config/soc2-environment.config.ts

/**
 * CC1.1-CC1.5: Control environment.
 * Document and enforce the organization's security policies.
 */

export interface SOC2ControlEnvironment {
  organization: {
    securityTeam: TeamMember[];
    codeOfConduct: string;
    backgroundChecks: boolean;
    securityTraining: {
      frequency: 'onboarding' | 'quarterly' | 'annually';
      lastCompleted: Date;
    };
  };
  accessPolicies: {
    passwordPolicy: PasswordPolicy;
    mfaRequired: boolean;
    sessionTimeout: number;
    accessReviewFrequency: 'monthly' | 'quarterly';
  };
}

interface TeamMember {
  role: string;
  responsibilities: string[];
}

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAgeDays: number;
  historyCount: number;    // Do not reuse the last N passwords
  lockoutThreshold: number; // Attempts before lockout
  lockoutDurationMinutes: number;
}

export const SOC2_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAgeDays: 90,
  historyCount: 12,
  lockoutThreshold: 5,
  lockoutDurationMinutes: 30,
};

/**
 * Validate password against SOC 2 policy.
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const policy = SOC2_PASSWORD_POLICY;
  const errors: string[] = [];

  if (password.length < policy.minLength) {
    errors.push(`Minimum ${policy.minLength} characters`);
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Must include at least one uppercase letter');
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Must include at least one lowercase letter');
  }
  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Must include at least one number');
  }
  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Must include at least one special character');
  }

  // Check for common weak patterns
  const weakPatterns = [/^(.)\1+$/, /^(012|123|234|345|456|567|678|789|890)+$/];
  if (weakPatterns.some(p => p.test(password))) {
    errors.push('Password contains patterns that are too simple');
  }

  return { valid: errors.length === 0, errors };
}
```

---

### 2. CC6 — Logical and Physical Access Control

```typescript
// services/soc2-access-review.service.ts

import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const prisma = new PrismaClient();
const logger = pino({ name: 'access-review' });

/**
 * CC6.1: Implement logical access controls.
 * CC6.2: Register, control, and manage credentials.
 * CC6.3: Remove access when no longer needed.
 * 
 * SOC 2 requires periodic access reviews to ensure
 * that only the right people have the right permissions.
 */

interface AccessReviewResult {
  reviewDate: Date;
  reviewer: string;
  totalUsers: number;
  activeUsers: number;
  deactivatedUsers: number;
  excessivePermissions: ExcessivePermission[];
  orphanedAccounts: string[];
  actions: ReviewAction[];
}

interface ExcessivePermission {
  userId: string;
  email: string;
  currentRole: string;
  suggestedRole: string;
  reason: string;
}

interface ReviewAction {
  userId: string;
  action: 'deactivate' | 'downgrade_role' | 'revoke_permission' | 'keep';
  reason: string;
  performedAt: Date;
}

export class AccessReviewService {
  /**
   * Perform periodic access review.
   * SOC 2 requires this at least quarterly.
   */
  async performAccessReview(reviewerId: string): Promise<AccessReviewResult> {
    const allUsers = await prisma.user.findMany({
      include: { sessions: true },
    });

    const result: AccessReviewResult = {
      reviewDate: new Date(),
      reviewer: reviewerId,
      totalUsers: allUsers.length,
      activeUsers: 0,
      deactivatedUsers: 0,
      excessivePermissions: [],
      orphanedAccounts: [],
      actions: [],
    };

    for (const user of allUsers) {
      // Detect inactive accounts (no login in 90 days)
      const lastActivity = user.updatedAt;
      const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceActivity > 90) {
        result.orphanedAccounts.push(user.id);
        result.actions.push({
          userId: user.id,
          action: 'deactivate',
          reason: `No activity for ${Math.floor(daysSinceActivity)} days`,
          performedAt: new Date(),
        });
      } else {
        result.activeUsers++;
      }
    }

    result.deactivatedUsers = result.orphanedAccounts.length;

    logger.info({
      event: 'access_review_completed',
      reviewer: reviewerId,
      totalUsers: result.totalUsers,
      orphanedAccounts: result.orphanedAccounts.length,
      excessivePermissions: result.excessivePermissions.length,
    }, 'Access review completed');

    return result;
  }

  /**
   * CC6.3: Revoke access for offboarded users.
   * Execute when an employee leaves the organization.
   */
  async offboardUser(userId: string, performedBy: string) {
    await prisma.$transaction(async (tx) => {
      // 1. Deactivate account
      await tx.user.update({
        where: { id: userId },
        data: { deletedAt: new Date() },
      });

      // 2. Revoke all active sessions
      await tx.session.deleteMany({
        where: { userId },
      });

      // 3. Revoke API tokens
      // await tx.apiKey.updateMany({
      //   where: { userId },
      //   data: { revokedAt: new Date() },
      // });
    });

    logger.info({
      event: 'user_offboarded',
      userId,
      performedBy,
    }, 'User offboarded — access revoked');
  }
}
```

---

### 3. CC7 — System Operations (Monitoring)

```typescript
// services/soc2-monitoring.service.ts

import pino from 'pino';

const logger = pino({ name: 'soc2-monitoring' });

/**
 * CC7.1: Detect and monitor anomalies and security events.
 * CC7.2: Monitor system components to detect anomalies.
 * CC7.3: Evaluate security events to determine if they are incidents.
 * CC7.4: Respond to identified security incidents.
 */

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  threshold: { warning: number; critical: number };
  timestamp: Date;
}

interface AlertRule {
  name: string;
  condition: string;
  severity: 'info' | 'warning' | 'critical';
  notificationChannels: string[];
  runbookUrl: string;
}

export const SOC2_ALERT_RULES: AlertRule[] = [
  // Security
  {
    name: 'Excessive failed login attempts',
    condition: 'failed_logins > 10 in 5min per IP',
    severity: 'critical',
    notificationChannels: ['slack:#security-alerts', 'pagerduty'],
    runbookUrl: 'https://wiki.internal/runbooks/brute-force',
  },
  {
    name: 'Administrative access outside business hours',
    condition: 'admin_access AND (hour < 7 OR hour > 22)',
    severity: 'warning',
    notificationChannels: ['slack:#security-alerts'],
    runbookUrl: 'https://wiki.internal/runbooks/off-hours-access',
  },
  {
    name: 'Security configuration change',
    condition: 'security_config_changed',
    severity: 'info',
    notificationChannels: ['slack:#security-alerts', 'email:security-team'],
    runbookUrl: 'https://wiki.internal/runbooks/config-change',
  },
  // Availability
  {
    name: 'Elevated error rate',
    condition: 'http_5xx_rate > 5% in 5min',
    severity: 'critical',
    notificationChannels: ['pagerduty', 'slack:#incidents'],
    runbookUrl: 'https://wiki.internal/runbooks/high-error-rate',
  },
  {
    name: 'Elevated latency',
    condition: 'p99_latency > 2000ms in 5min',
    severity: 'warning',
    notificationChannels: ['slack:#incidents'],
    runbookUrl: 'https://wiki.internal/runbooks/high-latency',
  },
  {
    name: 'High CPU usage',
    condition: 'cpu_usage > 90% for 10min',
    severity: 'warning',
    notificationChannels: ['slack:#infrastructure'],
    runbookUrl: 'https://wiki.internal/runbooks/high-cpu',
  },
  // Integrity
  {
    name: 'Processing discrepancy',
    condition: 'processing_errors > 0',
    severity: 'critical',
    notificationChannels: ['slack:#incidents', 'pagerduty'],
    runbookUrl: 'https://wiki.internal/runbooks/processing-error',
  },
];

export class SOC2MonitoringService {
  /**
   * CC7.2: Collect system metrics.
   */
  async collectMetrics(): Promise<SystemMetric[]> {
    return [
      {
        name: 'api_response_time_p99',
        value: 0, // In production: get from Prometheus/Datadog
        unit: 'ms',
        threshold: { warning: 1000, critical: 2000 },
        timestamp: new Date(),
      },
      {
        name: 'error_rate_5xx',
        value: 0,
        unit: 'percent',
        threshold: { warning: 1, critical: 5 },
        timestamp: new Date(),
      },
      {
        name: 'active_sessions',
        value: 0,
        unit: 'count',
        threshold: { warning: 10000, critical: 50000 },
        timestamp: new Date(),
      },
      {
        name: 'database_connections',
        value: 0,
        unit: 'count',
        threshold: { warning: 80, critical: 95 }, // % of pool
        timestamp: new Date(),
      },
    ];
  }

  /**
   * CC7.3: Evaluate metrics against thresholds.
   */
  evaluateMetrics(metrics: SystemMetric[]): { alerts: string[] } {
    const alerts: string[] = [];

    for (const metric of metrics) {
      if (metric.value >= metric.threshold.critical) {
        alerts.push(`CRITICAL: ${metric.name} = ${metric.value}${metric.unit} (threshold: ${metric.threshold.critical})`);
        logger.error({
          event: 'metric_critical',
          metric: metric.name,
          value: metric.value,
          threshold: metric.threshold.critical,
        }, `Critical metric: ${metric.name}`);
      } else if (metric.value >= metric.threshold.warning) {
        alerts.push(`WARNING: ${metric.name} = ${metric.value}${metric.unit} (threshold: ${metric.threshold.warning})`);
        logger.warn({
          event: 'metric_warning',
          metric: metric.name,
          value: metric.value,
          threshold: metric.threshold.warning,
        }, `Metric alert: ${metric.name}`);
      }
    }

    return { alerts };
  }
}
```

---

### 4. CC8 — Change Management

```typescript
// services/change-management.service.ts

import pino from 'pino';

const logger = pino({ name: 'change-management' });

/**
 * CC8.1: Authorize, design, develop, configure, document,
 *        test, approve, and implement changes.
 * 
 * SOC 2 requires a formal change management process:
 * - Every change must be documented
 * - Must go through code review (PR)
 * - Must have automated tests
 * - Must be approved before deployment
 * - Testing environments separate from production
 */

interface ChangeRecord {
  id: string;
  title: string;
  description: string;
  type: 'feature' | 'bugfix' | 'security_patch' | 'infrastructure' | 'configuration';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  author: string;
  reviewers: string[];
  approvers: string[];
  
  // Pipeline
  stages: ChangeStage[];
  
  // Rollback
  rollbackPlan: string;
  rollbackTested: boolean;
  
  // Tracking
  createdAt: Date;
  deployedAt?: Date;
  status: 'draft' | 'in_review' | 'approved' | 'deployed' | 'rolled_back';
}

interface ChangeStage {
  name: string;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  completedAt?: Date;
  evidence?: string; // Link to test results, scan reports, etc.
}

// CI/CD Pipeline with SOC 2 controls
export const SOC2_CI_CD_PIPELINE = `
# .github/workflows/soc2-compliant-deploy.yml
name: SOC 2 Compliant Deployment

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # CC8.1 — Verify code quality
  code-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
      - run: npm ci
      - name: Lint
        run: npm run lint
      - name: Type Check
        run: npm run type-check
      - name: Unit Tests
        run: npm run test -- --coverage
      - name: Upload Coverage
        uses: codecov/codecov-action@v4

  # CC8.1 — Security scan
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Dependency Audit
        run: npm audit --audit-level=high
      - name: SAST Scan
        uses: github/codeql-action/analyze@v3
      - name: Secret Detection
        uses: trufflesecurity/trufflehog@main

  # CC8.1 — Integration tests in staging
  integration-tests:
    needs: [code-quality, security-scan]
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: Deploy to Staging
        run: npm run deploy:staging
      - name: Run E2E Tests
        run: npm run test:e2e
      - name: Run Performance Tests
        run: npm run test:performance

  # CC8.1 — Deploy to production (requires manual approval)
  deploy-production:
    needs: [integration-tests]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      # REQUIRES MANUAL APPROVAL — SOC 2 control
      url: https://app.example.com
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Production
        run: npm run deploy:production
      - name: Smoke Tests
        run: npm run test:smoke
      - name: Record Deployment
        run: |
          echo "deployed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> deployment-record.txt
          echo "commit=\${{ github.sha }}" >> deployment-record.txt
          echo "deployer=\${{ github.actor }}" >> deployment-record.txt
`;
```

---

### 5. Availability (A1) — SLA and Uptime

```typescript
// services/availability.service.ts

import pino from 'pino';

const logger = pino({ name: 'availability' });

/**
 * A1.1: Maintain availability per commitments (SLAs).
 * A1.2: Environmental controls to protect against disasters.
 * A1.3: Plan for disaster recovery.
 */

interface SLADefinition {
  service: string;
  targetUptime: number;    // Percentage (e.g., 99.9)
  maxDowntimeMonthly: string; // Calculated from uptime
  responseTime: {
    p50: number; // ms
    p95: number;
    p99: number;
  };
  dataRetention: string;
  backupRPO: string;       // Recovery Point Objective
  backupRTO: string;       // Recovery Time Objective
}

export const SLA_DEFINITIONS: SLADefinition[] = [
  {
    service: 'Main API',
    targetUptime: 99.9,        // 3 nines
    maxDowntimeMonthly: '43.2 minutes',
    responseTime: { p50: 100, p95: 500, p99: 1000 },
    dataRetention: '7 years',
    backupRPO: '1 hour',
    backupRTO: '4 hours',
  },
  {
    service: 'Web Dashboard',
    targetUptime: 99.5,
    maxDowntimeMonthly: '3.6 hours',
    responseTime: { p50: 200, p95: 1000, p99: 2000 },
    dataRetention: '7 years',
    backupRPO: '4 hours',
    backupRTO: '8 hours',
  },
];

/**
 * Status page endpoint.
 * SOC 2 requires informing customers about availability.
 */
export async function getServiceStatus(): Promise<{
  status: 'operational' | 'degraded' | 'major_outage';
  services: { name: string; status: string; latency?: number }[];
  incidents: { title: string; status: string; startedAt: Date }[];
  uptime: { last30Days: number; last90Days: number };
}> {
  // Integrate with your real monitoring system
  return {
    status: 'operational',
    services: [
      { name: 'API', status: 'operational', latency: 45 },
      { name: 'Dashboard', status: 'operational', latency: 120 },
      { name: 'Database', status: 'operational', latency: 5 },
    ],
    incidents: [],
    uptime: {
      last30Days: 99.95,
      last90Days: 99.92,
    },
  };
}
```

---

### 6. Confidentiality (C1) — Customer Data Protection

```typescript
// middleware/data-isolation.middleware.ts

import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino({ name: 'data-isolation' });

/**
 * C1.1: Identify and maintain confidential information.
 * C1.2: Destroy confidential information when no longer needed.
 * 
 * In multi-tenant SaaS, each customer (tenant) must have their data
 * completely isolated from others.
 */

/**
 * Multi-tenant data isolation middleware.
 * Ensures each request only accesses data from its own tenant.
 */
export function tenantIsolation(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    return res.status(403).json({
      error: 'Tenant not identified',
      code: 'TENANT_REQUIRED',
    });
  }

  // Inject tenant filter into all queries
  // Using Prisma middleware to apply automatically
  res.locals.tenantId = tenantId;

  logger.debug({
    event: 'tenant_context_set',
    tenantId,
    userId: req.user?.id,
    path: req.originalUrl,
  }, 'Tenant context set');

  next();
}

/**
 * Prisma middleware for multi-tenant data isolation.
 * Applied automatically to ALL queries.
 */
export function createTenantPrismaMiddleware(tenantId: string) {
  return {
    // Automatically apply tenantId filter to every query
    // Conceptual example — exact implementation depends on Prisma
    $allOperations: async ({ args, query }: any) => {
      // Inject where: { tenantId } into all operations
      if (args.where) {
        args.where.tenantId = tenantId;
      } else {
        args.where = { tenantId };
      }

      // For create, ensure tenantId is included
      if (args.data) {
        args.data.tenantId = tenantId;
      }

      return query(args);
    },
  };
}

/**
 * Prisma schema for multi-tenancy.
 */
export const MULTI_TENANT_SCHEMA = `
// All models containing customer data MUST have tenantId

model Organization {
  id          String @id @default(cuid())
  name        String
  plan        String @default("free")
  
  users       User[]
  projects    Project[]
  
  // Per-tenant security configuration
  mfaRequired       Boolean @default(false)
  ipWhitelist       String[] @default([])
  sessionTimeoutMin Int     @default(30)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("organizations")
}

model Project {
  id          String @id @default(cuid())
  tenantId    String
  tenant      Organization @relation(fields: [tenantId], references: [id])
  name        String
  
  // Row-Level Security: all data has tenantId
  @@index([tenantId])
  @@map("projects")
}
`;
```

---

## SOC 2 Best Practices

### ✅ DO

1. **Robust password policy** — min 12 characters, complexity, rotation
2. **Mandatory MFA** for all internal users
3. **Quarterly access reviews** — deactivate inactive accounts
4. **Formal change management** — PR reviews, approval, CI/CD pipeline
5. **Monitoring and alerts** — security, availability, and performance metrics
6. **Multi-tenant isolation** — customer data completely separated
7. **Immutable audit logs** with minimum 1-year retention
8. **Encryption** at rest (AES-256) and in transit (TLS 1.2+)
9. **Automated backups** with periodic restoration tests
10. **Public status page** to inform customers about availability
11. **Annual pen-testing** and regular vulnerability scans
12. **Immediate offboarding** when an employee leaves the organization

### ❌ DO NOT

1. **DO NOT** allow direct deployments to production without approval
2. **DO NOT** share credentials between employees
3. **DO NOT** ignore security alerts
4. **DO NOT** store secrets in source code
5. **DO NOT** skip automated tests in the pipeline
6. **DO NOT** give admin access by default to new employees
7. **DO NOT** mix data from different tenants without isolation
8. **DO NOT** disable logging in production

---

## SOC 2 Compliance Checklist

### Security (CC — Required)
- [ ] Security policies documented
- [ ] Role-based access control (RBAC)
- [ ] MFA implemented
- [ ] Periodic access review
- [ ] Security logging and monitoring
- [ ] Incident management documented
- [ ] Formal change management
- [ ] Regular vulnerability scanning
- [ ] Data encryption (at rest + in transit)
- [ ] Formalized employee onboarding/offboarding

### Availability (A)
- [ ] SLAs defined and documented
- [ ] Uptime and latency monitoring
- [ ] Status page for customers
- [ ] Disaster recovery plan
- [ ] Automated backups with restoration tests
- [ ] Redundancy in critical components
- [ ] Capacity plan documented

### Processing Integrity (PI)
- [ ] Input validation on all operations
- [ ] Integrity verification in data processing
- [ ] Automatic data reconciliation
- [ ] Processing error monitoring

### Confidentiality (C)
- [ ] Data classification implemented
- [ ] Multi-tenant isolation
- [ ] Encryption of confidential data
- [ ] NDAs with employees and contractors
- [ ] Data retention and destruction policy

### Privacy (P)
- [ ] Privacy policy published
- [ ] Consent for personal data collection
- [ ] Mechanism for data access, correction, and deletion
- [ ] Privacy breach notification

---

## References and Resources

- [AICPA SOC 2 Overview](https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome)
- [Trust Service Criteria (TSC)](https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/trustservicecriteria.html)
- [SOC 2 Compliance Guide (Vanta)](https://www.vanta.com/collection/soc-2)
- [SOC 2 Academy](https://www.schellman.com/soc-2-resource-center)
