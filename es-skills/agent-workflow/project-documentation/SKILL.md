---
name: project-documentation
description: >
  Reglas de documentación pública del proyecto (README, API docs, Storybook, etc.).
  El agente NO crea READMEs adicionales salvo que el desarrollador lo solicite
  explícitamente. Un solo README por proyecto, conciso, en inglés, orientado a
  que alguien pueda clonar, instalar y correr el proyecto en minutos. La
  documentación técnica detallada va en herramientas especializadas, no en
  markdown sueltos.
---

# 📄 Project Documentation — README y Documentación Pública

## Principio

> **Un README no es un libro — es una guía de inicio rápido.**
> Si alguien clona el repo, el README le dice qué es, cómo instalarlo,
> y cómo correrlo. Nada más. Todo lo demás tiene su lugar específico.

---

## Regla #1: UN Solo README

```
Cada proyecto tiene UN archivo README.md en la raíz.
Eso es todo.

  ✅ /README.md                        ← el único
  ✅ /README.es.md                     ← versión en español (si el dev quiere)

  ❌ /src/README.md
  ❌ /src/components/README.md
  ❌ /src/features/auth/README.md
  ❌ /docs/README.md
  ❌ /packages/api/README.md            ← excepto en monorepos (ver abajo)

EXCEPCIÓN — Monorepos:
  En monorepos con múltiples packages/apps, cada package/app
  PUEDE tener su propio README.md si el desarrollador lo solicita.
  Pero el agente NUNCA los crea por iniciativa propia.

  ✅ /README.md                        ← overview del monorepo
  ✅ /apps/web/README.md               ← solo si el dev lo pide
  ✅ /packages/ui/README.md            ← solo si el dev lo pide

El agente NUNCA crea un README adicional sin que el
desarrollador lo solicite EXPLÍCITAMENTE.
```

---

## Regla #2: Idioma

```
README.md → SIEMPRE en inglés.
  Es el estándar de la industria. Facilita colaboración,
  open source, onboarding de devs internacionales.

README.es.md → Versión en español OPCIONAL.
  Al crear un proyecto nuevo, el agente pregunta:
  "¿Quieres una versión del README en español (README.es.md)?"

  Si sí: mantener ambos sincronizados.
  Si no: solo README.md en inglés.

.docs/ → El idioma de .docs/ lo decide el desarrollador.
  No necesariamente en inglés. Puede ser en español u otro idioma.
  Es documentación interna dev↔agente, no pública.
```

---

## Regla #3: Estructura del README

Un README conciso y bien indexado. Nada de prosa innecesaria.

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
# Clone
git clone https://github.com/org/project.git
cd project

# Install
pnpm install

# Environment
cp .env.example .env.local
# Fill in the required values

# Database
pnpm db:migrate

# Run
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

### Qué Incluir y Qué NO

```
INCLUIR:
  ✅ Qué es el proyecto (1-2 oraciones)
  ✅ Tech stack (lista concisa)
  ✅ Cómo instalar y correr
  ✅ Scripts disponibles
  ✅ Estructura de carpetas (alto nivel, no cada archivo)
  ✅ Variables de entorno requeridas
  ✅ Links a documentación especializada
  ✅ Cómo contribuir (breve)

NO INCLUIR:
  ❌ Explicación detallada de cada feature
  ❌ Documentación de API completa → Swagger/OpenAPI
  ❌ Catálogo de componentes → Storybook
  ❌ Guías de arquitectura → .docs/
  ❌ Changelog → CHANGELOG.md o GitHub Releases
  ❌ Badges decorativos excesivos (máximo 3-4 relevantes)
  ❌ Capturas de pantalla de cada página
  ❌ Instrucciones de deploy → CI/CD docs o .docs/
  ❌ Reglas de negocio → .docs/rules/
```

---

## Regla #4: Documentación Técnica Detallada

```
La documentación detallada NO va en READMEs — va en herramientas
especializadas según el tipo:

| Tipo de documentación | Herramienta | Dónde |
|-----------------------|-------------|-------|
| API REST/GraphQL | Swagger / OpenAPI | /api-docs (auto-generated) |
| Componentes UI | Storybook | pnpm storybook |
| Arquitectura / decisiones | .docs/ | .docs/memory/, .docs/rules/ |
| Features / US | .docs/features/ | .docs/features/{name}/ |
| DB Schema | Diagrama auto-generado | Prisma Studio, dbdocs.io |
| Runbooks / operaciones | .docs/ o wiki interna | Según el equipo |

Regla: si la documentación tiene su propia herramienta,
usar la herramienta. No duplicar en markdown.
```

---

## Regla #5: Cuándo Actualizar el README

```
El agente actualiza el README cuando:
  ✅ Se agrega un script nuevo a package.json
  ✅ Se agrega una variable de entorno nueva requerida
  ✅ Cambia el tech stack (nueva dependencia fundamental)
  ✅ Cambia la estructura de carpetas significativamente
  ✅ Se agrega un prerequisito nuevo

El agente NO actualiza el README cuando:
  ❌ Se implementa un feature nuevo (eso va en .docs/memory/)
  ❌ Se corrige un bug
  ❌ Se hace refactor interno
  ❌ Se cambian detalles de implementación
```

---

## Setup de Proyecto Nuevo

```
Al crear un proyecto nuevo, el agente:

  1. Crea README.md con la estructura estándar (en inglés)
  2. Pregunta: "¿Quieres una versión del README en español (README.es.md)?"
  3. Si sí → crea README.es.md con el mismo contenido traducido
  4. Crea .env.example con las variables necesarias
  5. NO crea ningún otro README en subcarpetas
```

---

## Anti-patrones

```
❌ README por feature ("añadí auth así que creo src/auth/README.md")
❌ README por carpeta (un README en cada directorio)
❌ README como documentación de API (para eso existe Swagger)
❌ README como changelog (para eso existe CHANGELOG.md o Releases)
❌ README como tutorial paso a paso de cada feature
❌ README de 500+ líneas (si pasa de ~150 líneas, algo sobra)
❌ README en español sin versión en inglés (inglés es el principal)
❌ README sin sección de "Getting Started" (el propósito principal)
❌ README con código de ejemplo extenso (un ejemplo breve por sección basta)
❌ El agente creando READMEs por iniciativa propia sin que el dev lo pida
```
