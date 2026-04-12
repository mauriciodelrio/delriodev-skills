---
name: soc2
description: >
  Skill de cumplimiento SOC 2 Type II — Trust Service Criteria (AICPA). Activa esta skill
  cuando desarrolles software SaaS o servicios cloud que requieran demostrar controles de
  seguridad, disponibilidad, integridad de procesamiento, confidencialidad y/o privacidad.
  Esencial para vender a empresas que exigen SOC 2.
---

# 🔐 SOC 2 Type II — Trust Service Criteria

## Descripción General

**SOC 2** (System and Organization Controls 2) es un framework de auditoría desarrollado por el AICPA que evalúa los controles de una organización según los **Trust Service Criteria (TSC)**. Es el estándar de facto para empresas SaaS y proveedores de servicios cloud que manejan datos de clientes.

- **Type I**: Evaluación del diseño de controles en un punto en el tiempo
- **Type II**: Evaluación de la efectividad operativa de controles durante un período (usualmente 6-12 meses)

**¿Por qué importa?** La mayoría de clientes empresariales (B2B) exigen un reporte SOC 2 Type II antes de comprar tu producto. Sin él, pierdes deals.

---

## Cuándo Activar esta Skill

Activa esta skill **siempre** que:

- Desarrolles una aplicación **SaaS** o servicio **cloud**
- Tus clientes sean **empresas (B2B)** que exigen compliance
- Implementes **controles de acceso** y autenticación robusta
- Diseñes **sistemas de monitoreo**, alertas y logging
- Trabajes en **disponibilidad** y resiliencia del servicio
- Implementes **gestión de cambios** y deployment pipelines
- Necesites demostrar controles de **confidencialidad** de datos de clientes

---

## Los 5 Trust Service Criteria (TSC)

| Criterio | Código | Descripción | ¿Obligatorio? |
|----------|--------|-------------|----------------|
| **Seguridad** | CC (Common Criteria) | Proteger contra acceso no autorizado | Sí (siempre incluido) |
| **Disponibilidad** | A | Disponibilidad del sistema según SLA | Opcional |
| **Integridad del Procesamiento** | PI | Procesamiento completo, válido, exacto y oportuno | Opcional |
| **Confidencialidad** | C | Proteger información confidencial | Opcional |
| **Privacidad** | P | Recolección, uso, retención y divulgación de info personal | Opcional |

---

## Requisitos Técnicos de Implementación

### 1. CC1 — Entorno de Control (Control Environment)

```typescript
// config/soc2-environment.config.ts

/**
 * CC1.1-CC1.5: Entorno de control.
 * Documentar y aplicar las políticas de seguridad de la organización.
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
  historyCount: number;    // No reutilizar las últimas N contraseñas
  lockoutThreshold: number; // Intentos antes de bloqueo
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
 * Validar contraseña contra la política SOC 2.
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const policy = SOC2_PASSWORD_POLICY;
  const errors: string[] = [];

  if (password.length < policy.minLength) {
    errors.push(`Mínimo ${policy.minLength} caracteres`);
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Debe incluir al menos una mayúscula');
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Debe incluir al menos una minúscula');
  }
  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Debe incluir al menos un número');
  }
  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Debe incluir al menos un carácter especial');
  }

  // Verificar patrones comunes débiles
  const weakPatterns = [/^(.)\1+$/, /^(012|123|234|345|456|567|678|789|890)+$/];
  if (weakPatterns.some(p => p.test(password))) {
    errors.push('La contraseña contiene patrones demasiado simples');
  }

  return { valid: errors.length === 0, errors };
}
```

---

### 2. CC6 — Control de Acceso Lógico y Físico

