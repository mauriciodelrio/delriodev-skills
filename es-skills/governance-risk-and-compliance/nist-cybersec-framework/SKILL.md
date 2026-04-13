---
name: nist-cybersec-framework
description: >
  Usa este skill cuando implementes controles de ciberseguridad siguiendo las
  funciones Govern, Identify, Protect, Detect, Respond y Recover. Aunque el
  NIST CSF fue desarrollado por el gobierno de EE.UU., este skill se aplica
  como marco de ciberseguridad para cualquier software independientemente de
  la ubicación geográfica. Cubre gobernanza de seguridad, inventario de activos
  y evaluación de riesgos, protección (MFA, headers, health checks), detección
  de amenazas (fuerza bruta, viaje imposible, SQLi, XSS, path traversal),
  respuesta automatizada con playbooks e incidentes, y recuperación con RTO/RPO.
---

# NIST Cybersecurity Framework (CSF) 2.0

NIST CSF 2.0 (2024) es el marco de ciberseguridad más adoptado globalmente y debe aplicarse como referencia de seguridad para cualquier software, independientemente de la ubicación geográfica. Se organiza en 6 funciones: Govern (estrategia, políticas, riesgo, cadena de suministro), Identify (inventario de activos, evaluación de riesgos), Protect (acceso, MFA, encriptación, configuración segura), Detect (monitoreo continuo, detección de anomalías y ataques), Respond (playbooks, contención, análisis forense) y Recover (restauración, validación, lecciones aprendidas).

## Implementación

### 1. GOVERN (GV) — Gobernar

```typescript
// config/security-governance.config.ts

/**
 * GV.OC — Contexto organizacional
 * GV.RM — Gestión de riesgos
 * GV.SC — Cadena de suministro
 * 
 * Define la estrategia de ciberseguridad, roles, políticas y tolerancia al riesgo.
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

// Ejemplo de configuración
export const GOVERNANCE_CONFIG: SecurityGovernanceConfig = {
  organization: {
    name: 'MiEmpresa',
    securityOfficer: 'security@empresa.com',
    riskAppetite: 'conservative',
    regulatoryRequirements: ['GDPR', 'SOC2', 'PCI-DSS'],
  },
  policies: [
    {
      id: 'POL-001',
      name: 'Política de Control de Acceso',
      version: '2.0',
      lastReviewed: new Date('2025-01-15'),
      nextReview: new Date('2026-01-15'),
      owner: 'CISO',
      scope: 'Todos los sistemas y aplicaciones',
      status: 'active',
    },
    {
      id: 'POL-002',
      name: 'Política de Gestión de Vulnerabilidades',
      version: '1.5',
      lastReviewed: new Date('2025-03-01'),
      nextReview: new Date('2026-03-01'),
      owner: 'Security Team Lead',
      scope: 'Infraestructura y aplicaciones',
      status: 'active',
    },
  ],
  riskMatrix: {
    levels: {
      impact: ['negligible', 'minor', 'moderate', 'major', 'catastrophic'],
      likelihood: ['rare', 'unlikely', 'possible', 'likely', 'almost_certain'],
    },
    acceptableRiskLevel: 8, // Riesgo aceptable: hasta 8 de 25
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

### 2. IDENTIFY (ID) — Identificar

```typescript
// services/asset-inventory.service.ts

/**
 * ID.AM — Gestión de activos
 * ID.RA — Evaluación de riesgos
 * 
 * Mantener inventario de activos y evaluar riesgos continuamente.
 */

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  owner: string;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  criticality: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[]; // IDs de activos de los que depende
  dataTypes: string[];    // Tipos de datos que maneja
  location: string;       // Dónde está desplegado
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

