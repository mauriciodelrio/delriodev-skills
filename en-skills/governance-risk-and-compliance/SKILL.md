---
name: governance-risk-and-compliance
description: >
  Master index for Governance, Risk and Compliance (GRC). Activate this skill when
  the developer works on any aspect of regulatory compliance, data protection,
  information security, or software auditing. Redirect to the specific skill based on
  the applicable regulation.
---

# 🛡️ Governance, Risk & Compliance (GRC) — Master Index

## General Description

This skill acts as the entry point and router for all security regulations and standards implemented in this repository. Each sub-skill contains detailed instructions, code examples in **Node.js/TypeScript**, and compliance checklists.

## When to Activate this Skill

Activate this skill when the development context involves **any** of the following scenarios:

- Handling **personal data** from users (name, email, IP address, cookies, etc.)
- Processing **health data** (medical records, diagnoses, prescriptions)
- Storing or transmitting **payment card data**
- Designing **security architecture** for web applications/APIs
- Security audits or preparation for **certifications**
- Implementing **logging, monitoring, or incident response**
- Developing software that operates in **regulated markets** (EU, US, Brazil, etc.)
- Code review focused on **security vulnerabilities**

---

## 🎯 Sub-Skill Activation Guide (Triggers)

Use the following table to determine **which sub-skill to invoke** based on the keywords, context, or type of task the developer requests. If multiple skills apply, invoke them all.

### GDPR
- **Keywords**: GDPR, RGPD, EU personal data, European data protection, consent, right to be forgotten, right of access, rectification, portability, DPIA, DPO, legal bases, legitimate interest, European Union, EEA, cookies, privacy policy EU
- **Activate when**: The code processes data from users in the EU/EEA, implements consent forms for European users, handles cookies, implements data subject rights under European legislation, or configures international data transfers from the EU

### HIPAA
- **Keywords**: HIPAA, PHI, health information, health data, medical data, patient, ePHI, covered entity, business associate, BAA, healthcare, medical history, medical record, diagnosis, Protected Health Information, HITECH, de-identification
- **Activate when**: The software handles patient health data in the US, integrates with health systems (EHR/EMR), implements patient portals, or any system that touches protected health information

### ISO-27001
- **Keywords**: ISO 27001, ISO 27002, ISMS, risk management, information classification, access control ABAC/RBAC, business continuity, Annex A, security certification, security policy, asset management, operational security
- **Activate when**: Designing the organization's security architecture, implementing advanced access controls, working on vulnerability management, backup/recovery, or preparing for a security certification

### NIST-CSF
- **Keywords**: NIST, CSF, cybersecurity framework, Govern, Identify, Protect, Detect, Respond, Recover, cyber risk management, threat detection, incident response, disaster recovery, security operations, SOC, SIEM
- **Activate when**: Implementing security monitoring, anomaly detection (brute force, impossible travel, injections), response playbooks, recovery plans, or asset inventory and risk assessment

### PCI-DSS
- **Keywords**: PCI, PCI DSS, credit card, debit card, payment, Stripe, payment processor, tokenization, PAN, CVV, cardholder data, CDE, card number, payment data, Luhn, payment form, checkout
- **Activate when**: The code touches payment card data, integrates with payment processors (Stripe, PayPal, etc.), implements checkout forms, or configures infrastructure that stores/transmits card data

### SOC2
- **Keywords**: SOC 2, SOC2, Trust Service Criteria, AICPA, SaaS compliance, availability, SLA, uptime, change management, access review, multi-tenant, confidentiality, processing integrity, SOC audit
- **Activate when**: Developing a SaaS/Cloud product for B2B customers, implementing formal change management, periodic access reviews, SLA monitoring, multi-tenant isolation, or preparing for a SOC 2 audit

### OWASP-Top-10
- **Keywords**: OWASP, XSS, SQL injection, injection, CSRF, SSRF, broken access control, authentication, sanitization, input validation, web security, vulnerability, helmet, CORS, rate limiting, Content Security Policy, CSP, session management, deserialization
- **Activate when**: Writing ANY HTTP endpoint, processing user input, implementing authentication/authorization, configuring an Express/Fastify server, rendering dynamic data on the frontend, fetching external URLs, or reviewing code for vulnerabilities. **This skill should be activated by default in all web development.**

### CCPA-CPRA
- **Keywords**: CCPA, CPRA, California privacy, Do Not Sell, Do Not Share, opt-out, Global Privacy Control, GPC, consumer rights, California personal data, right to know, right to delete, Sensitive Personal Information, SPI, CPPA, notice at collection
- **Activate when**: The application has users in California, implements opt-out mechanisms for data sale/sharing, detects browser GPC signals, or manages California consumer rights requests

### LGPD
- **Keywords**: LGPD, Lei Geral de Proteção de Dados, personal data, Brazil, ANPD, consent, data subject, DPO, legal basis, RIPD, data processing, Brazil data protection, data subject rights, portability
- **Activate when**: The software processes data of people in Brazil, implements consent per the LGPD (granular by purpose), manages data subject rights (Art. 18), prepares RIPD, or needs to notify incidents to the ANPD

---

## 📋 Regulations and Skills Map

### Data Protection and Privacy

