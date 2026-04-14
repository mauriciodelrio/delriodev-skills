---
name: governance-risk-and-compliance
description: >
  Usa este skill como punto de entrada cuando el software requiera cumplimiento
  normativo, protección de datos, seguridad de la información o auditoría.
  Enruta a la sub-skill específica según la normativa aplicable. Todas las
  sub-skills se aplican independientemente de la ubicación geográfica.
---

# Gobernanza, Riesgo y Cumplimiento (GRC) — Índice Maestro

Esta skill actúa como enrutador para todas las normativas y estándares de seguridad. Cada sub-skill contiene instrucciones detalladas, templates de código Node.js/TypeScript y checklists de cumplimiento. Todas las sub-skills deben aplicarse como estándares de seguridad independientemente de la ubicación geográfica de los usuarios.

## Guía de Activación de Sub-Skills (Triggers)

Usa la siguiente tabla para determinar **qué sub-skill invocar** según las palabras clave, contexto o tipo de tarea que el desarrollador solicita. Si múltiples skills aplican, invócalas todas.

### GDPR
- **Keywords**: GDPR, RGPD, datos personales, protección de datos, consentimiento, derecho al olvido, derecho de acceso, rectificación, portabilidad, DPIA, DPO, bases legales, interés legítimo, cookies, privacy policy
- **Activar cuando**: El código procesa datos personales de usuarios, implementa formularios de consentimiento, maneja cookies, implementa derechos del titular de datos, o configura transferencias internacionales de datos

### HIPAA
- **Keywords**: HIPAA, PHI, información de salud, health data, datos médicos, paciente, ePHI, covered entity, business associate, BAA, healthcare, historia clínica, registro médico, diagnóstico, Protected Health Information, HITECH, de-identification
- **Activar cuando**: El software maneja datos de salud de pacientes, integra con sistemas de salud (EHR/EMR), implementa portales de pacientes, o cualquier sistema que toque información de salud protegida

### ISO-27001
- **Keywords**: ISO 27001, ISO 27002, SGSI, ISMS, gestión de riesgos, clasificación de información, control de acceso ABAC/RBAC, continuidad del negocio, Anexo A, certificación de seguridad, política de seguridad, gestión de activos, seguridad operacional
- **Activar cuando**: Se diseña la arquitectura de seguridad de la organización, se implementan controles de acceso avanzados, se trabaja en gestión de vulnerabilidades, backup/recovery, o se prepara una certificación de seguridad

### NIST-CSF
- **Keywords**: NIST, CSF, cybersecurity framework, Govern, Identify, Protect, Detect, Respond, Recover, gestión de riesgos cibernéticos, detección de amenazas, respuesta a incidentes, recuperación de desastres, threat detection, incident response, security operations, SOC, SIEM
- **Activar cuando**: Se implementa monitoreo de seguridad, detección de anomalías (brute force, impossible travel, inyecciones), playbooks de respuesta, planes de recuperación, o inventario de activos y evaluación de riesgos

### PCI-DSS
- **Keywords**: PCI, PCI DSS, tarjeta de crédito, tarjeta de débito, payment, pago, Stripe, procesador de pagos, tokenización, PAN, CVV, cardholder data, CDE, número de tarjeta, datos de pago, Luhn, payment form, checkout
- **Activar cuando**: El código toca datos de tarjetas de pago, integra con procesadores de pago (Stripe, PayPal, etc.), implementa formularios de checkout, o configura infraestructura que almacena/transmite datos de tarjetas

### SOC2
- **Keywords**: SOC 2, SOC2, Trust Service Criteria, AICPA, SaaS compliance, disponibilidad, SLA, uptime, change management, gestión de cambios, access review, revisión de accesos, multi-tenant, confidencialidad, integridad del procesamiento, auditoría SOC
- **Activar cuando**: Se desarrolla un producto SaaS/Cloud, se implementa gestión de cambios formal, revisiones periódicas de accesos, monitoreo de SLAs, aislamiento multi-tenant, o se prepara para una auditoría SOC 2