```typescript
// services/soc2-access-review.service.ts

import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const prisma = new PrismaClient();
const logger = pino({ name: 'access-review' });

/**
 * CC6.1: Implementar controles de acceso lógico.
 * CC6.2: Registrar, controlar y gestionar credenciales.
 * CC6.3: Eliminar acceso cuando ya no es necesario.
 * 
 * SOC 2 requiere revisiones periódicas de acceso para asegurar
 * que solo las personas correctas tienen los permisos correctos.
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
   * Ejecutar revisión periódica de accesos.
   * SOC 2 requiere esto trimestralmente como mínimo.
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
      // Detectar cuentas inactivas (sin login en 90 días)
      const lastActivity = user.updatedAt;
      const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceActivity > 90) {
        result.orphanedAccounts.push(user.id);
        result.actions.push({
          userId: user.id,
          action: 'deactivate',
          reason: `Sin actividad por ${Math.floor(daysSinceActivity)} días`,
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
    }, 'Revisión de accesos completada');

    return result;
  }

  /**
   * CC6.3: Revocar acceso de usuarios dados de baja.
   * Ejecutar cuando un empleado deja la organización.
   */
  async offboardUser(userId: string, performedBy: string) {
    await prisma.$transaction(async (tx) => {
      // 1. Desactivar cuenta
      await tx.user.update({
        where: { id: userId },
        data: { deletedAt: new Date() },
      });

      // 2. Revocar todas las sesiones activas
      await tx.session.deleteMany({
        where: { userId },
      });

      // 3. Revocar tokens de API
      // await tx.apiKey.updateMany({
      //   where: { userId },
      //   data: { revokedAt: new Date() },
      // });
    });

    logger.info({
      event: 'user_offboarded',
      userId,
      performedBy,
    }, 'Usuario dado de baja — acceso revocado');
  }
}
```

---

### 3. CC7 — Operaciones del Sistema (Monitoreo)

```typescript
// services/soc2-monitoring.service.ts

import pino from 'pino';

const logger = pino({ name: 'soc2-monitoring' });

/**
 * CC7.1: Detectar y monitorear anomalías y eventos de seguridad.
 * CC7.2: Monitorear componentes del sistema para detectar anomalías.
 * CC7.3: Evaluar eventos de seguridad para determinar si son incidentes.
 * CC7.4: Responder a incidentes de seguridad identificados.
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
  // Seguridad
  {
    name: 'Intentos de login fallidos excesivos',
    condition: 'failed_logins > 10 in 5min per IP',
    severity: 'critical',
    notificationChannels: ['slack:#security-alerts', 'pagerduty'],
    runbookUrl: 'https://wiki.internal/runbooks/brute-force',
  },
  {
    name: 'Acceso administrativo fuera de horario',
    condition: 'admin_access AND (hour < 7 OR hour > 22)',
    severity: 'warning',
    notificationChannels: ['slack:#security-alerts'],
    runbookUrl: 'https://wiki.internal/runbooks/off-hours-access',
  },
  {
    name: 'Cambio de configuración de seguridad',
    condition: 'security_config_changed',
    severity: 'info',
    notificationChannels: ['slack:#security-alerts', 'email:security-team'],
    runbookUrl: 'https://wiki.internal/runbooks/config-change',
  },
  // Disponibilidad
  {
    name: 'Tasa de errores elevada',
    condition: 'http_5xx_rate > 5% in 5min',
    severity: 'critical',
    notificationChannels: ['pagerduty', 'slack:#incidents'],
    runbookUrl: 'https://wiki.internal/runbooks/high-error-rate',
  },
  {
    name: 'Latencia elevada',
    condition: 'p99_latency > 2000ms in 5min',
    severity: 'warning',
    notificationChannels: ['slack:#incidents'],
    runbookUrl: 'https://wiki.internal/runbooks/high-latency',
  },
  {
    name: 'Uso de CPU elevado',
    condition: 'cpu_usage > 90% for 10min',
    severity: 'warning',
    notificationChannels: ['slack:#infrastructure'],
    runbookUrl: 'https://wiki.internal/runbooks/high-cpu',
  },
  // Integridad
  {
    name: 'Discrepancia en procesamiento',
    condition: 'processing_errors > 0',
    severity: 'critical',
    notificationChannels: ['slack:#incidents', 'pagerduty'],
    runbookUrl: 'https://wiki.internal/runbooks/processing-error',
  },
];

export class SOC2MonitoringService {
  /**
   * CC7.2: Recopilar métricas del sistema.
   */
  async collectMetrics(): Promise<SystemMetric[]> {
    return [
      {
        name: 'api_response_time_p99',
        value: 0, // En producción: obtener de Prometheus/Datadog
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
        threshold: { warning: 80, critical: 95 }, // % del pool
        timestamp: new Date(),
      },
    ];
  }

  /**
   * CC7.3: Evaluar métricas contra umbrales.
   */
  evaluateMetrics(metrics: SystemMetric[]): { alerts: string[] } {
    const alerts: string[] = [];

    for (const metric of metrics) {
      if (metric.value >= metric.threshold.critical) {
        alerts.push(`CRITICAL: ${metric.name} = ${metric.value}${metric.unit} (umbral: ${metric.threshold.critical})`);
        logger.error({
          event: 'metric_critical',
          metric: metric.name,
          value: metric.value,
          threshold: metric.threshold.critical,
        }, `Métrica crítica: ${metric.name}`);
      } else if (metric.value >= metric.threshold.warning) {
        alerts.push(`WARNING: ${metric.name} = ${metric.value}${metric.unit} (umbral: ${metric.threshold.warning})`);
        logger.warn({
          event: 'metric_warning',
          metric: metric.name,
          value: metric.value,
          threshold: metric.threshold.warning,
        }, `Métrica en alerta: ${metric.name}`);
      }
    }

    return { alerts };
  }
}
```