| Skill | Regulation | Jurisdiction | When to Use |
|-------|-----------|--------------|-------------|
| [gdpr](./gdpr/SKILL.md) | General Data Protection Regulation | European Union / EEA | Personal data of EU citizens, consent, right to be forgotten |
| [ccpa-cpra](./ccpa-cpra/SKILL.md) | California Consumer Privacy Act / California Privacy Rights Act | California, USA | Personal data of California residents, opt-out of data sale |
| [lgpd](./lgpd/SKILL.md) | Lei Geral de Proteção de Dados | Brazil | Personal data of Brazilian citizens, legal basis for processing |

### Information Security

| Skill | Standard | Scope | When to Use |
|-------|----------|---------|-------------|
| [iso-27001](./iso-27001/SKILL.md) | ISO/IEC 27001:2022 | International | Information Security Management System (ISMS), Annex A controls |
| [nist-cybersec-framework](./nist-cybersec-framework/SKILL.md) | NIST CSF 2.0 | USA / International | Identify-Protect-Detect-Respond-Recover framework |
| [soc2](./soc2/SKILL.md) | SOC 2 Type II | USA / International | Trust Service Criteria for SaaS and cloud services |

### Application Security

| Skill | Standard | Scope | When to Use |
|-------|----------|---------|-------------|
| [owasp-top-10](./owasp-top-10/SKILL.md) | OWASP Top 10:2021 | International | Critical web vulnerabilities: injection, XSS, CSRF, broken auth |

### Industry-Specific

| Skill | Regulation | Industry | When to Use |
|-------|-----------|-----------|-------------|
| [hipaa](./hipaa/SKILL.md) | Health Insurance Portability and Accountability Act | Healthcare (USA) | Protected Health Information (PHI), electronic medical records |
| [pci-compliance](./pci-compliance/SKILL.md) | PCI DSS v4.0 | Payments | Credit/debit card data, payment processing |

---

## 🔀 Quick Selection Guide

```
What type of data are you handling?
│
├─ Personal data (name, email, IP, cookies...)
│  ├─ Users in the EU? ─────────────────→ GDPR
│  ├─ Users in California? ─────────────→ CCPA-CPRA
│  ├─ Users in Brazil? ─────────────────→ LGPD
│  └─ Multiple jurisdictions? ──────────→ Apply ALL relevant ones
│
├─ Health data (PHI)
│  └─ US healthcare system? ────────────→ HIPAA
│
├─ Payment card data
│  └─ Process/store PAN data? ──────────→ PCI-compliance
│
├─ General security architecture
│  ├─ Need formal certification? ───────→ ISO-27001
│  ├─ Cybersecurity framework? ─────────→ NIST-Cybersec-framework
│  └─ SaaS/Cloud service? ─────────────→ SOC2
│
└─ Code/application security
   └─ Web/API development? ────────────→ OWASP-top-10
```

---

## 🏗️ Reference Technology Stack

All skills use examples based on the following stack:

| Layer | Technology |
|------|------------|
| **Runtime** | Node.js (LTS) |
| **Language** | TypeScript (strict mode) |
| **API Framework** | Express / Fastify |
| **ORM** | Prisma |
| **Database** | PostgreSQL / MongoDB |
| **Authentication** | JWT + refresh tokens |
| **Logging** | Pino / Winston |
| **Validation** | Zod / Joi |
| **Testing** | Vitest / Jest |
| **CI/CD** | GitHub Actions |

---

## 📐 Cross-Cutting Security Principles

These principles apply to **ALL** regulations and must always be followed:

### 1. Defense in Depth
```typescript
// Multiple layers of validation — never trust a single one
// Layer 1: Edge validation (API Gateway / middleware)
// Layer 2: Controller validation (schema validation)
// Layer 3: Service validation (business rules)
// Layer 4: Database constraints
```

### 2. Principle of Least Privilege
```typescript
// ❌ BAD: Role with full access
const adminRole = { permissions: ['*'] };

// ✅ GOOD: Granular permissions per resource and action
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
// ❌ BAD: Insecure default configuration
const serverConfig = {
  cors: { origin: '*' },
  rateLimit: { enabled: false },
};

// ✅ GOOD: Secure by default, relax explicitly when necessary
const serverConfig = {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
    credentials: true,
  },
  rateLimit: {
    enabled: true,
    max: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  helmet: { enabled: true },
};
```

### 4. Fail Secure
```typescript
// ❌ BAD: If verification fails, allow access
function checkAccess(user: User, resource: Resource): boolean {
  try {
    return authService.verify(user, resource);
  } catch {
    return true; // DANGEROUS!
  }
}

// ✅ GOOD: If verification fails, deny access
function checkAccess(user: User, resource: Resource): boolean {
  try {
    return authService.verify(user, resource);
  } catch (error) {
    logger.error({ error, userId: user.id, resource: resource.id }, 'Access verification error');
    return false; // Deny by default
  }
}
```

### 5. Structured Logging for Auditing
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: ['req.headers.authorization', 'body.password', 'body.creditCard', '*.ssn'],
    censor: '[REDACTED]',
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Usage in audit events
logger.info({
  event: 'data_access',
  actor: { id: user.id, role: user.role },
  resource: { type: 'patient_record', id: recordId },
  action: 'read',
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date().toISOString(),
}, 'Patient record access');
```

---

## 🔗 How to Use These Skills

1. **Identify** which regulations apply to your project using the quick selection guide
2. **Read** each relevant skill to understand the specific requirements
3. **Implement** following the code examples and checklists
4. **Validate** with each skill's compliance checklists
5. **Combine** multiple skills when your project operates across multiple jurisdictions

> **⚠️ Important**: These skills are technical implementation guides. For complete legal compliance, always consult with a legal professional specialized in the corresponding regulation.