// Inventario de activos — mantener actualizado
export const ASSET_INVENTORY: Asset[] = [
  {
    id: 'ASSET-001',
    name: 'API Principal (REST)',
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
    name: 'Base de Datos PostgreSQL',
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
    name: 'Cache Redis',
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
 * ID.RA — Evaluación de riesgos.
 * Calcular el nivel de riesgo de un activo basado en amenazas y vulnerabilidades.
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
  
  // El riesgo residual se reduce por los controles existentes
  const mitigationFactor = Math.min(mitigations.length * 0.1, 0.5); // Max 50% reducción
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

### 3. PROTECT (PR) — Proteger

```typescript
// middleware/nist-protect.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import pino from 'pino';

const logger = pino({ name: 'nist-protect' });

/**
 * PR.AA — Gestión de identidades, autenticación y control de acceso
 * PR.AT — Concienciación y formación
 * PR.DS — Seguridad de datos
 * PR.PS — Seguridad de plataformas
 * PR.IR — Resiliencia de la infraestructura tecnológica
 */

/**
 * PR.AA-03: Autenticación multifactor.
 * Middleware que verifica MFA para operaciones sensibles.
 */
export function requireMFA(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.mfaVerified) {
    logger.warn({
      event: 'mfa_required',
      userId: req.user?.id,
      path: req.originalUrl,
    }, 'Acceso denegado: MFA requerido');

    return res.status(403).json({
      error: 'Autenticación multifactor requerida',
      code: 'MFA_REQUIRED',
      mfaUrl: '/api/v1/auth/mfa/verify',
    });
  }
  next();
}

/**
 * PR.DS-01: Proteger la confidencialidad de los datos en reposo.
 * PR.DS-02: Proteger la confidencialidad de los datos en tránsito.
 * 
 * Middleware que asegura que las respuestas con datos sensibles
 * incluyan los headers de protección apropiados.
 */
export function dataProtectionHeaders(req: Request, res: Response, next: NextFunction) {
  // Asegurar que datos sensibles no se cacheen
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Prevenir que el navegador detecte el tipo de contenido
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Strict Transport Security
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  next();
}

/**
 * PR.PS-01: Gestión de configuraciones.
 * Verificar que la configuración del servidor es segura antes de arrancar.
 */
export function validateServerSecurity(): { secure: boolean; issues: string[] } {
  const issues: string[] = [];

  // Verificar HTTPS
  if (process.env.NODE_ENV === 'production' && !process.env.TLS_CERT_PATH) {
    issues.push('TLS no configurado en producción');
  }

  // Verificar que no haya credenciales por defecto
  if (process.env.DB_PASSWORD === 'password' || process.env.DB_PASSWORD === 'admin') {
    issues.push('Credencial de base de datos por defecto detectada');
  }

  // Verificar secretos JWT
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    issues.push('JWT_SECRET ausente o demasiado corto (mínimo 32 caracteres)');
  }

  // Verificar clave de encriptación
  if (!process.env.DATA_ENCRYPTION_KEY) {
    issues.push('DATA_ENCRYPTION_KEY no configurada');
  }

  // Verificar modo debug desactivado en producción
  if (process.env.NODE_ENV === 'production' && process.env.DEBUG) {
    issues.push('Modo debug activo en producción');
  }

  return {
    secure: issues.length === 0,
    issues,
  };
}

/**
 * PR.IR: Resiliencia de infraestructura.
 * Health check endpoint con verificación de dependencias.
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, { status: string; latency?: number }>;
}> {
  const checks: Record<string, { status: string; latency?: number }> = {};

  // Check base de datos
  try {
    const start = Date.now();
    // await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'healthy', latency: Date.now() - start };
  } catch {
    checks.database = { status: 'unhealthy' };
  }

  // Check Redis
  try {
    const start = Date.now();
    // await redis.ping();
    checks.cache = { status: 'healthy', latency: Date.now() - start };
  } catch {
    checks.cache = { status: 'unhealthy' };
  }

  // Check almacenamiento
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

### 4. DETECT (DE) — Detectar

```typescript
// services/threat-detection.service.ts

import pino from 'pino';

const logger = pino({ name: 'threat-detection' });

/**
 * DE.CM — Monitoreo continuo
 * DE.AE — Análisis de eventos adversos
 * 
 * Sistema de detección de amenazas y anomalías en tiempo real.
 */

interface SecurityEvent {
  type: SecurityEventType;
  severity: 'info' | 'warning' | 'critical';
  source: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

export enum SecurityEventType {
  // Autenticación
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  CREDENTIAL_STUFFING = 'credential_stuffing',
  IMPOSSIBLE_TRAVEL = 'impossible_travel',
  
  // Acceso
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  UNUSUAL_DATA_ACCESS = 'unusual_data_access',
  
  // Datos
  DATA_EXFILTRATION = 'data_exfiltration',
  UNUSUAL_DOWNLOAD = 'unusual_download',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  
  // Infraestructura
  PORT_SCAN = 'port_scan',
  DDOS_ATTEMPT = 'ddos_attempt',
  UNUSUAL_TRAFFIC = 'unusual_traffic',
}

/**
 * DE.CM-01: Monitoreo de redes y servicios de red.
 * Detecta patrones de autenticación anómalos.
 */
export class AuthenticationMonitor {
  // Almacén en memoria (en producción usar Redis)
  private failedAttempts = new Map<string, { count: number; timestamps: number[] }>();
  private loginLocations = new Map<string, { ip: string; timestamp: number; location?: string }[]>();

  /**
   * Registrar intento de login fallido y detectar fuerza bruta.
   */
  async recordFailedLogin(identifier: string, ip: string): Promise<SecurityEvent | null> {
    const key = identifier;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutos

    const current = this.failedAttempts.get(key) ?? { count: 0, timestamps: [] };
    
    // Limpiar intentos fuera de la ventana
    current.timestamps = current.timestamps.filter(t => now - t < windowMs);
    current.timestamps.push(now);
    current.count = current.timestamps.length;
    
    this.failedAttempts.set(key, current);

    // Umbral de fuerza bruta: >5 intentos en 15 minutos
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
      }, '🚨 Intento de fuerza bruta detectado');

      return event;
    }

    // Umbral de credential stuffing: >3 intentos desde la misma IP en diferentes cuentas
    // (detectar en un servicio centralizado)

    return null;
  }

  /**
   * DE.AE — Detectar viaje imposible.
   * Si un usuario inicia sesión desde dos ubicaciones geográficas
   * incompatibles en un período corto de tiempo.
   */
  async detectImpossibleTravel(
    userId: string,
    currentIp: string,
    currentLocation?: string,
  ): Promise<SecurityEvent | null> {
    const now = Date.now();
    const history = this.loginLocations.get(userId) ?? [];
    
    // Registrar login actual
    history.push({ ip: currentIp, timestamp: now, location: currentLocation });
    
    // Mantener solo las últimas 24 horas
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const recentLogins = history.filter(h => h.timestamp > dayAgo);
    this.loginLocations.set(userId, recentLogins);

    // Verificar si hay logins desde IPs diferentes en las últimas 2 horas
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
      }, '🚨 Viaje imposible detectado');

      return event;
    }

    return null;
  }
}