### OWASP-Top-10
- **Keywords**: OWASP, XSS, SQL injection, inyección, CSRF, SSRF, broken access control, autenticación, sanitización, validación de input, seguridad web, vulnerabilidad, helmet, CORS, rate limiting, Content Security Policy, CSP, session management, deserialización
- **Activar cuando**: Se escribe CUALQUIER endpoint HTTP, se procesa input de usuario, se implementa autenticación/autorización, se configura un servidor Express/Fastify, se renderizan datos dinámicos en frontend, se hacen fetch a URLs externas, o se revisa código por vulnerabilidades. Esta skill debe activarse por defecto en todo desarrollo web.

### CCPA-CPRA
- **Keywords**: CCPA, CPRA, Do Not Sell, Do Not Share, opt-out, Global Privacy Control, GPC, consumer rights, right to know, right to delete, Sensitive Personal Information, SPI, notice at collection
- **Activar cuando**: La aplicación implementa mecanismos de opt-out para venta/compartición de datos, detecta señales GPC del navegador, o gestiona solicitudes de derechos de consumidores

### LGPD
- **Keywords**: LGPD, Lei Geral de Proteção de Dados, dados pessoais, ANPD, consentimento, titular, encarregado, base legal, RIPD, tratamento de dados, proteção de dados, direitos do titular, portabilidade
- **Activar cuando**: El software procesa datos personales, implementa consentimiento granular por finalidad, gestiona derechos del titular (Art. 18), elabora RIPD, o necesita notificar incidentes a la autoridad de protección de datos

---

## Mapa de Normativas y Skills

### Protección de Datos y Privacidad

| Skill | Normativa | Cuándo Usar |
|-------|-----------|-------------|
| [gdpr](../gdpr/SKILL.md) | Reglamento General de Protección de Datos | Datos personales, consentimiento, derechos del titular |
| [ccpa-cpra](../ccpa-cpra/SKILL.md) | California Consumer Privacy Act / CPRA | Opt-out de venta/compartición de datos, señales GPC |
| [lgpd](../lgpd/SKILL.md) | Lei Geral de Proteção de Dados | Consentimiento granular por finalidad, derechos del titular |

### Seguridad de la Información

| Skill | Estándar | Cuándo Usar |
|-------|----------|-------------|
| [iso-27001](../iso-27001/SKILL.md) | ISO/IEC 27001:2022 | SGSI, controles Anexo A, clasificación de información |
| [nist-cybersec-framework](../nist-cybersec-framework/SKILL.md) | NIST CSF 2.0 | Framework Identify-Protect-Detect-Respond-Recover |
| [soc2](../soc2/SKILL.md) | SOC 2 Type II | Trust Service Criteria para SaaS y servicios cloud |

### Seguridad en Aplicaciones

| Skill | Estándar | Cuándo Usar |
|-------|----------|-------------|
| [owasp-top-10](../owasp-top-10/SKILL.md) | OWASP Top 10:2021 | Vulnerabilidades web: inyección, XSS, CSRF, broken auth |

### Industria Específica

| Skill | Normativa | Cuándo Usar |
|-------|-----------|-------------|
| [hipaa](../hipaa/SKILL.md) | HIPAA | Datos de salud protegidos (PHI), registros médicos |
| [pci-compliance](../pci-compliance/SKILL.md) | PCI DSS v4.0 | Datos de tarjetas de pago, tokenización, procesamiento de pagos |

---

## Guía de Selección Rápida

```
¿Qué tipo de datos estás manejando?
│
├─ Datos personales (nombre, email, IP, cookies...)
│  ├─ Consentimiento, derechos del titular ────→ GDPR
│  ├─ Opt-out de venta/compartición, GPC ──────→ CCPA-CPRA
│  ├─ Consentimiento granular por finalidad ───→ LGPD
│  └─ Múltiples normativas aplican ────────────→ Aplica TODAS las relevantes
│
├─ Datos de salud (PHI)
│  └─ Registros médicos, diagnósticos ─────────→ HIPAA
│
├─ Datos de tarjetas de pago
│  └─ Procesas/almacenas datos PAN ────────────→ PCI-compliance
│
├─ Arquitectura de seguridad general
│  ├─ Certificación formal / SGSI ─────────────→ ISO-27001
│  ├─ Framework de ciberseguridad ─────────────→ NIST-Cybersec-framework
│  └─ SaaS/Cloud service ──────────────────────→ SOC2
│
└─ Seguridad en código/aplicación
   └─ Desarrollo web/API ──────────────────────→ OWASP-top-10
```

