---
name: iso-27001
description: >
  Skill de cumplimiento ISO/IEC 27001:2022 — Sistema de Gestión de Seguridad de la Información (SGSI).
  Activa esta skill cuando diseñes arquitectura de seguridad, implementes controles de acceso,
  gestión de riesgos, políticas de seguridad, continuidad del negocio o cualquier control
  del Anexo A. Fundamental para organizaciones que buscan certificación ISO 27001.
---

# 🔒 ISO/IEC 27001:2022 — Sistema de Gestión de Seguridad de la Información

## Descripción General

**ISO/IEC 27001:2022** es el estándar internacional para establecer, implementar, mantener y mejorar continuamente un **Sistema de Gestión de Seguridad de la Información (SGSI)**. Es el estándar de seguridad más reconocido globalmente y la base para la mayoría de los programas de seguridad empresarial.

La versión 2022 reorganizó los controles del Anexo A en 4 categorías (antes eran 14) con 93 controles (antes 114).

---

## Cuándo Activar esta Skill

Activa esta skill **siempre** que:

- Diseñes la **arquitectura de seguridad** de una aplicación o servicio
- Implementes **controles de acceso** (autenticación, autorización, RBAC)
- Configures **infraestructura** (servidores, contenedores, CI/CD)
- Trabajes en **gestión de riesgos** y evaluación de amenazas
- Implementes **logging, monitoreo y detección de incidentes**
- Diseñes políticas de **continuidad del negocio y recuperación ante desastres**
- Configures **gestión de vulnerabilidades** y parches
- Prepares una auditoría de certificación ISO 27001
- Implementes **gestión de proveedores** y cadena de suministro

---

## Estructura del Estándar

### Cláusulas del SGSI (4-10)

| Cláusula | Tema | Relevancia para Desarrollo |
|----------|------|---------------------------|
| 4 | Contexto de la organización | Entender qué proteger |
| 5 | Liderazgo | Políticas de seguridad |
| 6 | Planificación | Evaluación y tratamiento de riesgos |
| 7 | Soporte | Competencias, comunicación, documentación |
| 8 | Operación | Implementación de controles |
| 9 | Evaluación del desempeño | Monitoreo, auditoría, revisión |
| 10 | Mejora | Acciones correctivas, mejora continua |

### Controles del Anexo A (ISO 27001:2022)

| Categoría | Controles | Ejemplos |
|-----------|-----------|----------|
| **Organizacionales** (A.5) | 37 controles | Políticas, roles, clasificación de información |
| **De Personas** (A.6) | 8 controles | Verificación de empleados, formación |
| **Físicos** (A.7) | 14 controles | Perímetros, equipos, medios |
| **Tecnológicos** (A.8) | 34 controles | Autenticación, criptografía, desarrollo seguro |

---

## Requisitos Técnicos de Implementación

### 1. Clasificación y Manejo de Información (A.5.12, A.5.13)

```typescript
// types/information-classification.ts

/**
 * ISO 27001 A.5.12 — Clasificación de la información
 * Toda información debe clasificarse según su sensibilidad y criticidad.
 */
export enum InformationClassification {
  PUBLIC = 'public',               // Información pública — sin restricciones
  INTERNAL = 'internal',           // Uso interno — empleados
  CONFIDENTIAL = 'confidential',   // Confidencial — acceso restringido
  RESTRICTED = 'restricted',       // Restringida — máxima protección
}

/**
 * Controles requeridos según clasificación.
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

#### Middleware de Clasificación

```typescript
// middleware/classification.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { InformationClassification, CLASSIFICATION_CONTROLS } from '../types/information-classification';
import pino from 'pino';

const logger = pino({ name: 'classification-control' });

/**
 * A.5.13 — Etiquetado de la información
 * Middleware que aplica controles según la clasificación del recurso.
 */
