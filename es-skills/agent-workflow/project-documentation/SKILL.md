---
name: project-documentation
description: >
  Usa este skill cuando el agente necesite crear, actualizar o decidir sobre la
  documentación pública de un proyecto (README, API docs, Storybook). Aplica al
  crear proyectos nuevos, al agregar scripts/env vars, o cuando el agente considere
  crear un README adicional. También aplica si el usuario pide documentar algo y hay
  que decidir dónde va, incluso si no menciona "README" explícitamente.
---

# Project Documentation — README y Documentación Pública

## Reglas fundamentales

1. **Un solo README.md** en la raíz del proyecto, siempre en inglés. Opcionalmente `README.es.md` si el desarrollador lo pide.
2. **NUNCA crear READMEs adicionales** en subcarpetas sin que el desarrollador lo solicite explícitamente. Excepción: monorepos donde cada package/app puede tener el suyo, solo si el dev lo pide.
3. **README.md es una guía de inicio rápido**, no documentación exhaustiva. Objetivo: que alguien pueda clonar, instalar y correr el proyecto en minutos.
4. **Documentación detallada va en herramientas especializadas**: API → Swagger/OpenAPI, Componentes → Storybook, Arquitectura → `.docs/`, DB Schema → herramienta de diagramas.

## Cuándo actualizar el README

**Sí actualizar:**
- Nuevo script en package.json
- Nueva variable de entorno requerida
- Cambio en tech stack (dependencia fundamental)
- Cambio significativo en estructura de carpetas
- Nuevo prerequisito

**No actualizar:** feature nuevo (va en `.docs/memory/`), bug fix, refactor interno, cambios de implementación.

## Template del README

```markdown
# Project Name

Brief description in 1-2 sentences. What it does and who it's for.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Documentation](#documentation)
- [Contributing](#contributing)

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Database:** PostgreSQL (Neon)
- **ORM:** Drizzle
- **Testing:** Vitest + Playwright
- **Package Manager:** pnpm

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- PostgreSQL (or Neon account)

## Getting Started

\```bash
git clone https://github.com/org/project.git
cd project
pnpm install
cp .env.example .env.local
# Fill in the required values
pnpm db:migrate
pnpm dev
\```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run E2E tests |
| `pnpm lint` | Lint code |
| `pnpm db:migrate` | Run database migrations |

## Project Structure

\```
src/
├── app/          # Next.js App Router pages
├── components/   # Shared components
├── lib/          # Utilities and helpers
├── db/           # Database schema and migrations
└── types/        # TypeScript type definitions
\```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_SECRET` | Auth secret key | Yes |
| `NEXT_PUBLIC_APP_URL` | Public app URL | Yes |

See `.env.example` for all variables.

## Documentation

- **API Docs:** [Swagger UI](/api-docs) (available in dev)
- **Component Library:** Run `pnpm storybook`
- **Architecture Decisions:** `.docs/` folder

## Contributing

1. Create feature branch from `main`
2. Follow conventional commits
3. Ensure tests pass: `pnpm test`
4. Open PR with description
```

No incluir en el README: explicación detallada de features, documentación de API completa, catálogo de componentes, changelog, capturas de pantalla de cada página, instrucciones de deploy, reglas de negocio. Si el README pasa de ~150 líneas, algo sobra.

---

## Setup de proyecto nuevo

1. Crear `README.md` con el template de arriba (en inglés)
2. Preguntar: "¿Quieres una versión del README en español (README.es.md)?"
3. Crear `.env.example` con las variables necesarias
4. NO crear ningún otro README en subcarpetas

---

## Gotchas

- El agente tiende a crear READMEs en subcarpetas al implementar features — NUNCA hacerlo sin solicitud explícita
- El agente puede querer documentar features nuevos en el README — eso va en `.docs/memory/`, no en el README
- Si hay versión en español (`README.es.md`), mantener ambas sincronizadas al actualizar
- README en español sin versión en inglés es incorrecto — inglés siempre es el principal
- README sin "Getting Started" pierde su propósito principal
- Código de ejemplo extenso en el README es innecesario — un ejemplo breve por sección basta
- Si la documentación tiene su propia herramienta (Swagger, Storybook, etc.), usar la herramienta — no duplicar en markdown
