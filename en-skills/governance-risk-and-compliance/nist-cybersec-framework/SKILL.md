---
name: nist-cybersec-framework
description: >
  NIST Cybersecurity Framework (CSF) 2.0 skill. Activate this skill when implementing
  cybersecurity controls following the Govern, Identify, Protect, Detect,
  Respond, and Recover functions. Covers risk management, infrastructure protection, threat
  detection, incident response, and service recovery.
---

# 🛡️ NIST Cybersecurity Framework (CSF) 2.0

## General Description

The **NIST Cybersecurity Framework** is the most widely adopted cybersecurity framework in the world, developed by the U.S. National Institute of Standards and Technology. Version 2.0 (2024) adds a sixth function: **Govern**, and expands its scope beyond critical infrastructure to any organization.

The framework is not legally mandatory (except for U.S. federal agencies), but it is widely adopted as a best practice and frequently referenced in contracts and regulations.

---

## When to Activate this Skill

Activate this skill **whenever** you:

- Design the **security architecture** of an application
- Implement **threat detection** (IDS, WAF, anomalies)
- Configure **security monitoring and alerting**
- Develop **incident response plans**
- Implement **disaster recovery**
- Assess **cybersecurity risks** in your stack
- Need a **comprehensive framework** to organize security controls

---

## The 6 Functions of NIST CSF 2.0

```
┌─────────────────────────────────────────────────────────┐
│                    GOVERN (GV)                          │
│             Strategy, policies, oversight               │
├──────────┬──────────┬──────────┬──────────┬────────────┤
│ IDENTIFY │ PROTECT  │  DETECT  │ RESPOND  │  RECOVER   │
│   (ID)   │   (PR)   │   (DE)   │   (RS)   │   (RC)     │
│          │          │          │          │            │
│ What do  │ How do   │ How do   │ What do  │ How do    │
│ we have? │ we       │ we       │ we do    │ we return │
│          │ protect  │ detect   │ when it  │ to normal │
│          │ it?      │ problems?│ happens? │ ?         │
└──────────┴──────────┴──────────┴──────────┴────────────┘
```

---

## Technical Requirements by Function

### 1. GOVERN (GV) — Govern

```typescript
// config/security-governance.config.ts

/**
 * GV.OC — Organizational context
 * GV.RM — Risk management
 * GV.SC — Supply chain
 * 
 * Define the cybersecurity strategy, roles, policies, and risk tolerance.
 */

export interface SecurityGovernanceConfig {
  organization: {
    name: string;
    securityOfficer: string;
    riskAppetite: 'conservative' | 'moderate' | 'aggressive';
    regulatoryRequirements: string[];
  };
  policies: SecurityPolicy[];
  riskMatrix: RiskMatrix;
  supplyChain: SupplyChainRequirement[];
}

interface SecurityPolicy {
  id: string;
  name: string;
  version: string;
  lastReviewed: Date;
  nextReview: Date;
  owner: string;
  scope: string;
  status: 'active' | 'draft' | 'archived';
}

interface RiskMatrix {
  levels: {
    impact: ('negligible' | 'minor' | 'moderate' | 'major' | 'catastrophic')[];
    likelihood: ('rare' | 'unlikely' | 'possible' | 'likely' | 'almost_certain')[];
  };
  acceptableRiskLevel: number; // 1-25 (5x5 matrix)
  reviewFrequency: 'monthly' | 'quarterly' | 'annually';
}

interface SupplyChainRequirement {
  vendorName: string;
  service: string;
  securityRequirements: string[];
  lastAudit: Date;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// Configuration example
export const GOVERNANCE_CONFIG: SecurityGovernanceConfig = {
  organization: {
    name: 'MyCompany',
    securityOfficer: 'security@company.com',
    riskAppetite: 'conservative',
    regulatoryRequirements: ['GDPR', 'SOC2', 'PCI-DSS'],
  },
  policies: [
    {
      id: 'POL-001',
      name: 'Access Control Policy',
      version: '2.0',
      lastReviewed: new Date('2025-01-15'),
      nextReview: new Date('2026-01-15'),
      owner: 'CISO',
      scope: 'All systems and applications',
      status: 'active',
    },
    {
      id: 'POL-002',
      name: 'Vulnerability Management Policy',
      version: '1.5',
      lastReviewed: new Date('2025-03-01'),
      nextReview: new Date('2026-03-01'),
      owner: 'Security Team Lead',
      scope: 'Infrastructure and applications',
      status: 'active',
    },
  ],
  riskMatrix: {
    levels: {
      impact: ['negligible', 'minor', 'moderate', 'major', 'catastrophic'],
      likelihood: ['rare', 'unlikely', 'possible', 'likely', 'almost_certain'],
    },
    acceptableRiskLevel: 8, // Acceptable risk: up to 8 out of 25
    reviewFrequency: 'quarterly',
  },
  supplyChain: [
    {
      vendorName: 'AWS',
      service: 'Cloud Infrastructure',
      securityRequirements: ['SOC2 Type II', 'ISO 27001', 'FedRAMP'],
      lastAudit: new Date('2025-06-01'),
      riskLevel: 'low',
    },
  ],
};
```

