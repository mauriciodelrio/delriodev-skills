---
name: governance-risk-and-compliance
description: >
  Índice maestro de gobernanza, riesgo y cumplimiento (GRC). Activa esta skill cuando
  el desarrollador trabaje en cualquier aspecto de cumplimiento normativo, protección de datos,
  seguridad de la información o auditoría de software. Redirige a la skill específica según
  la normativa aplicable.
---

# 🛡️ Gobernanza, Riesgo y Cumplimiento (GRC) — Índice Maestro

## Descripción General

Esta skill actúa como punto de entrada y enrutador para todas las normativas y estándares de seguridad implementados en este repositorio. Cada sub-skill contiene instrucciones detalladas, ejemplos de código en **Node.js/TypeScript** y checklists de cumplimiento.

## Cuándo Activar esta Skill

Activa esta skill cuando el contexto del desarrollo involucre **cualquiera** de los siguientes escenarios:

- Manejo de **datos personales** de usuarios (nombre, email, dirección IP, cookies, etc.)
- Procesamiento de **datos de salud** (historiales médicos, diagnósticos, recetas)
- Almacenamiento o transmisión de **datos de tarjetas de pago**
- Diseño de **arquitectura de seguridad** para aplicaciones web/API
- Auditorías de seguridad o preparación para **certificaciones**
- Implementación de **logging, monitoreo o respuesta a incidentes**
- Desarrollo de software que opera en **mercados regulados** (UE, EEUU, Brasil, etc.)
- Revisión de código enfocada en **vulnerabilidades de seguridad**

---

## 🎯 Guía de Activación de Sub-Skills (Triggers)

Usa la siguiente tabla para determinar **qué sub-skill invocar** según las palabras clave, contexto o tipo de tarea que el desarrollador solicita. Si múltiples skills aplican, invócalas todas.

### GDPR
- **Keywords**: GDPR, RGPD, datos personales UE, protección de datos Europa, consentimiento, derecho al olvido, derecho de acceso, rectificación, portabilidad, DPIA, DPO, bases legales, interés legítimo, Unión Europea, EEE, cookies, privacy policy EU
- **Activar cuando**: El código procesa datos de usuarios en la UE/EEE, implementa formularios de consentimiento para usuarios europeos, maneja cookies, implementa derechos del titular de datos según legislación europea, o configura transferencias internacionales de datos desde la UE

### HIPAA
- **Keywords**: HIPAA, PHI, información de salud, health data, datos médicos, paciente, ePHI, covered entity, business associate, BAA, healthcare, historia clínica, registro médico, diagnóstico, Protected Health Information, HITECH, de-identification
- **Activar cuando**: El software maneja datos de salud de pacientes en EEUU, integra con sistemas de salud (EHR/EMR), implementa portales de pacientes, o cualquier sistema que toque información de salud protegida

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
- **Activar cuando**: Se desarrolla un producto SaaS/Cloud para clientes B2B, se implementa gestión de cambios formal, revisiones periódicas de accesos, monitoreo de SLAs, aislamiento multi-tenant, o se prepara para una auditoría SOC 2

### OWASP-Top-10
- **Keywords**: OWASP, XSS, SQL injection, inyección, CSRF, SSRF, broken access control, autenticación, sanitización, validación de input, seguridad web, vulnerabilidad, helmet, CORS, rate limiting, Content Security Policy, CSP, session management, deserialización
- **Activar cuando**: Se escribe CUALQUIER endpoint HTTP, se procesa input de usuario, se implementa autenticación/autorización, se configura un servidor Express/Fastify, se renderizan datos dinámicos en frontend, se hacen fetch a URLs externas, o se revisa código por vulnerabilidades. **Esta skill debe activarse por defecto en todo desarrollo web.**

### CCPA-CPRA
- **Keywords**: CCPA, CPRA, California privacy, Do Not Sell, Do Not Share, opt-out, Global Privacy Control, GPC, consumer rights, datos personales California, right to know, right to delete, Sensitive Personal Information, SPI, CPPA, notice at collection
- **Activar cuando**: La aplicación tiene usuarios en California, implementa mecanismos de opt-out para venta/compartición de datos, detecta señales GPC del navegador, o gestiona solicitudes de derechos de consumidores californianos

