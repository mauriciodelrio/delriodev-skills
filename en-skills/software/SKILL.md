---
name: software
description: >
  Use this skill as the entry point for every software development task.
  Routes the agent to the correct sub-skills based on context: frontend,
  backend, architecture, CI/CD, Docker, Git, scripting and TypeScript.
  Automatically activates cross-cutting skills (clean-code-principles,
  typescript-patterns, git-usage) that must be present in every code interaction.
---

# Software — Master Index

## Agent workflow

1. Identify the task type (frontend, backend, architecture, infra, CI/CD, scripting)
2. **Always** activate the mandatory cross-cutting skills (see next section)
3. Consult the activation table to route to the specific sub-skill(s)
4. If the task crosses domains (e.g., endpoint + component), activate both orchestrators (backend + frontend)
5. Follow each child orchestrator's consultation chain for mandatory skills per action

---

## Cross-Cutting Skills — Always Active

These skills apply in **every** interaction that generates or modifies code, without exception:

| Skill | Reason | When it can be omitted |
|-------|--------|------------------------|
| [clean-code-principles](./clean-code-principles/SKILL.md) | SOLID, DRY, KISS, naming, guard clauses, JSDoc | Never — applies to all code |
| [typescript-patterns](./typescript-patterns/SKILL.md) | strict: true, generics, discriminated unions, Zod inference | Never — every project uses TypeScript |
| [git-usage](./git-usage/SKILL.md) | Conventional Commits, granular commits, branch naming | Only if the task doesn't involve commits (e.g., theoretical question) |

---

## Activation Guide by Context

### Frontend

- **Keywords**: component, React, Next.js, hook, state, CSS, Tailwind, form, fetching, SSR, accessibility, SEO, animation, i18n, Playwright, Storybook
- **Activate**: [frontend](./frontend/SKILL.md) (orchestrator of frontend sub-skills)
- **Always co-activate**: clean-code-principles, typescript-patterns

### Backend

- **Keywords**: endpoint, API, REST, NestJS, Express, middleware, auth, JWT, validation, Zod, Prisma, database, cache, Redis, queue, BullMQ, WebSocket, logging, Sentry
- **Activate**: [backend](./backend/SKILL.md) (orchestrator of backend sub-skills)
- **Always co-activate**: clean-code-principles, typescript-patterns

### Architecture

- **Keywords**: architecture, infrastructure, which service to use, AWS, Vercel, which database, scale, budget, monolith vs microservices, IaC, Terraform, CDN, observability
- **Activate**: [architecture](./architecture/SKILL.md) (orchestrator of architecture sub-skills)
- **Co-activate**: backend and/or frontend depending on the implementation phase

### CI/CD and Workflows

- **Keywords**: CI, CD, GitHub Actions, workflow, pipeline, deploy, preview, branch protection, Dependabot, CODEOWNERS
- **Activate**: [basic-workflows](./basic-workflows/SKILL.md) for initial CI/CD setup
- **Activate**: [deploy-pipelines](./deploy-pipelines/SKILL.md) for deploy pipelines (staging, production, preview)

### Docker and Containers

- **Keywords**: Docker, Dockerfile, docker-compose, container, image, devcontainer, multi-stage
- **Activate**: [docker](./docker/SKILL.md)

### Shell Scripting

- **Keywords**: script, bash, zsh, .sh, sed, awk, grep, automation, CLI
- **Activate**: [scripting](./scripting/SKILL.md)

---

## Complete Skills Map

### Direct Sub-skills (standalone)

| Skill | Scope |
|-------|-------|
| [clean-code-principles](./clean-code-principles/SKILL.md) | SOLID, DRY, KISS, YAGNI, naming, guard clauses, JSDoc |
| [typescript-patterns](./typescript-patterns/SKILL.md) | Generics, utility types, discriminated unions, branded types, Zod |
| [git-usage](./git-usage/SKILL.md) | Conventional Commits, Husky, branch naming, rebase, PR template |
| [basic-workflows](./basic-workflows/SKILL.md) | GitHub Actions CI/CD, security audit, Dependabot, branch protection |
| [deploy-pipelines](./deploy-pipelines/SKILL.md) | Deploy to staging/production, preview environments, secrets |
| [docker](./docker/SKILL.md) | Dockerfile, docker-compose, dev containers, image optimization |
| [scripting](./scripting/SKILL.md) | Bash/Zsh scripts, Unix tools, terminal styles, CLIs |

### Orchestrators with Sub-skills

| Orchestrator | Scope |
|-------------|-------|
| [frontend](./frontend/SKILL.md) | React, Next.js, styles, state, fetching, forms, testing, a11y, SEO, i18n |
| [backend](./backend/SKILL.md) | API design, auth, DB, cache, queues, testing, security, logging, real-time |
| [architecture](./architecture/SKILL.md) | Compute, databases, storage, networking, messaging, observability, costs |

---

## Gotchas

- Don't activate only the specific sub-skill without the cross-cutting ones — clean-code-principles and typescript-patterns must be present in every code generation.
- Don't confuse "which service to use" (architecture) with "how to implement it in code" (backend/frontend). If the developer asks "which database should I use?", it's architecture. If they ask "how do I do a migration?", it's backend/database-patterns.
- When creating a new project, activate basic-workflows + git-usage + docker as base setup before writing business code.
- When the task crosses frontend and backend (e.g., form that calls an endpoint), activate both orchestrators — shared types are in typescript-patterns.
- Don't assume stack without confirmation. architecture/ exists to ask questions before deciding. If the developer didn't specify a framework, ask.