---

### 2. IDENTIFY (ID) — Identify

```typescript
// services/asset-inventory.service.ts

/**
 * ID.AM — Asset management
 * ID.RA — Risk assessment
 * 
 * Maintain asset inventory and continuously assess risks.
 */

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  owner: string;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  criticality: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[]; // IDs of assets it depends on
  dataTypes: string[];    // Types of data it handles
  location: string;       // Where it is deployed
  lastAssessed: Date;
}

export enum AssetType {
  APPLICATION = 'application',
  DATABASE = 'database',
  API = 'api',
  INFRASTRUCTURE = 'infrastructure',
  DATA_STORE = 'data_store',
  THIRD_PARTY_SERVICE = 'third_party_service',
  NETWORK_DEVICE = 'network_device',
}

// Asset inventory — keep updated
export const ASSET_INVENTORY: Asset[] = [
  {
    id: 'ASSET-001',
    name: 'Main API (REST)',
    type: AssetType.API,
    owner: 'backend-team',
    classification: 'confidential',
    criticality: 'critical',
    dependencies: ['ASSET-002', 'ASSET-003', 'ASSET-005'],
    dataTypes: ['PII', 'credentials', 'business_data'],
    location: 'AWS us-east-1',
    lastAssessed: new Date('2025-10-01'),
  },
  {
    id: 'ASSET-002',
    name: 'PostgreSQL Database',
    type: AssetType.DATABASE,
    owner: 'platform-team',
    classification: 'restricted',
    criticality: 'critical',
    dependencies: ['ASSET-004'],
    dataTypes: ['PII', 'PHI', 'financial', 'business_data'],
    location: 'AWS RDS us-east-1',
    lastAssessed: new Date('2025-10-01'),
  },
  {
    id: 'ASSET-003',
    name: 'Redis Cache',
    type: AssetType.DATA_STORE,
    owner: 'platform-team',
    classification: 'confidential',
    criticality: 'high',
    dependencies: [],
    dataTypes: ['session_data', 'cache'],
    location: 'AWS ElastiCache us-east-1',
    lastAssessed: new Date('2025-09-15'),
  },
];

/**
 * ID.RA — Risk assessment.
 * Calculate asset risk level based on threats and vulnerabilities.
 */
export interface RiskAssessment {
  assetId: string;
  threats: Threat[];
  overallRisk: number; // 1-25 (impact × likelihood)
  mitigations: string[];
  residualRisk: number;
  acceptableRisk: boolean;
}

interface Threat {
  name: string;
  category: 'external' | 'internal' | 'environmental';
  impact: 1 | 2 | 3 | 4 | 5;
  likelihood: 1 | 2 | 3 | 4 | 5;
  existingControls: string[];
}

export function assessRisk(asset: Asset, threats: Threat[]): RiskAssessment {
  const maxRisk = Math.max(...threats.map(t => t.impact * t.likelihood));
  const mitigations = threats.flatMap(t => t.existingControls);
  
  // Residual risk is reduced by existing controls
  const mitigationFactor = Math.min(mitigations.length * 0.1, 0.5); // Max 50% reduction
  const residualRisk = Math.round(maxRisk * (1 - mitigationFactor));

  return {
    assetId: asset.id,
    threats,
    overallRisk: maxRisk,
    mitigations,
    residualRisk,
    acceptableRisk: residualRisk <= GOVERNANCE_CONFIG.riskMatrix.acceptableRiskLevel,
  };
}
```

