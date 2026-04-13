---
name: software
description: >
  Usa esta skill como punto de entrada para toda tarea de desarrollo de software.
  Enruta al agente hacia las sub-skills correctas según el contexto: frontend,
  backend, architecture, CI/CD, Docker, Git, scripting y TypeScript. Activa
  automáticamente skills transversales (clean-code-principles, typescript-patterns,
  git-usage) que deben estar presentes en toda interacción de código.
---

# Software — Índice Maestro

## Flujo de trabajo del agente

1. Identificar el tipo de tarea (frontend, backend, architecture, infra, CI/CD, scripting)
2. Activar **siempre** las skills transversales obligatorias (ver sección siguiente)
3. Consultar la tabla de activación para enrutar a la(s) sub-skill(s) específica(s)
4. Si la tarea cruza dominios (ej: endpoint + componente), activar ambos orquestadores (backend + frontend)
5. Seguir la cadena de consulta de cada orquestador hijo para skills obligatorias por acción

---

## Skills Transversales — Siempre Activas

Estas skills se aplican en **toda** interacción que genere o modifique código, sin excepción:

| Skill | Motivo | Cuándo se puede omitir |
|-------|--------|------------------------|
| [clean-code-principles](./clean-code-principles/SKILL.md) | SOLID, DRY, KISS, naming, guard clauses, JSDoc | Nunca — aplica a todo código |
| [typescript-patterns](./typescript-patterns/SKILL.md) | strict: true, generics, discriminated unions, Zod inference | Nunca — todo proyecto usa TypeScript |
| [git-usage](./git-usage/SKILL.md) | Conventional Commits, commits granulares, branch naming | Solo si la tarea no involucra commits (ej: consulta teórica) |

---

## Guía de Activación por Contexto

### Frontend

- **Keywords**: componente, React, Next.js, hook, estado, CSS, Tailwind, formulario, fetching, SSR, accesibilidad, SEO, animación, i18n, Playwright, Storybook
- **Activar**: [frontend](./frontend/SKILL.md) (orquestador con 22 sub-skills)
- **Co-activar siempre**: clean-code-principles, typescript-patterns

### Backend

- **Keywords**: endpoint, API, REST, NestJS, Express, middleware, auth, JWT, validación, Zod, Prisma, base de datos, cache, Redis, queue, BullMQ, WebSocket, logging, Sentry
- **Activar**: [backend](./backend/SKILL.md) (orquestador con 16 sub-skills)
- **Co-activar siempre**: clean-code-principles, typescript-patterns

### Architecture

- **Keywords**: arquitectura, infraestructura, qué servicio usar, AWS, Vercel, base de datos cuál, escala, presupuesto, monolito vs microservicios, IaC, Terraform, CDN, observabilidad
- **Activar**: [architecture](./architecture/SKILL.md) (orquestador con 7 sub-skills)
- **Co-activar**: backend y/o frontend según la fase de implementación

### CI/CD y Workflows

- **Keywords**: CI, CD, GitHub Actions, workflow, pipeline, deploy, preview, branch protection, Dependabot, CODEOWNERS
- **Activar**: [basic-workflows](./basic-workflows/SKILL.md) para setup inicial de CI/CD
- **Activar**: [deploy-pipelines](./deploy-pipelines/SKILL.md) para pipelines de deploy (staging, production, preview)

### Docker y Contenedores

- **Keywords**: Docker, Dockerfile, docker-compose, contenedor, imagen, devcontainer, multi-stage
- **Activar**: [docker](./docker/SKILL.md)

### Shell Scripting

- **Keywords**: script, bash, zsh, .sh, sed, awk, grep, automatización, CLI
- **Activar**: [scripting](./scripting/SKILL.md)

---

## Mapa Completo de Skills

### Sub-skills Directas (standalone)

| Skill | Alcance |
|-------|---------|
| [clean-code-principles](./clean-code-principles/SKILL.md) | SOLID, DRY, KISS, YAGNI, naming, guard clauses, JSDoc |
| [typescript-patterns](./typescript-patterns/SKILL.md) | Generics, utility types, discriminated unions, branded types, Zod |
| [git-usage](./git-usage/SKILL.md) | Conventional Commits, Husky, branch naming, rebase, PR template |
| [basic-workflows](./basic-workflows/SKILL.md) | GitHub Actions CI/CD, security audit, Dependabot, branch protection |
| [deploy-pipelines](./deploy-pipelines/SKILL.md) | Deploy a staging/production, preview environments, secrets |
| [docker](./docker/SKILL.md) | Dockerfile, docker-compose, dev containers, image optimization |
| [scripting](./scripting/SKILL.md) | Bash/Zsh scripts, Unix tools, terminal styles, CLIs |

### Orquestadores con Sub-skills

| Orquestador | Sub-skills | Alcance |
|-------------|-----------|---------|
| [frontend](./frontend/SKILL.md) | 22 sub-skills | React, Next.js, estilos, estado, fetching, forms, testing, a11y, SEO, i18n |
| [backend](./backend/SKILL.md) | 16 sub-skills | API design, auth, DB, cache, queues, testing, security, logging, real-time |
| [architecture](./architecture/SKILL.md) | 7 sub-skills | Compute, databases, storage, networking, messaging, observability, costos |

---

## Gotchas

- No activar solo la sub-skill específica sin las transversales — clean-code-principles y typescript-patterns deben estar presentes en toda generación de código.
- No confundir "qué servicio usar" (architecture) con "cómo implementarlo en código" (backend/frontend). Si el desarrollador pregunta "¿qué base de datos uso?", es architecture. Si pregunta "¿cómo hago una migración?", es backend/database-patterns.
- Al crear un proyecto nuevo, activar basic-workflows + git-usage + docker como setup base antes de escribir código de negocio.
- Cuando la tarea cruza frontend y backend (ej: formulario que llama a un endpoint), activar ambos orquestadores — los tipos compartidos están en typescript-patterns.
- No asumir stack sin confirmación. architecture/ existe para hacer preguntas antes de decidir. Si el desarrollador no especificó framework, preguntar.