export function classificationGuard(classification: InformationClassification) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const controls = CLASSIFICATION_CONTROLS[classification];

    // Verificar MFA si es requerido
    if (controls.access.requiresMFA && !req.user?.mfaVerified) {
      return res.status(403).json({
        error: 'Se requiere autenticación multifactor',
        code: 'MFA_REQUIRED',
        classification,
      });
    }

    // Verificar nivel de acceso
    if (!controls.access.maxAccessLevel.includes('*')) {
      const hasAccessLevel = controls.access.maxAccessLevel.includes(req.user?.role ?? '');
      if (!hasAccessLevel) {
        logger.warn({
          event: 'access_denied_classification',
          userId: req.user?.id,
          userRole: req.user?.role,
          classification,
          requiredLevels: controls.access.maxAccessLevel,
        }, 'Acceso denegado por clasificación de información');

        return res.status(403).json({
          error: 'Nivel de acceso insuficiente',
          code: 'INSUFFICIENT_CLEARANCE',
          classification,
        });
      }
    }

    // Añadir headers de clasificación a la respuesta
    res.setHeader('X-Information-Classification', classification);
    
    if (controls.handling.watermark) {
      res.setHeader('X-Watermark', `${req.user?.id}-${Date.now()}`);
    }

    // Registrar acceso si es requerido
    if (controls.audit.logAccess) {
      logger.info({
        event: 'classified_resource_access',
        userId: req.user?.id,
        classification,
        resource: req.originalUrl,
        method: req.method,
      }, 'Acceso a recurso clasificado');
    }

    next();
  };
}
```

---

### 2. Control de Acceso (A.5.15 — A.5.18, A.8.2 — A.8.5)

```typescript
// services/access-control.service.ts

import { z } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'access-control' });

/**
 * A.5.15 — Control de acceso
 * A.5.18 — Derechos de acceso
 * A.8.2 — Derechos de acceso privilegiado
 * A.8.3 — Restricción de acceso a la información
 * 
 * Implementación ABAC (Attribute-Based Access Control) que combina:
 * - Rol del usuario (RBAC)
 * - Atributos del recurso (clasificación, propietario)
 * - Contexto (hora, IP, dispositivo)
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

// Políticas de acceso declarativas
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
      ipWhitelist: ['10.0.0.0/8', '172.16.0.0/12'], // Solo red interna
    },
  },
  {
    resource: 'financial:*',
    action: 'read',
    conditions: {
      roles: ['cfo', 'finance_manager', 'auditor'],
      mfaRequired: true,
      timeRestriction: { startHour: 8, endHour: 20 }, // Solo horario laboral
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
   * Evaluar si un acceso está permitido según las políticas definidas.
   */
  evaluate(
    resource: string,
    action: AccessPolicy['action'],
    context: AccessContext,
  ): { allowed: boolean; reason: string } {
    // Buscar políticas aplicables
    const applicablePolicies = ACCESS_POLICIES.filter(
      p => this.matchResource(p.resource, resource) && p.action === action
    );

    if (applicablePolicies.length === 0) {
      // A.5.15: Por defecto, denegar acceso (deny by default)
      logger.warn({
        event: 'access_denied_no_policy',
        resource,
        action,
        userId: context.userId,
      }, 'Acceso denegado: sin política aplicable');

      return { allowed: false, reason: 'No existe política de acceso para este recurso' };
    }

    // Evaluar cada política (OR: basta que una permita)
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
        }, 'Acceso concedido');
        return result;
      }
    }

    return { allowed: false, reason: 'Ninguna política de acceso aplicable concede permisos' };
  }

  private evaluatePolicy(policy: AccessPolicy, context: AccessContext): { allowed: boolean; reason: string } {
    const { conditions } = policy;

    // Verificar rol
    if (conditions.roles && !conditions.roles.includes(context.role)) {
      return { allowed: false, reason: `Rol ${context.role} no autorizado` };
    }

    // Verificar departamento
    if (conditions.departments && !conditions.departments.includes(context.department)) {
      return { allowed: false, reason: `Departamento ${context.department} no autorizado` };
    }

    // Verificar MFA
    if (conditions.mfaRequired && !context.mfaVerified) {
      return { allowed: false, reason: 'Se requiere autenticación multifactor' };
    }

    // Verificar restricción horaria
    if (conditions.timeRestriction) {
      const hour = context.timestamp.getHours();
      if (hour < conditions.timeRestriction.startHour || hour >= conditions.timeRestriction.endHour) {
        return { allowed: false, reason: 'Acceso fuera de horario permitido' };
      }
    }

    // Verificar IP whitelist
    if (conditions.ipWhitelist) {
      const isAllowed = conditions.ipWhitelist.some(cidr => this.ipInCIDR(context.ipAddress, cidr));
      if (!isAllowed) {
        return { allowed: false, reason: 'IP no autorizada' };
      }
    }

    return { allowed: true, reason: 'Acceso autorizado por política' };
  }

  private matchResource(pattern: string, resource: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(resource);
  }

  private ipInCIDR(ip: string, cidr: string): boolean {
    // Implementación simplificada — en producción usar librería como 'ip-cidr'
    const [range, bits] = cidr.split('/');
    if (!bits) return ip === range;
    // Verificación básica de prefijo de red
    const ipParts = ip.split('.').map(Number);
    const rangeParts = range.split('.').map(Number);
    const mask = parseInt(bits, 10);
    const octets = Math.floor(mask / 8);
    return ipParts.slice(0, octets).every((part, i) => part === rangeParts[i]);
  }
}
```

---

### 3. Gestión de Vulnerabilidades Técnicas (A.8.8)

```typescript
// scripts/vulnerability-check.ts