---

### 4. CC8 — Gestión de Cambios

```typescript
// services/change-management.service.ts

import pino from 'pino';

const logger = pino({ name: 'change-management' });

/**
 * CC8.1: Autorizar, diseñar, desarrollar, configurar, documentar,
 *        probar, aprobar e implementar cambios.
 * 
 * SOC 2 requiere un proceso formal de gestión de cambios:
 * - Todo cambio debe ser documentado
 * - Debe pasar por revisión de código (PR)
 * - Debe tener tests automatizados
 * - Debe ser aprobado antes del deploy
 * - Ambientes de testing separados de producción
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
  evidence?: string; // Link a test results, scan reports, etc.
}

// Pipeline de CI/CD con controles SOC 2
export const SOC2_CI_CD_PIPELINE = `
# .github/workflows/soc2-compliant-deploy.yml
name: SOC 2 Compliant Deployment

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # CC8.1 — Verificar calidad del código
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

  # CC8.1 — Escaneo de seguridad
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

  # CC8.1 — Tests de integración en staging
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

  # CC8.1 — Deploy a producción (requiere aprobación manual)
  deploy-production:
    needs: [integration-tests]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      # REQUIERE APROBACIÓN MANUAL — control SOC 2
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

### 5. Disponibilidad (A1) — SLA y Uptime

```typescript
// services/availability.service.ts

import pino from 'pino';

const logger = pino({ name: 'availability' });

/**
 * A1.1: Mantener availability según compromisos (SLAs).
 * A1.2: Controles ambientales para proteger contra desastres.
 * A1.3: Planificar recuperación ante desastres.
 */

interface SLADefinition {
  service: string;
  targetUptime: number;    // Porcentaje (e.g., 99.9)
  maxDowntimeMonthly: string; // Calculado del uptime
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
    service: 'API Principal',
    targetUptime: 99.9,        // 3 nueves
    maxDowntimeMonthly: '43.2 minutos',
    responseTime: { p50: 100, p95: 500, p99: 1000 },
    dataRetention: '7 años',
    backupRPO: '1 hora',
    backupRTO: '4 horas',
  },
  {
    service: 'Dashboard Web',
    targetUptime: 99.5,
    maxDowntimeMonthly: '3.6 horas',
    responseTime: { p50: 200, p95: 1000, p99: 2000 },
    dataRetention: '7 años',
    backupRPO: '4 horas',
    backupRTO: '8 horas',
  },
];

/**
 * Endpoint de status page.
 * SOC 2 requiere informar a los clientes sobre la disponibilidad.
 */
export async function getServiceStatus(): Promise<{
  status: 'operational' | 'degraded' | 'major_outage';
  services: { name: string; status: string; latency?: number }[];
  incidents: { title: string; status: string; startedAt: Date }[];
  uptime: { last30Days: number; last90Days: number };
}> {
  // Integrar con tu sistema de monitoreo real
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

### 6. Confidencialidad (C1) — Protección de Datos de Clientes

```typescript
// middleware/data-isolation.middleware.ts

import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino({ name: 'data-isolation' });

/**
 * C1.1: Identificar y mantener información confidencial.
 * C1.2: Destruir información confidencial cuando ya no es necesaria.
 * 
 * En SaaS multi-tenant, cada cliente (tenant) debe tener sus datos
 * completamente aislados de los demás.
 */

/**
 * Middleware de aislamiento de datos multi-tenant.
 * Asegura que cada request solo acceda a datos de su propio tenant.
 */
export function tenantIsolation(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    return res.status(403).json({
      error: 'Tenant no identificado',
      code: 'TENANT_REQUIRED',
    });
  }

  // Inyectar filtro de tenant en todas las queries
  // Usando Prisma middleware para aplicar automáticamente
  res.locals.tenantId = tenantId;

  logger.debug({
    event: 'tenant_context_set',
    tenantId,
    userId: req.user?.id,
    path: req.originalUrl,
  }, 'Contexto de tenant establecido');

  next();
}

/**
 * Prisma middleware para aislamiento de datos multi-tenant.
 * Se aplica automáticamente a TODAS las queries.
 */