---

### 3. PROTECT (PR) — Protect

```typescript
// middleware/nist-protect.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import pino from 'pino';

const logger = pino({ name: 'nist-protect' });

/**
 * PR.AA — Identity management, authentication, and access control
 * PR.AT — Awareness and training
 * PR.DS — Data security
 * PR.PS — Platform security
 * PR.IR — Technology infrastructure resilience
 */

/**
 * PR.AA-03: Multi-factor authentication.
 * Middleware that verifies MFA for sensitive operations.
 */
export function requireMFA(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.mfaVerified) {
    logger.warn({
      event: 'mfa_required',
      userId: req.user?.id,
      path: req.originalUrl,
    }, 'Access denied: MFA required');

    return res.status(403).json({
      error: 'Multi-factor authentication required',
      code: 'MFA_REQUIRED',
      mfaUrl: '/api/v1/auth/mfa/verify',
    });
  }
  next();
}

/**
 * PR.DS-01: Protect the confidentiality of data at rest.
 * PR.DS-02: Protect the confidentiality of data in transit.
 * 
 * Middleware that ensures responses with sensitive data
 * include appropriate protection headers.
 */
export function dataProtectionHeaders(req: Request, res: Response, next: NextFunction) {
  // Ensure sensitive data is not cached
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Prevent the browser from detecting the content type
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Strict Transport Security
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  next();
}

/**
 * PR.PS-01: Configuration management.
 * Verify that server configuration is secure before starting.
 */
export function validateServerSecurity(): { secure: boolean; issues: string[] } {
  const issues: string[] = [];

  // Verify HTTPS
  if (process.env.NODE_ENV === 'production' && !process.env.TLS_CERT_PATH) {
    issues.push('TLS not configured in production');
  }

  // Verify no default credentials
  if (process.env.DB_PASSWORD === 'password' || process.env.DB_PASSWORD === 'admin') {
    issues.push('Default database credential detected');
  }

  // Verify JWT secrets
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    issues.push('JWT_SECRET missing or too short (minimum 32 characters)');
  }

  // Verify encryption key
  if (!process.env.DATA_ENCRYPTION_KEY) {
    issues.push('DATA_ENCRYPTION_KEY not configured');
  }

  // Verify debug mode disabled in production
  if (process.env.NODE_ENV === 'production' && process.env.DEBUG) {
    issues.push('Debug mode active in production');
  }

  return {
    secure: issues.length === 0,
    issues,
  };
}

/**
 * PR.IR: Infrastructure resilience.
 * Health check endpoint with dependency verification.
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, { status: string; latency?: number }>;
}> {
  const checks: Record<string, { status: string; latency?: number }> = {};

  // Database check
  try {
    const start = Date.now();
    // await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'healthy', latency: Date.now() - start };
  } catch {
    checks.database = { status: 'unhealthy' };
  }

  // Redis check
  try {
    const start = Date.now();
    // await redis.ping();
    checks.cache = { status: 'healthy', latency: Date.now() - start };
  } catch {
    checks.cache = { status: 'unhealthy' };
  }

  // Storage check
  try {
    const start = Date.now();
    // await s3.headBucket({ Bucket: process.env.S3_BUCKET! });
    checks.storage = { status: 'healthy', latency: Date.now() - start };
  } catch {
    checks.storage = { status: 'unhealthy' };
  }

  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
  const anyUnhealthy = Object.values(checks).some(c => c.status === 'unhealthy');

  return {
    status: allHealthy ? 'healthy' : anyUnhealthy ? 'unhealthy' : 'degraded',
    checks,
  };
}
```

---

### 4. DETECT (DE) — Detect