import { execSync } from 'node:child_process';
import pino from 'pino';

const logger = pino({ name: 'vulnerability-management' });

/**
 * A.8.8 — Gestión de vulnerabilidades técnicas.
 * Verificación automática de dependencias vulnerables.
 * Integrar en CI/CD pipeline.
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
  logger.info({ event: 'vuln_check_started' }, 'Iniciando verificación de vulnerabilidades');

  try {
    // Ejecutar npm audit en formato JSON
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

    // Política ISO 27001: No se permiten vulnerabilidades críticas o altas en producción
    report.policyViolation = report.vulnerabilities.critical > 0 || report.vulnerabilities.high > 0;

    if (report.policyViolation) {
      logger.error({
        event: 'vuln_policy_violation',
        critical: report.vulnerabilities.critical,
        high: report.vulnerabilities.high,
      }, '🚨 VIOLACIÓN DE POLÍTICA: Vulnerabilidades críticas/altas detectadas');
    }

    return report;
  } catch (error) {
    logger.error({ event: 'vuln_check_error', error }, 'Error en verificación de vulnerabilidades');
    throw error;
  }
}

/**
 * GitHub Actions workflow para verificación continua.
 * Crear como .github/workflows/security-audit.yml
 */
export const SECURITY_AUDIT_WORKFLOW = `
name: ISO 27001 - Security Audit
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # Cada lunes a las 6 AM

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

### 4. Desarrollo Seguro (A.8.25 — A.8.28, A.8.31)

```typescript
// config/secure-development.config.ts

/**
 * A.8.25 — Ciclo de vida de desarrollo seguro
 * A.8.26 — Requisitos de seguridad de aplicaciones
 * A.8.27 — Principios de ingeniería de sistemas seguros
 * A.8.28 — Codificación segura
 * A.8.31 — Separación de entornos
 */

/**
 * Configuración de seguridad por entorno.
 * A.8.31: Los entornos de desarrollo, pruebas y producción
 * deben estar separados para reducir riesgos.
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
      errorDetails: true, // OK en dev
    },
    data: {
      useRealData: false, // NUNCA datos reales en dev
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
      useRealData: false, // Datos anonimizados
      encryptionRequired: true,
      backupFrequency: 'daily',
    },
  },
  production: {
    name: 'production',
    security: {
      tlsMinVersion: 'TLSv1.3', // Máxima seguridad en producción
      corsOrigins: ['https://app.example.com'],
      rateLimitRpm: 100,
      logLevel: 'warn',
      debugMode: false,
      sourceMap: false,
      errorDetails: false, // NUNCA detalles de error en producción
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
    throw new Error(`Configuración no encontrada para entorno: ${env}`);
  }

  return config;
}
```

#### Configuración Segura de Express/Fastify

```typescript
// config/server-security.config.ts

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { Express } from 'express';
import { getEnvironmentConfig } from './secure-development.config';

/**
 * A.8.26 — Requisitos de seguridad de aplicaciones.
 * Aplicar todas las medidas de seguridad al servidor HTTP.
 */