export function createTenantPrismaMiddleware(tenantId: string) {
  return {
    // Aplicar filtro de tenantId automáticamente a toda query
    // Ejemplo conceptual — la implementación exacta depende de Prisma
    $allOperations: async ({ args, query }: any) => {
      // Inyectar where: { tenantId } en todas las operaciones
      if (args.where) {
        args.where.tenantId = tenantId;
      } else {
        args.where = { tenantId };
      }

      // Para create, asegurar que el tenantId se incluya
      if (args.data) {
        args.data.tenantId = tenantId;
      }

      return query(args);
    },
  };
}

/**
 * Schema Prisma para multi-tenancy.
 */
export const MULTI_TENANT_SCHEMA = `
// Todos los modelos que contienen datos de clientes DEBEN tener tenantId

model Organization {
  id          String @id @default(cuid())
  name        String
  plan        String @default("free")
  
  users       User[]
  projects    Project[]
  
  // Configuración de seguridad por tenant
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
  
  // Row-Level Security: todo dato tiene tenantId
  @@index([tenantId])
  @@map("projects")
}
`;
```

---

## Buenas Prácticas SOC 2

### ✅ HACER

1. **Política de contraseñas robusta** — min 12 caracteres, complejidad, rotación
2. **MFA obligatorio** para todos los usuarios internos
3. **Revisión de accesos** trimestral — desactivar cuentas inactivas
4. **Gestión de cambios formal** — PR reviews, aprobación, pipeline CI/CD
5. **Monitoreo y alertas** — métricas de seguridad, disponibilidad y rendimiento
6. **Aislamiento multi-tenant** — datos de clientes completamente separados
7. **Logs de auditoría** inmutables con retención mínima de 1 año
8. **Encriptación** en reposo (AES-256) y en tránsito (TLS 1.2+)
9. **Backups automatizados** con pruebas de restauración periódicas
10. **Status page pública** para informar sobre disponibilidad a clientes
11. **Pen-testing** anual y escaneos de vulnerabilidades regulares
12. **Offboarding** inmediato cuando un empleado deja la organización

### ❌ NO HACER

1. **NO** permitir deployments directos a producción sin aprobación
2. **NO** compartir credenciales entre empleados
3. **NO** ignorar las alertas de seguridad
4. **NO** almacenar secretos en el código fuente
5. **NO** omitir tests automatizados en el pipeline
6. **NO** dar acceso admin por defecto a nuevos empleados
7. **NO** mezclar datos de diferentes tenants sin aislamiento
8. **NO** desactivar logging en producción

---

## Checklist de Cumplimiento SOC 2

### Seguridad (CC — Obligatorio)
- [ ] Políticas de seguridad documentadas
- [ ] Control de acceso basado en roles (RBAC)
- [ ] MFA implementado
- [ ] Revisión de accesos periódica
- [ ] Logging y monitoreo de seguridad
- [ ] Gestión de incidentes documentada
- [ ] Gestión de cambios formal
- [ ] Escaneo de vulnerabilidades regular
- [ ] Encriptación de datos (reposo + tránsito)
- [ ] Onboarding/offboarding de empleados formalizado

### Disponibilidad (A)
- [ ] SLAs definidos y documentados
- [ ] Monitoreo de uptime y latencia
- [ ] Status page para clientes
- [ ] Plan de recuperación ante desastres
- [ ] Backups automatizados con pruebas de restauración
- [ ] Redundancia en componentes críticos
- [ ] Plan de capacidad documentado

### Integridad del Procesamiento (PI)
- [ ] Validación de entradas en todas las operaciones
- [ ] Verificación de integridad en procesamiento de datos
- [ ] Reconciliación automática de datos
- [ ] Monitoreo de errores de procesamiento

### Confidencialidad (C)
- [ ] Clasificación de datos implementada
- [ ] Aislamiento multi-tenant
- [ ] Encriptación de datos confidenciales
- [ ] NDAs con empleados y contratistas
- [ ] Política de retención y destrucción de datos

### Privacidad (P)
- [ ] Política de privacidad publicada
- [ ] Consentimiento para recolección de datos personales
- [ ] Mecanismo de acceso, corrección y eliminación de datos
- [ ] Notificación de brechas de privacidad

---

## Referencias y Recursos

- [AICPA SOC 2 Overview](https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome)
- [Trust Service Criteria (TSC)](https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/trustservicecriteria.html)
- [SOC 2 Compliance Guide (Vanta)](https://www.vanta.com/collection/soc-2)
- [SOC 2 Academy](https://www.schellman.com/soc-2-resource-center)