```typescript
// services/threat-detection.service.ts

import pino from 'pino';

const logger = pino({ name: 'threat-detection' });

/**
 * DE.CM — Continuous monitoring
 * DE.AE — Adverse event analysis
 * 
 * Real-time threat and anomaly detection system.
 */

interface SecurityEvent {
  type: SecurityEventType;
  severity: 'info' | 'warning' | 'critical';
  source: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

export enum SecurityEventType {
  // Authentication
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  CREDENTIAL_STUFFING = 'credential_stuffing',
  IMPOSSIBLE_TRAVEL = 'impossible_travel',
  
  // Access
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  UNUSUAL_DATA_ACCESS = 'unusual_data_access',
  
  // Data
  DATA_EXFILTRATION = 'data_exfiltration',
  UNUSUAL_DOWNLOAD = 'unusual_download',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  
  // Infrastructure
  PORT_SCAN = 'port_scan',
  DDOS_ATTEMPT = 'ddos_attempt',
  UNUSUAL_TRAFFIC = 'unusual_traffic',
}

/**
 * DE.CM-01: Monitoring of networks and network services.
 * Detects anomalous authentication patterns.
 */
export class AuthenticationMonitor {
  // In-memory store (use Redis in production)
  private failedAttempts = new Map<string, { count: number; timestamps: number[] }>();
  private loginLocations = new Map<string, { ip: string; timestamp: number; location?: string }[]>();

  /**
   * Record a failed login attempt and detect brute force.
   */
  async recordFailedLogin(identifier: string, ip: string): Promise<SecurityEvent | null> {
    const key = identifier;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes

    const current = this.failedAttempts.get(key) ?? { count: 0, timestamps: [] };
    
    // Clean attempts outside the window
    current.timestamps = current.timestamps.filter(t => now - t < windowMs);
    current.timestamps.push(now);
    current.count = current.timestamps.length;
    
    this.failedAttempts.set(key, current);

    // Brute force threshold: >5 attempts in 15 minutes
    if (current.count > 5) {
      const event: SecurityEvent = {
        type: SecurityEventType.BRUTE_FORCE_ATTEMPT,
        severity: 'critical',
        source: ip,
        details: {
          identifier,
          attemptCount: current.count,
          windowMinutes: 15,
        },
        timestamp: new Date(),
      };

      logger.error({
        event: 'brute_force_detected',
        ...event.details,
        ip,
      }, '🚨 Brute force attempt detected');

      return event;
    }

    // Credential stuffing threshold: >3 attempts from the same IP on different accounts
    // (detect in a centralized service)

    return null;
  }

  /**
   * DE.AE — Detect impossible travel.
   * If a user logs in from two geographically incompatible
   * locations in a short period of time.
   */
  async detectImpossibleTravel(
    userId: string,
    currentIp: string,
    currentLocation?: string,
  ): Promise<SecurityEvent | null> {
    const now = Date.now();
    const history = this.loginLocations.get(userId) ?? [];
    
    // Record current login
    history.push({ ip: currentIp, timestamp: now, location: currentLocation });
    
    // Keep only the last 24 hours
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const recentLogins = history.filter(h => h.timestamp > dayAgo);
    this.loginLocations.set(userId, recentLogins);

    // Check for logins from different IPs in the last 2 hours
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;
    const recentDifferentIps = recentLogins
      .filter(h => h.timestamp > twoHoursAgo)
      .map(h => h.ip);

    const uniqueIps = new Set(recentDifferentIps);

    if (uniqueIps.size > 2) {
      const event: SecurityEvent = {
        type: SecurityEventType.IMPOSSIBLE_TRAVEL,
        severity: 'critical',
        source: currentIp,
        details: {
          userId,
          ipsDetected: [...uniqueIps],
          windowHours: 2,
        },
        timestamp: new Date(),
      };

      logger.error({
        event: 'impossible_travel_detected',
        userId,
        ips: [...uniqueIps],
      }, '🚨 Impossible travel detected');

      return event;
    }

    return null;
  }
}

/**
 * DE.CM — Continuous monitoring of HTTP requests.
 * Detects common attack patterns.
 */
export class RequestMonitor {
  /**
   * Detect SQL injection attempts in parameters.
   */
  static detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|FETCH|DECLARE)\b)/i,
      /(-{2}|\/\*|\*\/)/,               // SQL comments
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i, // OR 1=1, AND 1=1
      /(';?\s*(DROP|DELETE|UPDATE)\s)/i,   // ; DROP TABLE
      /(\bUNION\b.*\bSELECT\b)/i,        // UNION SELECT
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Detect XSS attempts in parameters.
   */
  static detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script\b[^>]*>/i,
      /javascript\s*:/i,
      /on(load|error|click|mouse|focus|blur)\s*=/i,
      /<\s*img[^>]+onerror/i,
      /<\s*svg[^>]+onload/i,
      /eval\s*\(/i,
      /document\s*\.\s*(cookie|location|write)/i,
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Detect Path Traversal attempts.
   */
  static detectPathTraversal(input: string): boolean {
    const patterns = [
      /\.\.[\/\\]/,           // ../  or  ..\
      /%2e%2e[\/\\%]/i,      // URL encoded
      /\.\.\%2f/i,           // Mixed encoding
    ];

    return patterns.some(pattern => pattern.test(input));
  }
}

import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware that integrates threat detection.
 */
export function threatDetectionMiddleware(req: Request, res: Response, next: NextFunction) {
  const allInputs = [
    ...Object.values(req.params),
    ...Object.values(req.query).map(String),
    JSON.stringify(req.body),
  ].join(' ');

  if (RequestMonitor.detectSQLInjection(allInputs)) {
    logger.error({
      event: 'sql_injection_blocked',
      ip: req.ip,
      path: req.originalUrl,
      userId: req.user?.id,
    }, '🚨 SQL Injection attempt blocked');

    return res.status(400).json({ error: 'Request rejected for security reasons' });
  }

  if (RequestMonitor.detectXSS(allInputs)) {
    logger.error({
      event: 'xss_attempt_blocked',
      ip: req.ip,
      path: req.originalUrl,
      userId: req.user?.id,
    }, '🚨 XSS attempt blocked');

    return res.status(400).json({ error: 'Request rejected for security reasons' });
  }

  if (RequestMonitor.detectPathTraversal(allInputs)) {
    logger.error({
      event: 'path_traversal_blocked',
      ip: req.ip,
      path: req.originalUrl,
    }, '🚨 Path Traversal attempt blocked');

    return res.status(400).json({ error: 'Request rejected for security reasons' });
  }

  next();
}
```

