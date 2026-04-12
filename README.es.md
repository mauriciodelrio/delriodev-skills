# 🧠 Skills Repository

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENCE)
[![npm](https://img.shields.io/npm/v/delriodev-skills)](https://www.npmjs.com/package/delriodev-skills)
[![Sponsor](https://img.shields.io/badge/Sponsor-💖-pink)](FUNDING.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Repositorio de **skills** para GitHub Copilot con instrucciones detalladas para desarrollo de software, seguridad y cumplimiento normativo.

Todas las skills están en **español** con ejemplos de código en **TypeScript**.

---

## Estructura

```
es-skills/
├── software/
│   ├── frontend/
│   │   ├── SKILL.md                            ← Índice orquestador frontend
│   │   ├── project-structure/SKILL.md          ← Estructura de proyecto
│   │   ├── component-patterns/SKILL.md         ← Patrones de componentes
│   │   ├── design-system-build-components-rules/SKILL.md ← Design System
│   │   ├── react-best-practices/SKILL.md       ← React 19+
│   │   ├── state-management-rules/SKILL.md     ← Zustand, Jotai, Signals
│   │   ├── rendering-strategies/SKILL.md       ← SSR, SSG, RSC, PPR
│   │   ├── nextjs-best-practices/SKILL.md      ← Next.js 15+ App Router
│   │   ├── routing-rules/SKILL.md              ← Rutas y navegación
│   │   ├── css-rules/SKILL.md                  ← Tailwind, CSS Modules, MUI
│   │   ├── a11y-rules/SKILL.md                 ← Accesibilidad WCAG
│   │   ├── animations-and-transitions/SKILL.md ← Framer Motion, CSS
│   │   ├── i18n-rules/SKILL.md                 ← Internacionalización
│   │   ├── seo-rules/SKILL.md                  ← SEO y Core Web Vitals
│   │   ├── fetching-rules/SKILL.md             ← TanStack Query, SWR
│   │   ├── forms-and-validation-rules/SKILL.md ← React Hook Form + Zod
│   │   ├── code-quality-rules/SKILL.md         ← ESLint, Prettier, Biome
│   │   ├── testing-rules/SKILL.md              ← Vitest, RTL, Playwright
│   │   ├── performance-rules/SKILL.md          ← Rendimiento y métricas
│   │   ├── package-management-rules/SKILL.md   ← pnpm
│   │   ├── monorepo-and-tooling/SKILL.md       ← Turborepo
│   │   ├── security-rules/SKILL.md             ← XSS, CSP, tokens
│   │   └── error-handling-rules/SKILL.md       ← Error Boundaries, Sentry
│   │
│   ├── architecture/
│   │   ├── SKILL.md                            ← Índice orquestador (discovery → propuesta)
│   │   ├── compute/SKILL.md                    ← Lambda, ECS, Vercel, EC2
│   │   ├── databases/SKILL.md                  ← RDS, DynamoDB, MongoDB, Redis
│   │   ├── storage-and-cdn/SKILL.md            ← S3, CloudFront, media
│   │   ├── networking-and-security/SKILL.md    ← VPC, WAF, IAM, secrets
│   │   ├── messaging-and-events/SKILL.md       ← SQS, SNS, EventBridge
│   │   ├── observability/SKILL.md              ← CloudWatch, Sentry, tracing
│   │   └── cost-and-scaling/SKILL.md           ← Costos, auto-scaling, IaC
│   │
│   ├── backend/
│   │   ├── SKILL.md                            ← Índice orquestador backend
│   │   ├── project-structure/SKILL.md          ← Carpetas, modules, layers, DI
│   │   ├── api-design/SKILL.md                 ← REST conventions, status codes, OpenAPI
│   │   ├── auth/SKILL.md                       ← JWT, OAuth2, RBAC, password hashing
│   │   ├── request-pipeline/SKILL.md           ← Middleware, guards, interceptors, CORS
│   │   ├── data-validation/SKILL.md            ← Zod, class-validator, DTOs, sanitización
│   │   ├── error-handling/SKILL.md             ← Error classes, global handler, shutdown
│   │   ├── database-patterns/SKILL.md          ← Prisma, Drizzle, migrations, transactions
│   │   ├── caching/SKILL.md                    ← Redis patterns, TTL, invalidation
│   │   ├── background-jobs/SKILL.md            ← BullMQ, workers, scheduling, DLQ
│   │   ├── testing/SKILL.md                    ← Unit, integration, supertest, fixtures
│   │   ├── security/SKILL.md                   ← Helmet, OWASP, CSRF, audit
│   │   ├── logging/SKILL.md                    ← Pino, structured logging, health checks
│   │   ├── real-time/SKILL.md                  ← WebSocket, SSE, Socket.IO, scaling
│   │   ├── file-handling/SKILL.md              ← Uploads, streaming, presigned URLs
│   │   ├── database-design/SKILL.md            ← Modelado, relaciones, índices, naming
│   │   └── api-consumption/SKILL.md            ← Consumo APIs externas, retry, webhooks
│   │
│   ├── docker/SKILL.md                         ← Dockerfiles, compose, dev containers
│   ├── typescript-patterns/SKILL.md            ← Generics, utility types, branded types
│   ├── deploy-pipelines/SKILL.md               ← GitHub Actions deploy, Vercel, AWS, rollback
│   ├── git-usage/SKILL.md                      ← Conventional commits, Husky
│   ├── clean-code-principles/SKILL.md          ← SOLID, DRY, KISS
│   ├── basic-workflows/SKILL.md                ← GitHub Actions CI/CD
│   └── scripting/SKILL.md                      ← Bash/Shell scripting
│
├── agent-workflow/
│   ├── SKILL.md                                ← Índice orquestador (flujo del agente)
│   ├── docs-structure/SKILL.md                 ← Convención carpeta .docs/
│   ├── requirements-format/SKILL.md            ← Features/US: cómo escribirlas y leerlas
│   ├── iteration-rules/SKILL.md                ← Descomposición, ejecución, DoD
│   ├── project-resumption/SKILL.md             ← Protocolo de re-onboarding
│   └── project-documentation/SKILL.md          ← README discipline, docs públicas
│
└── governance-risk-and-compliance/
    ├── SKILL.md                  ← Índice maestro (enrutador)
    ├── gdpr/SKILL.md             ← Protección de datos — UE
    ├── hipaa/SKILL.md            ← Datos de salud — EEUU
    ├── iso-27001/SKILL.md        ← SGSI
    ├── nist-cybersec-framework/SKILL.md ← NIST CSF 2.0
    ├── pci-compliance/SKILL.md   ← PCI DSS
    ├── soc2/SKILL.md             ← SOC 2
    ├── owasp-top-10/SKILL.md     ← OWASP Top 10
    ├── ccpa-cpra/SKILL.md        ← CCPA/CPRA — California
    └── lgpd/SKILL.md             ← LGPD — Brasil
```

---

## Frontend Skills (22 skills)

Stack: React 19+ · Next.js 15+ App Router · TypeScript strict · Tailwind CSS 4+ · Material UI 6+ · Vitest · Playwright · pnpm · Turborepo

| Capa | Skills |
|------|--------|
| **Arquitectura** | project-structure · component-patterns · design-system-build-components-rules |
| **React / Rendering** | react-best-practices · state-management-rules · rendering-strategies |
| **Next.js / Routing** | nextjs-best-practices · routing-rules |
| **UI / UX** | css-rules · a11y-rules · animations-and-transitions · i18n-rules · seo-rules |
| **Data / Formularios** | fetching-rules · forms-and-validation-rules |
| **Calidad / Seguridad** | code-quality-rules · testing-rules · performance-rules · security-rules · error-handling-rules |
| **Infraestructura** | package-management-rules · monorepo-and-tooling |

---

## Architecture Skills (7 sub-skills + index)

Framework de decisiones arquitectónicas. NO genera código de inmediato — primero interroga sobre negocio, escala, presupuesto y equipo, luego propone con justificación y pide confirmación.

Foco: AWS + Vercel · Presupuesto como constraint · Todo situacional · IaC recomendada según contexto

| Sub-skill | Alcance |
|-----------|---------|
| **compute** | Lambda, ECS Fargate, Vercel, EC2 — decisión por escala, latencia, costo |
| **databases** | PostgreSQL (RDS), DynamoDB, MongoDB Atlas, Redis — SQL vs NoSQL |
| **storage-and-cdn** | S3, CloudFront, presigned uploads, procesamiento de imágenes |
| **networking-and-security** | VPC, security groups, WAF, IAM, secrets, SSL/TLS, OIDC |
| **messaging-and-events** | SQS, SNS, EventBridge, WebSockets, patrones event-driven |
| **observability** | CloudWatch, Sentry, Datadog, structured logging, alerting |
| **cost-and-scaling** | Estimación por tier, Savings Plans, auto-scaling, AWS Budgets |

---

## Backend Skills (16 sub-skills + index)

Stack: Node.js 20+ · NestJS / Express · TypeScript strict · Prisma / Drizzle · Zod · BullMQ · Redis · Pino · Vitest · pnpm

Enfocado en CÓMO implementar en código (qué servicio cloud usar → architecture/).

| Capa | Skills |
|------|--------|
| **Estructura** | project-structure |
| **API** | api-design · request-pipeline · data-validation |
| **Auth** | auth |
| **Datos** | database-patterns · caching |
| **Errores / Logs** | error-handling · logging |
| **Background** | background-jobs |
| **Calidad / Seguridad** | testing · security |
| **Real-time / Archivos** | real-time · file-handling |
| **Diseño / Integración** | database-design · api-consumption |

---

## Software General Skills

| Skill | Alcance |
|-------|---------|
| **git-usage** | Conventional commits, Husky, branch naming, rebase, PR template |
| **clean-code-principles** | SOLID, DRY, KISS, guard clauses, JSDoc, immutability |
| **basic-workflows** | GitHub Actions CI (lint, test, build), CodeQL, Dependabot, CODEOWNERS |
| **scripting** | Bash/Shell: estructura .sh, sed/awk/grep, CLI creation, traps |
| **docker** | Dockerfiles multi-stage, docker-compose, dev containers, optimización |
| **typescript-patterns** | Generics, utility types, discriminated unions, branded types, satisfies |
| **deploy-pipelines** | GitHub Actions deploy, Vercel, AWS (SST), preview envs, rollback |

---

## Agent Workflow Skills (5 sub-skills + index)

Protocolo de trabajo del agente dentro de cualquier proyecto. Define cómo recibe features, descompone tareas, documenta progreso, y retoma proyectos sin contexto. Centrado en la carpeta `.docs/` como contrato entre desarrollador y agente.

| Sub-skill | Responsabilidad |
|-----------|----------------|
| **docs-structure** | Convención de `.docs/` — sub-carpetas features, brainstorming, rules, context, memory |
| **requirements-format** | Formato de feature.md (overview, goals, A/C, tech notes), flujo brainstorming → feature, protocolo de clarificación |
| **iteration-rules** | Descomposición en tareas, checkpoints de validación, regla de no-drift, Definition of Done, actualización de context y memory |
| **project-resumption** | Protocolo de onboarding/re-onboarding — qué leer, en qué orden, cómo sintetizar antes de actuar |
| **project-documentation** | README discipline (1 solo, conciso, en inglés), docs técnicas en herramientas especializadas (Swagger, Storybook) |

---

## GRC Skills (9 skills)

| Skill | Normativa | Región |
|-------|-----------|--------|
| **GDPR** | Protección de datos | 🇪🇺 UE |
| **HIPAA** | Datos de salud | 🇺🇸 EEUU |
| **ISO 27001** | SGSI | 🌍 Global |
| **NIST CSF** | Cybersecurity Framework 2.0 | 🌍 Global |
| **PCI DSS** | Seguridad de tarjetas de pago | 🌍 Global |
| **SOC 2** | Trust Service Criteria | 🌍 Global |
| **OWASP Top 10** | Vulnerabilidades web | 🌍 Global |
| **CCPA/CPRA** | Privacidad del consumidor | 🇺🇸 California |
| **LGPD** | Protección de datos | 🇧🇷 Brasil |

---

## Uso

Cada `SKILL.md` tiene un frontmatter YAML con `name` y `description` que permite a GitHub Copilot activar la skill automáticamente cuando el contexto del desarrollo lo requiera.

Para activación manual, referencia la skill relevante desde tu prompt o configúrala en tu archivo `.github/copilot-instructions.md`.