/**
 * DE.CM — Monitoreo continuo de solicitudes HTTP.
 * Detecta patrones de ataque comunes.
 */
export class RequestMonitor {
  /**
   * Detectar intentos de inyección SQL en parámetros.
   */
  static detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|FETCH|DECLARE)\b)/i,
      /(-{2}|\/\*|\*\/)/,               // Comentarios SQL
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i, // OR 1=1, AND 1=1
      /(';?\s*(DROP|DELETE|UPDATE)\s)/i,   // ; DROP TABLE
      /(\bUNION\b.*\bSELECT\b)/i,        // UNION SELECT
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Detectar intentos de XSS en parámetros.
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
   * Detectar intentos de Path Traversal.
   */
  static detectPathTraversal(input: string): boolean {
    const patterns = [
      /\.\.[\/\\]/,           // ../  o  ..\
      /%2e%2e[\/\\%]/i,      // URL encoded
      /\.\.\%2f/i,           // Mixed encoding
    ];

    return patterns.some(pattern => pattern.test(input));
  }
}

/**
 * Middleware de Express que integra la detección de amenazas.
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
    }, '🚨 Intento de SQL Injection bloqueado');

    return res.status(400).json({ error: 'Solicitud rechazada por motivos de seguridad' });
  }

  if (RequestMonitor.detectXSS(allInputs)) {
    logger.error({
      event: 'xss_attempt_blocked',
      ip: req.ip,
      path: req.originalUrl,
      userId: req.user?.id,
    }, '🚨 Intento de XSS bloqueado');

    return res.status(400).json({ error: 'Solicitud rechazada por motivos de seguridad' });
  }

  if (RequestMonitor.detectPathTraversal(allInputs)) {
    logger.error({
      event: 'path_traversal_blocked',
      ip: req.ip,
      path: req.originalUrl,
    }, '🚨 Intento de Path Traversal bloqueado');

    return res.status(400).json({ error: 'Solicitud rechazada por motivos de seguridad' });
  }

  next();
}

import { Request, Response, NextFunction } from 'express';
```

---

### 5. RESPOND (RS) — Responder

```typescript
// services/incident-response.service.ts

import pino from 'pino';

const logger = pino({ name: 'incident-response' });

/**
 * RS.MA — Gestión de incidentes
 * RS.AN — Análisis de incidentes
 * RS.CO — Comunicación de respuesta a incidentes
 * RS.MI — Mitigación de incidentes
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
 * Playbooks de respuesta automática.
 * Definen las acciones a tomar para cada tipo de incidente.
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
      ResponseAction.SCALE_DOWN, // Activar WAF/CDN rate limiting
      ResponseAction.ENABLE_ENHANCED_LOGGING,
      ResponseAction.NOTIFY_TEAM,
    ],
    runbook: 'https://wiki.internal/runbooks/ddos-response',
    notifyChannels: ['slack:#security-alerts', 'slack:#infrastructure'],
  },
];

export class IncidentResponseService {
  /**
   * Ejecutar playbook de respuesta automática.
   */
  async executePlaybook(trigger: string, context: {
    sourceIp?: string;
    userId?: string;
    serviceName?: string;
    details: Record<string, unknown>;
  }) {
    const playbook = RESPONSE_PLAYBOOKS.find(p => p.trigger === trigger);

    if (!playbook) {
      logger.warn({ event: 'no_playbook_found', trigger }, 'Sin playbook para este tipo de evento');
      return;
    }

    logger.info({
      event: 'playbook_executing',
      trigger,
      severity: playbook.severity,
      actions: playbook.actions,
    }, `Ejecutando playbook: ${trigger}`);

    for (const action of playbook.actions) {
      try {
        await this.executeAction(action, context);
      } catch (error) {
        logger.error({
          event: 'playbook_action_failed',
          action,
          trigger,
          error,
        }, `Error ejecutando acción: ${action}`);
      }
    }
  }

  private async executeAction(action: ResponseAction, context: Record<string, unknown>) {
    switch (action) {
      case ResponseAction.BLOCK_IP:
        // Integrar con WAF/firewall para bloquear IP
        logger.info({ event: 'ip_blocked', ip: context.sourceIp }, 'IP bloqueada');
        break;

      case ResponseAction.LOCK_ACCOUNT:
        // Bloquear la cuenta del usuario
        // await prisma.user.update({ where: { id: context.userId }, data: { lockedAt: new Date() } });
        logger.info({ event: 'account_locked', userId: context.userId }, 'Cuenta bloqueada');
        break;

      case ResponseAction.REVOKE_SESSIONS:
        // Invalidar todas las sesiones del usuario
        // await prisma.session.deleteMany({ where: { userId: context.userId } });
        logger.info({ event: 'sessions_revoked', userId: context.userId }, 'Sesiones revocadas');
        break;

      case ResponseAction.NOTIFY_TEAM:
        // Enviar notificación al equipo de seguridad
        logger.info({ event: 'team_notified' }, 'Equipo de seguridad notificado');
        break;

      case ResponseAction.ENABLE_ENHANCED_LOGGING:
        // Activar logging detallado para la IP/usuario
        logger.info({ event: 'enhanced_logging_enabled' }, 'Logging mejorado activado');
        break;

      case ResponseAction.TRIGGER_BACKUP:
        // Disparar backup de emergencia
        logger.info({ event: 'emergency_backup_triggered' }, 'Backup de emergencia disparado');
        break;

      default:
        logger.warn({ action }, 'Acción de respuesta no implementada');
    }
  }
}
```

---

### 6. RECOVER (RC) — Recuperar

```typescript
// services/recovery.service.ts

