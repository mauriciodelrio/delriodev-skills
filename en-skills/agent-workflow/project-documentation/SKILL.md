---
name: project-documentation
description: >
  Use this skill when the agent needs to create, update, or decide about a project's
  public documentation (README, API docs, Storybook). Applies when creating new
  projects, adding scripts/env vars, or when the agent considers creating an additional
  README. Also applies if the user asks to document something and you need to decide
  where it goes, even if they don't mention "README" explicitly.
---

# Project Documentation — README and Public Documentation

## Fundamental rules

1. **One single README.md** at the project root, always in English. Optionally `README.es.md` if the developer asks.
2. **NEVER create additional READMEs** in subfolders without explicit developer request. Exception: monorepos where each package/app can have its own, only if the dev asks.
3. **README.md is a quick start guide**, not exhaustive documentation. Goal: someone can clone, install, and run the project in minutes.
4. **Detailed documentation goes in specialized tools**: API → Swagger/OpenAPI, Components → Storybook, Architecture → `.docs/`, DB Schema → diagram tools.

## When to update the README

**Do update:**
- New script in package.json
- New required environment variable
- Tech stack change (fundamental dependency)
- Significant folder structure change
- New prerequisite

**Don't update:** new feature (goes in `.docs/memory/`), bug fix, internal refactor, implementation detail changes.

## README Template

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

Do not include in the README: detailed feature explanations, complete API documentation, component catalogs, changelog, screenshots of every page, deploy instructions, business rules. If the README exceeds ~150 lines, something is extra.

---

## New project setup

1. Create `README.md` with the template above (in English)
2. Ask: "Do you want a Spanish version of the README (README.es.md)?"
3. Create `.env.example` with the necessary variables
4. Do NOT create any other README in subfolders

---

## Gotchas

- The agent tends to create READMEs in subfolders when implementing features — NEVER do this without explicit request
- The agent may want to document new features in the README — that goes in `.docs/memory/`, not the README
- If there's a Spanish version (`README.es.md`), keep both synchronized when updating
- README in Spanish without an English version is incorrect — English is always primary
- README without "Getting Started" loses its main purpose
- Extensive code examples in the README are unnecessary — one brief example per section is enough
- If documentation has its own tool (Swagger, Storybook, etc.), use the tool — don't duplicate in markdown