### LGPD
- **Keywords**: LGPD, Lei Geral de Proteção de Dados, dados pessoais, Brasil, ANPD, consentimento, titular, encarregado, base legal, RIPD, tratamento de dados, proteção de dados Brasil, direitos do titular, portabilidade
- **Activar cuando**: El software procesa datos de personas en Brasil, implementa consentimiento según la LGPD (granular por finalidad), gestiona derechos del titular (Art. 18), elabora RIPD, o necesita notificar incidentes a la ANPD

---

## 📋 Mapa de Normativas y Skills

### Protección de Datos y Privacidad

| Skill | Normativa | Jurisdicción | Cuándo Usar |
|-------|-----------|--------------|-------------|
| [gdpr](./gdpr/SKILL.md) | Reglamento General de Protección de Datos | Unión Europea / EEE | Datos personales de ciudadanos UE, consentimiento, derecho al olvido |
| [ccpa-cpra](./ccpa-cpra/SKILL.md) | California Consumer Privacy Act / California Privacy Rights Act | California, EEUU | Datos personales de residentes de California, opt-out de venta de datos |
| [lgpd](./lgpd/SKILL.md) | Lei Geral de Proteção de Dados | Brasil | Datos personales de ciudadanos brasileños, base legal para tratamiento |

### Seguridad de la Información

| Skill | Estándar | Alcance | Cuándo Usar |
|-------|----------|---------|-------------|
| [iso-27001](./iso-27001/SKILL.md) | ISO/IEC 27001:2022 | Internacional | Sistema de gestión de seguridad de la información (SGSI), controles Anexo A |
| [nist-cybersec-framework](./nist-cybersec-framework/SKILL.md) | NIST CSF 2.0 | EEUU / Internacional | Framework Identify-Protect-Detect-Respond-Recover |
| [soc2](./soc2/SKILL.md) | SOC 2 Type II | EEUU / Internacional | Trust Service Criteria para SaaS y servicios cloud |

### Seguridad en Aplicaciones

| Skill | Estándar | Alcance | Cuándo Usar |
|-------|----------|---------|-------------|
| [owasp-top-10](./owasp-top-10/SKILL.md) | OWASP Top 10:2021 | Internacional | Vulnerabilidades web críticas: inyección, XSS, CSRF, broken auth |

### Industria Específica

| Skill | Normativa | Industria | Cuándo Usar |
|-------|-----------|-----------|-------------|
| [hipaa](./hipaa/SKILL.md) | Health Insurance Portability and Accountability Act | Salud (EEUU) | Datos de salud protegidos (PHI), registros médicos electrónicos |
| [pci-compliance](./pci-compliance/SKILL.md) | PCI DSS v4.0 | Pagos | Datos de tarjetas de crédito/débito, procesamiento de pagos |

---

## 🔀 Guía de Selección Rápida

```
¿Qué tipo de datos estás manejando?
│
├─ Datos personales (nombre, email, IP, cookies...)
│  ├─ ¿Usuarios en la UE? ──────────────→ GDPR
│  ├─ ¿Usuarios en California? ─────────→ CCPA-CPRA
│  ├─ ¿Usuarios en Brasil? ─────────────→ LGPD
│  └─ ¿Múltiples jurisdicciones? ──────→ Aplica TODAS las relevantes
│
├─ Datos de salud (PHI)
│  └─ ¿Sistema de salud en EEUU? ──────→ HIPAA
│
├─ Datos de tarjetas de pago
│  └─ ¿Procesas/almacenas datos PAN? ──→ PCI-compliance
│
├─ Arquitectura de seguridad general
│  ├─ ¿Necesitas certificación formal? ─→ ISO-27001
│  ├─ ¿Framework de ciberseguridad? ────→ NIST-Cybersec-framework
│  └─ ¿SaaS/Cloud service? ────────────→ SOC2
│
└─ Seguridad en código/aplicación
   └─ ¿Desarrollo web/API? ────────────→ OWASP-top-10
```

---

## 🏗️ Stack Tecnológico de Referencia

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

## 📐 Principios Transversales de Seguridad

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

## 🔗 Cómo Usar Estas Skills

1. **Identifica** qué normativas aplican a tu proyecto usando la guía de selección rápida
2. **Lee** cada skill relevante para entender los requisitos específicos
3. **Implementa** siguiendo los ejemplos de código y checklists
4. **Valida** con las checklists de cumplimiento de cada skill
5. **Combina** múltiples skills cuando tu proyecto opera en varias jurisdicciones

> **⚠️ Importante**: Estas skills son guías técnicas de implementación. Para cumplimiento legal completo, siempre consulta con un profesional legal especializado en la normativa correspondiente.
