# 🧠 Skills Repository

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENCE)
[![npm](https://img.shields.io/npm/v/copilot-skills)](https://www.npmjs.com/package/copilot-skills)
[![Sponsor](https://img.shields.io/badge/Sponsor-💖-pink)](FUNDING.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Repository of **skills** for GitHub Copilot with detailed instructions for software development, security, and regulatory compliance.

All skills are in **English** with code examples in **TypeScript**.

---

## Structure

```
en-skills/
├── software/
│   ├── frontend/
│   │   ├── SKILL.md                            ← Frontend orchestrator index
│   │   ├── project-structure/SKILL.md          ← Project structure
│   │   ├── component-patterns/SKILL.md         ← Component patterns
│   │   ├── design-system-build-components-rules/SKILL.md ← Design System
│   │   ├── react-best-practices/SKILL.md       ← React 19+
│   │   ├── state-management-rules/SKILL.md     ← Zustand, Jotai, Signals
│   │   ├── rendering-strategies/SKILL.md       ← SSR, SSG, RSC, PPR
│   │   ├── nextjs-best-practices/SKILL.md      ← Next.js 15+ App Router
│   │   ├── routing-rules/SKILL.md              ← Routes and navigation
│   │   ├── css-rules/SKILL.md                  ← Tailwind, CSS Modules, MUI
│   │   ├── a11y-rules/SKILL.md                 ← WCAG Accessibility
│   │   ├── animations-and-transitions/SKILL.md ← Framer Motion, CSS
│   │   ├── i18n-rules/SKILL.md                 ← Internationalization
│   │   ├── seo-rules/SKILL.md                  ← SEO and Core Web Vitals
│   │   ├── fetching-rules/SKILL.md             ← TanStack Query, SWR
│   │   ├── forms-and-validation-rules/SKILL.md ← React Hook Form + Zod
│   │   ├── code-quality-rules/SKILL.md         ← ESLint, Prettier, Biome
│   │   ├── testing-rules/SKILL.md              ← Vitest, RTL, Playwright
│   │   ├── performance-rules/SKILL.md          ← Performance and metrics
│   │   ├── package-management-rules/SKILL.md   ← pnpm
│   │   ├── monorepo-and-tooling/SKILL.md       ← Turborepo
│   │   ├── security-rules/SKILL.md             ← XSS, CSP, tokens
│   │   └── error-handling-rules/SKILL.md       ← Error Boundaries, Sentry
│   │
│   ├── architecture/
│   │   ├── SKILL.md                            ← Orchestrator index (discovery → proposal)
│   │   ├── compute/SKILL.md                    ← Lambda, ECS, Vercel, EC2
│   │   ├── databases/SKILL.md                  ← RDS, DynamoDB, MongoDB, Redis
│   │   ├── storage-and-cdn/SKILL.md            ← S3, CloudFront, media
│   │   ├── networking-and-security/SKILL.md    ← VPC, WAF, IAM, secrets
│   │   ├── messaging-and-events/SKILL.md       ← SQS, SNS, EventBridge
│   │   ├── observability/SKILL.md              ← CloudWatch, Sentry, tracing
│   │   └── cost-and-scaling/SKILL.md           ← Costs, auto-scaling, IaC
│   │
│   ├── backend/
│   │   ├── SKILL.md                            ← Backend orchestrator index
│   │   ├── project-structure/SKILL.md          ← Folders, modules, layers, DI
│   │   ├── api-design/SKILL.md                 ← REST conventions, status codes, OpenAPI
│   │   ├── auth/SKILL.md                       ← JWT, OAuth2, RBAC, password hashing
│   │   ├── request-pipeline/SKILL.md           ← Middleware, guards, interceptors, CORS
│   │   ├── data-validation/SKILL.md            ← Zod, class-validator, DTOs, sanitization
│   │   ├── error-handling/SKILL.md             ← Error classes, global handler, shutdown
│   │   ├── database-patterns/SKILL.md          ← Prisma, Drizzle, migrations, transactions
│   │   ├── caching/SKILL.md                    ← Redis patterns, TTL, invalidation
│   │   ├── background-jobs/SKILL.md            ← BullMQ, workers, scheduling, DLQ
│   │   ├── testing/SKILL.md                    ← Unit, integration, supertest, fixtures
│   │   ├── security/SKILL.md                   ← Helmet, OWASP, CSRF, audit
│   │   ├── logging/SKILL.md                    ← Pino, structured logging, health checks
│   │   ├── real-time/SKILL.md                  ← WebSocket, SSE, Socket.IO, scaling
│   │   ├── file-handling/SKILL.md              ← Uploads, streaming, presigned URLs
│   │   ├── database-design/SKILL.md            ← Modeling, relations, indices, naming
│   │   └── api-consumption/SKILL.md            ← External API consumption, retry, webhooks
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
│   ├── SKILL.md                                ← Orchestrator index (agent workflow)
│   ├── docs-structure/SKILL.md                 ← .docs/ folder convention
│   ├── requirements-format/SKILL.md            ← Features/US: how to write and read them
│   ├── iteration-rules/SKILL.md                ← Decomposition, execution, DoD
│   ├── project-resumption/SKILL.md             ← Re-onboarding protocol
│   └── project-documentation/SKILL.md          ← README discipline, public docs
│
└── governance-risk-and-compliance/
    ├── SKILL.md                  ← Master index (router)
    ├── gdpr/SKILL.md             ← Data protection — EU
    ├── hipaa/SKILL.md            ← Health data — USA
    ├── iso-27001/SKILL.md        ← ISMS
    ├── nist-cybersec-framework/SKILL.md ← NIST CSF 2.0
    ├── pci-compliance/SKILL.md   ← PCI DSS
    ├── soc2/SKILL.md             ← SOC 2
    ├── owasp-top-10/SKILL.md     ← OWASP Top 10
    ├── ccpa-cpra/SKILL.md        ← CCPA/CPRA — California
    └── lgpd/SKILL.md             ← LGPD — Brazil
```

---

## Frontend Skills (22 skills)

Stack: React 19+ · Next.js 15+ App Router · TypeScript strict · Tailwind CSS 4+ · Material UI 6+ · Vitest · Playwright · pnpm · Turborepo

| Layer | Skills |
|-------|--------|
| **Architecture** | project-structure · component-patterns · design-system-build-components-rules |
| **React / Rendering** | react-best-practices · state-management-rules · rendering-strategies |
| **Next.js / Routing** | nextjs-best-practices · routing-rules |
| **UI / UX** | css-rules · a11y-rules · animations-and-transitions · i18n-rules · seo-rules |
| **Data / Forms** | fetching-rules · forms-and-validation-rules |
| **Quality / Security** | code-quality-rules · testing-rules · performance-rules · security-rules · error-handling-rules |
| **Infrastructure** | package-management-rules · monorepo-and-tooling |

---

## Architecture Skills (7 sub-skills + index)

Architectural decision framework. Does NOT generate code immediately — first asks about business, scale, budget, and team, then proposes with justification and asks for confirmation.

Focus: AWS + Vercel · Budget as constraint · Everything situational · IaC recommended per context

| Sub-skill | Scope |
|-----------|-------|
| **compute** | Lambda, ECS Fargate, Vercel, EC2 — decision by scale, latency, cost |
| **databases** | PostgreSQL (RDS), DynamoDB, MongoDB Atlas, Redis — SQL vs NoSQL |
| **storage-and-cdn** | S3, CloudFront, presigned uploads, image processing |
| **networking-and-security** | VPC, security groups, WAF, IAM, secrets, SSL/TLS, OIDC |
| **messaging-and-events** | SQS, SNS, EventBridge, WebSockets, event-driven patterns |
| **observability** | CloudWatch, Sentry, Datadog, structured logging, alerting |
| **cost-and-scaling** | Tier-based estimation, Savings Plans, auto-scaling, AWS Budgets |

---

## Backend Skills (16 sub-skills + index)

Stack: Node.js 20+ · NestJS / Express · TypeScript strict · Prisma / Drizzle · Zod · BullMQ · Redis · Pino · Vitest · pnpm

Focused on HOW to implement in code (which cloud service to use → architecture/).

| Layer | Skills |
|-------|--------|
| **Structure** | project-structure |
| **API** | api-design · request-pipeline · data-validation |
| **Auth** | auth |
| **Data** | database-patterns · caching |
| **Errors / Logs** | error-handling · logging |
| **Background** | background-jobs |
| **Quality / Security** | testing · security |
| **Real-time / Files** | real-time · file-handling |
| **Design / Integration** | database-design · api-consumption |

---

## Software General Skills

| Skill | Scope |
|-------|-------|
| **git-usage** | Conventional commits, Husky, branch naming, rebase, PR template |
| **clean-code-principles** | SOLID, DRY, KISS, guard clauses, JSDoc, immutability |
| **basic-workflows** | GitHub Actions CI (lint, test, build), CodeQL, Dependabot, CODEOWNERS |
| **scripting** | Bash/Shell: .sh structure, sed/awk/grep, CLI creation, traps |
| **docker** | Multi-stage Dockerfiles, docker-compose, dev containers, optimization |
| **typescript-patterns** | Generics, utility types, discriminated unions, branded types, satisfies |
| **deploy-pipelines** | GitHub Actions deploy, Vercel, AWS (SST), preview envs, rollback |

---

## Agent Workflow Skills (5 sub-skills + index)

Agent work protocol within any project. Defines how it receives features, decomposes tasks, documents progress, and resumes projects without context. Centered on the `.docs/` folder as the contract between developer and agent.

| Sub-skill | Responsibility |
|-----------|---------------|
| **docs-structure** | `.docs/` convention — sub-folders: features, brainstorming, rules, context, memory |
| **requirements-format** | feature.md format (overview, goals, A/C, tech notes), brainstorming → feature flow, clarification protocol |
| **iteration-rules** | Task decomposition, validation checkpoints, no-drift rule, Definition of Done, context and memory updates |
| **project-resumption** | Onboarding/re-onboarding protocol — what to read, in what order, how to synthesize before acting |
| **project-documentation** | README discipline (single, concise, in English), technical docs in specialized tools (Swagger, Storybook) |

---

## GRC Skills (9 skills)

| Skill | Regulation | Region |
|-------|-----------|--------|
| **GDPR** | Data protection | 🇪🇺 EU |
| **HIPAA** | Health data | 🇺🇸 USA |
| **ISO 27001** | ISMS | 🌍 Global |
| **NIST CSF** | Cybersecurity Framework 2.0 | 🌍 Global |
| **PCI DSS** | Payment card security | 🌍 Global |
| **SOC 2** | Trust Service Criteria | 🌍 Global |
| **OWASP Top 10** | Web vulnerabilities | 🌍 Global |
| **CCPA/CPRA** | Consumer privacy | 🇺🇸 California |
| **LGPD** | Data protection | 🇧🇷 Brazil |

---

## Usage

Each `SKILL.md` has a YAML frontmatter with `name` and `description` that allows GitHub Copilot to automatically activate the skill when the development context requires it.

For manual activation, reference the relevant skill from your prompt or configure it in your `.github/copilot-instructions.md` file.