---

### 5. RESPOND (RS) — Respond

```typescript
// services/incident-response.service.ts

import pino from 'pino';

const logger = pino({ name: 'incident-response' });

/**
 * RS.MA — Incident management
 * RS.AN — Incident analysis
 * RS.CO — Incident response communications
 * RS.MI — Incident mitigation
 */

export enum ResponseAction {
  BLOCK_IP = 'block_ip',
  LOCK_ACCOUNT = 'lock_account',
  REVOKE_SESSIONS = 'revoke_sessions',
  ISOLATE_SERVICE = 'isolate_service',
  ENABLE_ENHANCED_LOGGING = 'enable_enhanced_logging',
  NOTIFY_TEAM = 'notify_team',
  TRIGGER_BACKUP = 'trigger_backup',
  SCALE_DOWN = 'scale_down',
}

interface ResponsePlaybook {
  trigger: string;
  severity: string;
  actions: ResponseAction[];
  runbook: string;
  notifyChannels: string[];
}

/**
 * Automated response playbooks.
 * Define actions to take for each type of incident.
 */
const RESPONSE_PLAYBOOKS: ResponsePlaybook[] = [
  {
    trigger: 'brute_force_attempt',
    severity: 'critical',
    actions: [
      ResponseAction.BLOCK_IP,
      ResponseAction.LOCK_ACCOUNT,
      ResponseAction.NOTIFY_TEAM,
      ResponseAction.ENABLE_ENHANCED_LOGGING,
    ],
    runbook: 'https://wiki.internal/runbooks/brute-force-response',
    notifyChannels: ['slack:#security-alerts', 'pagerduty:security-oncall'],
  },
  {
    trigger: 'data_exfiltration',
    severity: 'critical',
    actions: [
      ResponseAction.REVOKE_SESSIONS,
      ResponseAction.LOCK_ACCOUNT,
      ResponseAction.ISOLATE_SERVICE,
      ResponseAction.TRIGGER_BACKUP,
      ResponseAction.NOTIFY_TEAM,
    ],
    runbook: 'https://wiki.internal/runbooks/data-exfiltration-response',
    notifyChannels: ['slack:#security-alerts', 'pagerduty:security-oncall', 'email:ciso'],
  },
  {
    trigger: 'ddos_attempt',
    severity: 'high',
    actions: [
      ResponseAction.SCALE_DOWN, // Activate WAF/CDN rate limiting
      ResponseAction.ENABLE_ENHANCED_LOGGING,
      ResponseAction.NOTIFY_TEAM,
    ],
    runbook: 'https://wiki.internal/runbooks/ddos-response',
    notifyChannels: ['slack:#security-alerts', 'slack:#infrastructure'],
  },
];

export class IncidentResponseService {
  /**
   * Execute an automated response playbook.
   */
  async executePlaybook(trigger: string, context: {
    sourceIp?: string;
    userId?: string;
    serviceName?: string;
    details: Record<string, unknown>;
  }) {
    const playbook = RESPONSE_PLAYBOOKS.find(p => p.trigger === trigger);

    if (!playbook) {
      logger.warn({ event: 'no_playbook_found', trigger }, 'No playbook for this event type');
      return;
    }

    logger.info({
      event: 'playbook_executing',
      trigger,
      severity: playbook.severity,
      actions: playbook.actions,
    }, `Executing playbook: ${trigger}`);

    for (const action of playbook.actions) {
      try {
        await this.executeAction(action, context);
      } catch (error) {
        logger.error({
          event: 'playbook_action_failed',
          action,
          trigger,
          error,
        }, `Error executing action: ${action}`);
      }
    }
  }

  private async executeAction(action: ResponseAction, context: Record<string, unknown>) {
    switch (action) {
      case ResponseAction.BLOCK_IP:
        // Integrate with WAF/firewall to block IP
        logger.info({ event: 'ip_blocked', ip: context.sourceIp }, 'IP blocked');
        break;

      case ResponseAction.LOCK_ACCOUNT:
        // Lock the user account
        // await prisma.user.update({ where: { id: context.userId }, data: { lockedAt: new Date() } });
        logger.info({ event: 'account_locked', userId: context.userId }, 'Account locked');
        break;

      case ResponseAction.REVOKE_SESSIONS:
        // Invalidate all user sessions
        // await prisma.session.deleteMany({ where: { userId: context.userId } });
        logger.info({ event: 'sessions_revoked', userId: context.userId }, 'Sessions revoked');
        break;

      case ResponseAction.NOTIFY_TEAM:
        // Send notification to the security team
        logger.info({ event: 'team_notified' }, 'Security team notified');
        break;

      case ResponseAction.ENABLE_ENHANCED_LOGGING:
        // Enable detailed logging for the IP/user
        logger.info({ event: 'enhanced_logging_enabled' }, 'Enhanced logging enabled');
        break;

      case ResponseAction.TRIGGER_BACKUP:
        // Trigger emergency backup
        logger.info({ event: 'emergency_backup_triggered' }, 'Emergency backup triggered');
        break;

      default:
        logger.warn({ action }, 'Response action not implemented');
    }
  }
}
```