export function applySecurityMiddleware(app: Express) {
  const config = getEnvironmentConfig();

  // 1. Helmet — Headers de seguridad HTTP
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Minimizar unsafe-inline
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
      maxAge: 31536000, // 1 año
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
    maxAge: 86400, // 24 horas
  }));

  // 3. Rate Limiting (A.8.6 — Gestión de capacidad)
  app.use(rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: config.security.rateLimitRpm,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes', code: 'RATE_LIMIT_EXCEEDED' },
  }));

  // 4. Desactivar header X-Powered-By
  app.disable('x-powered-by');

  // 5. Parseo seguro de body
  app.use(require('express').json({ limit: '1mb' }));
  app.use(require('express').urlencoded({ extended: false, limit: '1mb' }));
}
```

---

### 5. Gestión de Incidentes de Seguridad (A.5.24 — A.5.28)

```typescript
// services/incident-management.service.ts

import pino from 'pino';

const logger = pino({ name: 'incident-management' });

/**
 * A.5.24 — Planificación y preparación de la gestión de incidentes
 * A.5.25 — Evaluación y decisión sobre eventos de seguridad
 * A.5.26 — Respuesta a incidentes de seguridad
 * A.5.27 — Aprendizaje de los incidentes
 * A.5.28 — Recopilación de evidencia
 */

export enum IncidentSeverity {
  CRITICAL = 'P1', // Brecha activa, datos comprometidos, servicio caído
  HIGH = 'P2',     // Vulnerabilidad explotable, intento de intrusión
  MEDIUM = 'P3',   // Vulnerabilidad detectada, anomalía de tráfico
  LOW = 'P4',      // Violación de política menor, evento sospechoso
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
   * Detectar y registrar un nuevo incidente de seguridad.
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
        action: 'Incidente detectado y registrado',
        performedBy: params.detectedBy,
        notes: params.description,
      }],
    };

    logIncident(incident, 'incident_detected');

    // Escalar según severidad
    await this.escalate(incident);

    return incident;
  }

  /**
   * Escalar el incidente según su severidad.
   * Tiempos de respuesta definidos por política:
   * - P1 (Crítico): Respuesta inmediata (< 15 min)
   * - P2 (Alto): < 1 hora
   * - P3 (Medio): < 4 horas
   * - P4 (Bajo): < 24 horas
   */
  private async escalate(incident: SecurityIncident) {
    const escalationTargets = {
      [IncidentSeverity.CRITICAL]: {
        channels: ['pagerduty', 'sms', 'phone'],
        targets: ['security_officer', 'cto', 'ceo'],
        sla: '15 minutos',
      },
      [IncidentSeverity.HIGH]: {
        channels: ['slack', 'email'],
        targets: ['security_team', 'engineering_lead'],
        sla: '1 hora',
      },
      [IncidentSeverity.MEDIUM]: {
        channels: ['slack', 'email'],
        targets: ['security_team'],
        sla: '4 horas',
      },
      [IncidentSeverity.LOW]: {
        channels: ['email'],
        targets: ['security_team'],
        sla: '24 horas',
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
    }, `Incidente escalado: ${incident.title}`);
  }

  /**
   * A.5.28 — Recopilación de evidencia.
   * Preservar evidencia forense del incidente.
   */
  async collectEvidence(incidentId: string, evidence: {
    type: 'log' | 'screenshot' | 'memory_dump' | 'network_capture' | 'file';
    source: string;
    description: string;
    data: Buffer | string;
    collectedBy: string;
  }) {
    // En producción: almacenar en bucket seguro, inmutable, con hash de integridad
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
    }, 'Evidencia forense recopilada');

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

### 6. Continuidad del Negocio (A.5.29, A.5.30, A.8.13, A.8.14)