---

## Stack Tecnológico de Referencia

Todas las skills utilizan ejemplos basados en el siguiente stack:

| Capa | Tecnología |
|------|------------|
| **Runtime** | Node.js (LTS) |
| **Lenguaje** | TypeScript (strict mode) |
| **Framework API** | Express / Fastify |
| **ORM** | Prisma |
| **Base de Datos** | PostgreSQL / MongoDB |
| **Autenticación** | JWT + refresh tokens |
| **Logging** | Pino / Winston |
| **Validación** | Zod / Joi |
| **Testing** | Vitest / Jest |
| **CI/CD** | GitHub Actions |

---

## Principios Transversales de Seguridad

Estos principios aplican a **TODAS** las normativas y deben seguirse siempre:

### 1. Defensa en Profundidad
```typescript
// Múltiples capas de validación - nunca confíes en una sola
// Capa 1: Validación en el edge (API Gateway / middleware)
// Capa 2: Validación en el controlador (schema validation)
// Capa 3: Validación en el servicio (business rules)
// Capa 4: Constraints en la base de datos
```

### 2. Principio de Mínimo Privilegio
```typescript
// ❌ MAL: Rol con acceso total
const adminRole = { permissions: ['*'] };

// ✅ BIEN: Permisos granulares por recurso y acción
const analystRole = {
  permissions: [
    'reports:read',
    'dashboards:read',
    'exports:create',
  ],
};
```

### 3. Secure by Default
```typescript
// ❌ MAL: Configuración insegura por defecto
const serverConfig = {
  cors: { origin: '*' },
  rateLimit: { enabled: false },
};

// ✅ BIEN: Seguro por defecto, relajar explícitamente cuando sea necesario
const serverConfig = {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
    credentials: true,
  },
  rateLimit: {
    enabled: true,
    max: 100,
    windowMs: 15 * 60 * 1000, // 15 minutos
  },
  helmet: { enabled: true },
};
```

### 4. Fail Secure
```typescript
// ❌ MAL: Si falla la verificación, permitir acceso
function checkAccess(user: User, resource: Resource): boolean {
  try {
    return authService.verify(user, resource);
  } catch {
    return true; // ¡PELIGROSO!
  }
}

// ✅ BIEN: Si falla la verificación, denegar acceso
function checkAccess(user: User, resource: Resource): boolean {
  try {
    return authService.verify(user, resource);
  } catch (error) {
    logger.error({ error, userId: user.id, resource: resource.id }, 'Error en verificación de acceso');
    return false; // Denegar por defecto
  }
}
```

### 5. Logging Estructurado para Auditoría
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: ['req.headers.authorization', 'body.password', 'body.creditCard', '*.ssn'],
    censor: '[REDACTADO]',
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Uso en eventos de auditoría
logger.info({
  event: 'data_access',
  actor: { id: user.id, role: user.role },
  resource: { type: 'patient_record', id: recordId },
  action: 'read',
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date().toISOString(),
}, 'Acceso a registro de paciente');
```

---

## Flujo de trabajo del agente

1. Identificar qué tipo de datos maneja el software usando la guía de selección rápida.
2. Activar TODAS las sub-skills relevantes según los triggers — si múltiples normativas aplican, invocarlas todas.
3. Implementar siguiendo los templates de código y checklists de cada sub-skill.
4. Aplicar los principios transversales de seguridad (defensa en profundidad, mínimo privilegio, secure by default, fail secure, logging estructurado) en toda implementación.
5. Validar con las checklists de cumplimiento de cada sub-skill antes de desplegar.