---

### 6. RECOVER (RC) — Recover

```typescript
// services/recovery.service.ts

import pino from 'pino';

const logger = pino({ name: 'recovery' });

/**
 * RC.RP — Recovery plan execution
 * RC.CO — Recovery communications
 * 
 * Orchestrate service recovery after an incident.
 */

export enum RecoveryPhase {
  ASSESSMENT = 'assessment',     // Assess the damage
  CONTAINMENT = 'containment',   // Contain the incident
  ERADICATION = 'eradication',   // Eradicate the cause
  RESTORATION = 'restoration',   // Restore services
  VALIDATION = 'validation',     // Validate integrity
  MONITORING = 'monitoring',     // Post-recovery monitoring
  LESSONS_LEARNED = 'lessons',   // Lessons learned
}

interface RecoveryPlan {
  incidentId: string;
  phase: RecoveryPhase;
  rto: number;          // Recovery Time Objective (minutes)
  rpo: number;          // Recovery Point Objective (minutes)
  steps: RecoveryStep[];
}

interface RecoveryStep {
  order: number;
  action: string;
  responsible: string;
  estimatedTime: number; // minutes
  completed: boolean;
  notes: string;
}

export class RecoveryService {
  /**
   * Generate a recovery plan based on the incident type.
   */
  generateRecoveryPlan(incidentId: string, affectedServices: string[]): RecoveryPlan {
    return {
      incidentId,
      phase: RecoveryPhase.ASSESSMENT,
      rto: 60,  // 1 hour recovery objective
      rpo: 15,  // 15 minutes acceptable data loss
      steps: [
        {
          order: 1,
          action: 'Assess incident scope and affected services',
          responsible: 'incident_commander',
          estimatedTime: 15,
          completed: false,
          notes: `Affected services: ${affectedServices.join(', ')}`,
        },
        {
          order: 2,
          action: 'Isolate compromised systems',
          responsible: 'security_team',
          estimatedTime: 10,
          completed: false,
          notes: '',
        },
        {
          order: 3,
          action: 'Verify backup integrity',
          responsible: 'platform_team',
          estimatedTime: 15,
          completed: false,
          notes: '',
        },
        {
          order: 4,
          action: 'Restore from latest clean backup',
          responsible: 'platform_team',
          estimatedTime: 30,
          completed: false,
          notes: '',
        },
        {
          order: 5,
          action: 'Verify restored data integrity',
          responsible: 'qa_team',
          estimatedTime: 20,
          completed: false,
          notes: '',
        },
        {
          order: 6,
          action: 'Apply patches and corrective measures',
          responsible: 'security_team',
          estimatedTime: 30,
          completed: false,
          notes: '',
        },
        {
          order: 7,
          action: 'Gradually restore service',
          responsible: 'platform_team',
          estimatedTime: 15,
          completed: false,
          notes: '',
        },
        {
          order: 8,
          action: 'Intensive post-recovery monitoring (24h)',
          responsible: 'security_team',
          estimatedTime: 1440,
          completed: false,
          notes: '',
        },
        {
          order: 9,
          action: 'Lessons learned meeting (post-mortem)',
          responsible: 'incident_commander',
          estimatedTime: 60,
          completed: false,
          notes: 'Schedule within 72 hours',
        },
      ],
    };
  }
}
```