```typescript
// config/backup-recovery.config.ts

/**
 * A.5.29 — Seguridad de la información durante la interrupción
 * A.5.30 — Preparación de las TIC para la continuidad del negocio
 * A.8.13 — Respaldo de la información
 * A.8.14 — Redundancia de las instalaciones de procesamiento de información
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
    rpo: '0', // Sin pérdida (versionado en git)
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
 * Script de verificación de backups.
 * Ejecutar mensualmente como mínimo.
 */
export async function verifyBackupIntegrity(resource: string): Promise<{
  healthy: boolean;
  lastBackup: Date;
  backupSize: number;
  restorationTest: boolean;
}> {
  // Implementar verificación real según tu infraestructura
  // 1. Verificar que el backup existe
  // 2. Verificar integridad (checksum)
  // 3. Intentar restauración en entorno aislado
  // 4. Verificar que los datos restaurados son consistentes

  return {
    healthy: true,
    lastBackup: new Date(),
    backupSize: 0,
    restorationTest: true,
  };
}
```

---

## Buenas Prácticas ISO 27001

### ✅ HACER

1. **Mantener inventario de activos** de información (A.5.9) — saber qué proteges
2. **Clasificar toda la información** según sensibilidad (A.5.12)
3. **Aplicar principio de mínimo privilegio** en todos los accesos (A.5.15)
4. **Encriptar datos sensibles** en reposo y en tránsito (A.8.24)
5. **Implementar logging centralizado** e inmutable (A.8.15)
6. **Automatizar escaneos de vulnerabilidades** en CI/CD (A.8.8)
7. **Mantener documentación actualizada** de políticas y procedimientos
8. **Realizar evaluaciones de riesgo** periódicas (Cláusula 6.1.2)
9. **Testing de restauración de backups** mensual (A.8.13)
10. **Separar entornos** de desarrollo, staging y producción (A.8.31)

### ❌ NO HACER

1. **NO** dar acceso sin necesidad de negocio justificada
2. **NO** usar credenciales compartidas
3. **NO** desplegar sin escaneo de seguridad previo
4. **NO** ignorar alertas de seguridad en dependencias
5. **NO** almacenar secretos en código fuente
6. **NO** omitir headers de seguridad HTTP
7. **NO** desactivar TLS/HTTPS en ningún entorno
8. **NO** proceder sin plan de respuesta a incidentes

---

## Checklist de Cumplimiento ISO 27001

### Controles Organizacionales (A.5)
- [ ] Políticas de seguridad documentadas y aprobadas
- [ ] Roles y responsabilidades de seguridad definidos
- [ ] Inventario de activos de información
- [ ] Clasificación y etiquetado de información
- [ ] Políticas de control de acceso
- [ ] Gestión de identidades
- [ ] Acuerdos de confidencialidad (NDA)
- [ ] Plan de respuesta a incidentes
- [ ] Plan de continuidad del negocio

### Controles Tecnológicos (A.8)
- [ ] Autenticación multifactor (MFA)
- [ ] Gestión de derechos de acceso privilegiado
- [ ] Restricción de acceso a información
- [ ] Acceso seguro al código fuente
- [ ] Encriptación (reposo + tránsito)
- [ ] Desarrollo seguro del ciclo de vida
- [ ] Requisitos de seguridad en aplicaciones
- [ ] Codificación segura
- [ ] Gestión de vulnerabilidades técnicas
- [ ] Gestión de configuraciones
- [ ] Eliminación segura de información
- [ ] Enmascaramiento de datos
- [ ] Prevención de fuga de datos (DLP)
- [ ] Monitoreo de actividades
- [ ] Filtrado web
- [ ] Separación de entornos
- [ ] Gestión de cambios

---

## Referencias y Recursos

- [ISO/IEC 27001:2022](https://www.iso.org/standard/27001)
- [ISO/IEC 27002:2022 (Guía de controles)](https://www.iso.org/standard/75652.html)
- [ISO 27001 Annex A Controls List](https://www.iso.org/standard/27001)
- [ENISA Guidelines on ISO 27001](https://www.enisa.europa.eu/)
- [BSI IT-Grundschutz](https://www.bsi.bund.de/EN/)