import pino from 'pino';

const logger = pino({ name: 'recovery' });

/**
 * RC.RP — Ejecución del plan de recuperación
 * RC.CO — Comunicaciones de recuperación
 * 
 * Orquestar la recuperación de servicios tras un incidente.
 */

export enum RecoveryPhase {
  ASSESSMENT = 'assessment',     // Evaluar el daño
  CONTAINMENT = 'containment',   // Contener el incidente
  ERADICATION = 'eradication',   // Erradicar la causa
  RESTORATION = 'restoration',   // Restaurar servicios
  VALIDATION = 'validation',     // Validar integridad
  MONITORING = 'monitoring',     // Monitoreo post-recuperación
  LESSONS_LEARNED = 'lessons',   // Lecciones aprendidas
}

interface RecoveryPlan {
  incidentId: string;
  phase: RecoveryPhase;
  rto: number;          // Recovery Time Objective (minutos)
  rpo: number;          // Recovery Point Objective (minutos)
  steps: RecoveryStep[];
}

interface RecoveryStep {
  order: number;
  action: string;
  responsible: string;
  estimatedTime: number; // minutos
  completed: boolean;
  notes: string;
}

export class RecoveryService {
  /**
   * Generar plan de recuperación basado en el tipo de incidente.
   */
  generateRecoveryPlan(incidentId: string, affectedServices: string[]): RecoveryPlan {
    return {
      incidentId,
      phase: RecoveryPhase.ASSESSMENT,
      rto: 60,  // 1 hora objetivo de recuperación
      rpo: 15,  // 15 minutos de pérdida de datos aceptable
      steps: [
        {
          order: 1,
          action: 'Evaluar alcance del incidente y servicios afectados',
          responsible: 'incident_commander',
          estimatedTime: 15,
          completed: false,
          notes: `Servicios afectados: ${affectedServices.join(', ')}`,
        },
        {
          order: 2,
          action: 'Aislar sistemas comprometidos',
          responsible: 'security_team',
          estimatedTime: 10,
          completed: false,
          notes: '',
        },
        {
          order: 3,
          action: 'Verificar integridad de backups',
          responsible: 'platform_team',
          estimatedTime: 15,
          completed: false,
          notes: '',
        },
        {
          order: 4,
          action: 'Restaurar desde último backup limpio',
          responsible: 'platform_team',
          estimatedTime: 30,
          completed: false,
          notes: '',
        },
        {
          order: 5,
          action: 'Verificar integridad de datos restaurados',
          responsible: 'qa_team',
          estimatedTime: 20,
          completed: false,
          notes: '',
        },
        {
          order: 6,
          action: 'Aplicar parches y medidas correctivas',
          responsible: 'security_team',
          estimatedTime: 30,
          completed: false,
          notes: '',
        },
        {
          order: 7,
          action: 'Restaurar servicio gradualmente',
          responsible: 'platform_team',
          estimatedTime: 15,
          completed: false,
          notes: '',
        },
        {
          order: 8,
          action: 'Monitoreo intensivo post-recuperación (24h)',
          responsible: 'security_team',
          estimatedTime: 1440,
          completed: false,
          notes: '',
        },
        {
          order: 9,
          action: 'Reunión de lecciones aprendidas (post-mortem)',
          responsible: 'incident_commander',
          estimatedTime: 60,
          completed: false,
          notes: 'Programar dentro de 72 horas',
        },
      ],
    };
  }
}
```

---

## Flujo de trabajo del agente

1. Definir la gobernanza de seguridad: políticas, matriz de riesgos con tolerancia aceptable, y requisitos de cadena de suministro (GV).
2. Mantener inventario de activos con clasificación, criticidad, dependencias y tipos de datos; evaluar riesgos con fórmula impacto × probabilidad (ID).
3. Implementar protección: MFA para operaciones sensibles, headers de seguridad (Cache-Control, HSTS, nosniff), validación de configuración segura pre-arranque, y health checks de dependencias (PR).
4. Implementar detección: monitor de autenticación (fuerza bruta >5 intentos/15min, viaje imposible >2 IPs/2h), detección de SQLi/XSS/path traversal en middleware (DE).
5. Configurar respuesta automatizada con playbooks por tipo de incidente (brute force, data exfiltration, DDoS) que ejecuten acciones como block IP, lock account, revoke sessions (RS).
6. Implementar servicio de recuperación con plan por fases (assessment → containment → eradication → restoration → validation → monitoring → lessons learned) y RTO/RPO definidos (RC).
7. Validar contra el checklist de cumplimiento (GV + ID + PR + DE + RS + RC) antes de desplegar.

## Gotchas

No confiar solo en seguridad perimetral — aplicar defense in depth con múltiples capas. La función Recover es la más descuidada por la mayoría de organizaciones; no omitirla. No responder a incidentes sin playbook definido — cada tipo de incidente debe tener acciones automatizadas y runbook documentado. Gestionar alert fatigue: configurar umbrales apropiados para evitar ignorar alertas legítimas. El riesgo residual se reduce por controles existentes pero nunca más de 50% — no sobreestimar la mitigación. Verificar credenciales por defecto y JWT_SECRET (mínimo 32 caracteres) antes de arrancar en producción. No tener un solo punto de falla en la detección. Los post-mortems deben ser blameless y programarse dentro de 72 horas. Métricas clave a rastrear: MTTD (tiempo medio de detección), MTTR (tiempo medio de recuperación) y frecuencia de incidentes. Realizar threat modeling para nuevas features antes de implementar.

---

## Checklist de Cumplimiento NIST CSF 2.0

### Govern (GV)
- [ ] Política de ciberseguridad documentada y aprobada
- [ ] Roles y responsabilidades de seguridad definidos
- [ ] Apetito de riesgo definido por la dirección
- [ ] Programa de gestión de riesgos de cadena de suministro

### Identify (ID)
- [ ] Inventario de activos de información
- [ ] Inventario de software y servicios
- [ ] Evaluación de riesgos documentada
- [ ] Evaluación de amenazas y vulnerabilidades

### Protect (PR)
- [ ] Controles de acceso basados en roles
- [ ] Autenticación multifactor
- [ ] Encriptación en reposo y en tránsito
- [ ] Configuración segura de servidores
- [ ] Gestión de vulnerabilidades automatizada
- [ ] Formación de seguridad para el equipo

### Detect (DE)
- [ ] Monitoreo continuo de seguridad
- [ ] Detección de anomalías en autenticación
- [ ] Detección de ataques comunes (SQLi, XSS, etc.)
- [ ] Alertas configuradas con umbrales apropiados
- [ ] Logs centralizados y correlación de eventos

### Respond (RS)
- [ ] Plan de respuesta a incidentes documentado
- [ ] Playbooks para tipos de incidentes comunes
- [ ] Proceso de comunicación durante incidentes
- [ ] Capacidad de contención rápida (block IP, lock accounts)
- [ ] Proceso de análisis forense

### Recover (RC)
- [ ] Plan de recuperación documentado y probado
- [ ] RTO y RPO definidos para cada servicio crítico
- [ ] Backups automatizados y verificados
- [ ] Proceso de lecciones aprendidas post-incidente
- [ ] Plan de comunicación de recuperación

---

## Referencias y Recursos

- [NIST CSF 2.0 Official](https://www.nist.gov/cyberframework)
- [NIST SP 800-53 (Security Controls)](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [NIST SP 800-61 (Incident Response)](https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final)
- [NIST SP 800-30 (Risk Assessment)](https://csrc.nist.gov/publications/detail/sp/800-30/rev-1/final)
- [CISA Cybersecurity Resources](https://www.cisa.gov/cybersecurity)