---

## NIST CSF Best Practices

### ✅ DO

1. **Maintain an updated asset inventory** (ID.AM)
2. **Periodic risk assessments** (ID.RA)
3. **Mandatory MFA** for privileged access (PR.AA)
4. **Continuous security monitoring** in real time (DE.CM)
5. **Response playbooks** documented and tested (RS.MA)
6. **Automated backups** with restoration tests (RC.RP)
7. **Blameless post-mortems** after every incident (RC + lessons)
8. **Security metrics** — MTTD, MTTR, incident frequency
9. **Threat modeling** for new features before implementation
10. **Defense in depth** — multiple layers of security

### ❌ DO NOT

1. **DO NOT** rely solely on perimeter security
2. **DO NOT** ignore security alerts (alert fatigue management)
3. **DO NOT** skip the Recover function — most organizations neglect it
4. **DO NOT** have a single point of failure in detection
5. **DO NOT** respond to incidents without a defined playbook

---

## NIST CSF 2.0 Compliance Checklist

### Govern (GV)
- [ ] Cybersecurity policy documented and approved
- [ ] Security roles and responsibilities defined
- [ ] Risk appetite defined by management
- [ ] Supply chain risk management program

### Identify (ID)
- [ ] Information asset inventory
- [ ] Software and services inventory
- [ ] Documented risk assessment
- [ ] Threat and vulnerability assessment

### Protect (PR)
- [ ] Role-based access controls
- [ ] Multi-factor authentication
- [ ] Encryption at rest and in transit
- [ ] Secure server configuration
- [ ] Automated vulnerability management
- [ ] Security training for the team

### Detect (DE)
- [ ] Continuous security monitoring
- [ ] Authentication anomaly detection
- [ ] Common attack detection (SQLi, XSS, etc.)
- [ ] Alerts configured with appropriate thresholds
- [ ] Centralized logs and event correlation

### Respond (RS)
- [ ] Documented incident response plan
- [ ] Playbooks for common incident types
- [ ] Communication process during incidents
- [ ] Rapid containment capability (block IP, lock accounts)
- [ ] Forensic analysis process

### Recover (RC)
- [ ] Documented and tested recovery plan
- [ ] RTO and RPO defined for each critical service
- [ ] Automated and verified backups
- [ ] Post-incident lessons learned process
- [ ] Recovery communication plan

---

## References and Resources

- [NIST CSF 2.0 Official](https://www.nist.gov/cyberframework)
- [NIST SP 800-53 (Security Controls)](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [NIST SP 800-61 (Incident Response)](https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final)
- [NIST SP 800-30 (Risk Assessment)](https://csrc.nist.gov/publications/detail/sp/800-30/rev-1/final)
- [CISA Cybersecurity Resources](https://www.cisa.gov/cybersecurity)
