---
name: project-documentation
description: >
  Rules for public project documentation (README, API docs, Storybook, etc.).
  The agent does NOT create additional READMEs unless the developer explicitly
  requests it. One single README per project, concise, in English, oriented so
  that someone can clone, install, and run the project in minutes. Detailed
  technical documentation goes in specialized tools, not in loose
  markdown files.
---

# 📄 Project Documentation — README and Public Documentation

## Principle

> **A README is not a book — it's a quick start guide.**
> If someone clones the repo, the README tells them what it is, how to install it,
> and how to run it. Nothing more. Everything else has its specific place.

---

## Rule #1: ONE Single README

```
Each project has ONE README.md file at the root.
That's it.

  ✅ /README.md                        ← the only one
  ✅ /README.es.md                     ← Spanish version (if the dev wants)

  ❌ /src/README.md
  ❌ /src/components/README.md
  ❌ /src/features/auth/README.md
  ❌ /docs/README.md
  ❌ /packages/api/README.md            ← except in monorepos (see below)

EXCEPTION — Monorepos:
  In monorepos with multiple packages/apps, each package/app
  CAN have its own README.md if the developer requests it.
  But the agent NEVER creates them on its own initiative.

  ✅ /README.md                        ← monorepo overview
  ✅ /apps/web/README.md               ← only if the dev asks
  ✅ /packages/ui/README.md            ← only if the dev asks

The agent NEVER creates an additional README without the
developer EXPLICITLY requesting it.
```

---

## Rule #2: Language

```
README.md → ALWAYS in English.
  It's the industry standard. Facilitates collaboration,
  open source, onboarding of international devs.

README.es.md → OPTIONAL Spanish version.
  When creating a new project, the agent asks:
  "Do you want a Spanish version of the README (README.es.md)?"

  If yes: keep both synchronized.
  If no: only README.md in English.

.docs/ → The language of .docs/ is the developer's decision.
  Not necessarily in English. Can be in Spanish or another language.
  It's internal dev↔agent documentation, not public.
```

---

## Rule #3: README Structure

A concise and well-indexed README. No unnecessary prose.

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

### What to Include and What NOT

```
INCLUDE:
  ✅ What the project is (1-2 sentences)
  ✅ Tech stack (concise list)
  ✅ How to install and run
  ✅ Available scripts
  ✅ Folder structure (high level, not every file)
  ✅ Required environment variables
  ✅ Links to specialized documentation
  ✅ How to contribute (brief)

DO NOT INCLUDE:
  ❌ Detailed explanation of each feature
  ❌ Complete API documentation → Swagger/OpenAPI
  ❌ Component catalog → Storybook
  ❌ Architecture guides → .docs/
  ❌ Changelog → CHANGELOG.md or GitHub Releases
  ❌ Excessive decorative badges (maximum 3-4 relevant ones)
  ❌ Screenshots of every page
  ❌ Deploy instructions → CI/CD docs or .docs/
  ❌ Business rules → .docs/rules/
```

---

## Rule #4: Detailed Technical Documentation

```
Detailed documentation does NOT go in READMEs — it goes in specialized
tools depending on the type:

| Documentation type | Tool | Where |
|--------------------|------|-------|
| REST/GraphQL API | Swagger / OpenAPI | /api-docs (auto-generated) |
| UI Components | Storybook | pnpm storybook |
| Architecture / decisions | .docs/ | .docs/memory/, .docs/rules/ |
| Features / US | .docs/features/ | .docs/features/{name}/ |
| DB Schema | Auto-generated diagram | Prisma Studio, dbdocs.io |
| Runbooks / operations | .docs/ or internal wiki | Depending on the team |

Rule: if the documentation has its own tool,
use the tool. Don't duplicate in markdown.
```

---

## Rule #5: When to Update the README

```
The agent updates the README when:
  ✅ A new script is added to package.json
  ✅ A new required environment variable is added
  ✅ The tech stack changes (new fundamental dependency)
  ✅ The folder structure changes significantly
  ✅ A new prerequisite is added

The agent does NOT update the README when:
  ❌ A new feature is implemented (that goes in .docs/memory/)
  ❌ A bug is fixed
  ❌ An internal refactor is done
  ❌ Implementation details change
```

---

## New Project Setup

```
When creating a new project, the agent:

  1. Creates README.md with the standard structure (in English)
  2. Asks: "Do you want a Spanish version of the README (README.es.md)?"
  3. If yes → creates README.es.md with the same translated content
  4. Creates .env.example with the necessary variables
  5. Does NOT create any other README in subfolders
```

---

## Anti-patterns

```
❌ README per feature ("I added auth so I'm creating src/auth/README.md")
❌ README per folder (a README in every directory)
❌ README as API documentation (that's what Swagger is for)
❌ README as changelog (that's what CHANGELOG.md or Releases is for)
❌ README as a step-by-step tutorial for each feature
❌ README over 500+ lines (if it exceeds ~150 lines, something is extra)
❌ README in Spanish without an English version (English is the primary one)
❌ README without a "Getting Started" section (the main purpose)
❌ README with extensive code examples (one brief example per section is enough)
❌ The agent creating READMEs on its own initiative without the dev asking
```
