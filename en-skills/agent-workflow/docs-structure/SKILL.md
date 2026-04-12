---
name: docs-structure
description: >
  Convention for the .docs/ folder within each project. Defines what sub-folders
  exist, what goes in each one, naming rules, and when to create or update files.
  This folder is the nerve center of communication between developer and agent.
---

# 📁 Docs Structure — `.docs/` Folder Convention

## Principle

> **`.docs/` is the contract between the developer and the agent.**
> Everything the agent needs to know about the project is here.
> Everything the agent produces as documentation goes here.

---

## Structure

```
.docs/
├── features/                    ← User Stories / Features to implement
│   ├── auth-login/
│   │   └── feature.md
│   ├── user-profile/
│   │   └── feature.md
│   └── payment-checkout/
│       └── feature.md
│
├── brainstorming/               ← Ideas under exploration (pre-feature)
│   ├── gamification-ideas.md
│   └── notification-system.md
│
├── rules/                       ← Project-specific rules
│   ├── business-rules.md
│   ├── api-conventions.md
│   └── naming-conventions.md
│
├── context/                     ← Current iteration log
│   ├── iteration-2026-04-11.md
│   └── iteration-2026-04-08.md
│
└── memory/                      ← History of what was implemented
    ├── 2026-04.md
    └── 2026-03.md
```

---

## Folder: `features/`

```
Who writes:   The developer
Who consumes: The agent
When created: When there is a defined feature ready to implement

Internal structure: see sub-skill requirements-format

Folder naming:
  ✅ Descriptive kebab-case: auth-login, user-profile, payment-checkout
  ❌ Cryptic IDs: US-001, feat-23
  ❌ Vague names: update, changes, new-stuff

Each feature has its own folder with a feature.md file.
Optionally it can include additional files:
  - wireframes/ (reference images)
  - api-spec.md (API contracts specific to the feature)
  - data-model.md (schema or data model)
```

---

## Folder: `brainstorming/`

```
Who writes:   The developer (initiates) + The agent (collaborates)
Who consumes: Both
When created: When there is an idea that needs exploration before becoming a feature

Format: free-form, but with suggested structure:

  # [Idea Name]

  ## Context
  [Why we're exploring this]

  ## Initial Ideas
  - Idea A: ...
  - Idea B: ...

  ## Open Questions
  - ...?
  - ...?

  ## Q&A with Agent
  **Dev:** [question or scenario]
  **Agent:** [answer, analysis, proposal]

  ## Conclusions
  [What was decided]

  ## → Derived Feature
  [Link to the feature in .docs/features/ when it graduates]

Rule: when a brainstorming matures enough to have
overview + goals + clear A/C → it graduates to a feature.
The original brainstorming is kept as historical reference.
```

---

## Folder: `rules/`

```
Who writes:   The developer
Who consumes: The agent
When created: When there are project-specific rules

Typical content:
  - High-level business rules
  - Project API conventions (naming, versioning, response format)
  - Technical restrictions ("don't use library X", "maximum N dependencies")
  - Architectural decisions already made and their justification
  - Domain glossary (business terms and their meaning)

Format:
  One file per rules domain. Concise bullet points.
  The agent consults this folder BEFORE making technical decisions.

Example — business-rules.md:

  # Business Rules

  ## Users
  - A user can have a maximum of 3 active workspaces
  - The free plan has a limit of 5 members per workspace
  - Emails are case-insensitive and normalized to lowercase

  ## Payments
  - Prices are always stored in cents (integer)
  - Subscriptions are charged at the beginning of the period
  - There are no automatic refunds — they require manual approval
```

---

## Folder: `context/`

```
Who writes:   The agent (primarily)
Who consumes: The agent (when resuming), the developer (for oversight)
When created: At the start of each significant work session
When updated: During implementation, upon completing blocks

Purpose: log of the CURRENT iteration. What is being done,
what decisions were made, what remains pending.

Naming: iteration-YYYY-MM-DD.md (one per day or session)

Format:

  # Iteration — 2026-04-11

  ## Objective
  Implement feature: auth-login

  ## Status
  🟢 Completed | 🟡 In Progress | 🔴 Blocked

  ## Work Done
  - [x] Create LoginForm component
  - [x] Implement POST /auth/login endpoint
  - [ ] Add 2FA validation
  - [ ] Integration tests

  ## Decisions Made
  - Used bcrypt instead of argon2 for hosting compatibility
  - JWT token expires in 15 min with 7-day refresh token

  ## Blockers / Pending Questions
  - Is 2FA mandatory or optional per user?

  ## Next Steps
  - Resolve 2FA question
  - Complete tests

RULE: the agent updates context/ DURING work, not just at the end.
If the agent disconnects mid-task, context/ must reflect
exactly where it left off.
```

---

## Folder: `memory/`

```
Who writes:   The agent
Who consumes: The agent (when resuming project)
When created: Upon completing a feature or work block
When updated: Append-only — never edit previous entries

Purpose: PERMANENT history of what was implemented. It has no next
steps or pending items — only accomplished facts.

Naming: YYYY-MM.md (one file per month)

Format (mandatory template):

  # Memory — 2026-04

  ## 2026-04-11 — auth-login
  - **Feature:** Login with email and password
  - **Implemented:**
    - LoginForm component with Zod validation
    - POST /api/auth/login endpoint
    - JWT with refresh token (15min / 7d)
    - Authentication middleware
    - Unit and integration tests
  - **Decisions:**
    - bcrypt over argon2 (compatibility)
    - Token in httpOnly cookie (not localStorage)
  - **Key files:**
    - src/components/auth/LoginForm.tsx
    - src/app/api/auth/login/route.ts
    - src/middleware.ts

  ## 2026-04-08 — project-setup
  - **Feature:** Initial project setup
  - **Implemented:**
    - Next.js 15 + TypeScript + Tailwind
    - Base folder structure
    - ESLint + Prettier + Husky
    - CI workflow (lint + test + build)
  - **Decisions:**
    - App Router (not Pages)
    - pnpm as package manager
  - **Key files:**
    - package.json, tsconfig.json, .eslintrc.js

RULES:
  - Only record what was actually implemented
  - Do NOT include future plans or TODOs
  - Include relevant technical decisions (why X and not Y)
  - List key files created/modified
  - Exact date for each entry
  - Append-only: past entries are NOT edited
```

---

## Gitignore

```
Including .docs/ in the repository is the DEVELOPER'S decision.

If included in git (recommended default):
  ✅ The team shares feature context and rules
  ✅ Decision history is versioned
  ✅ New team members have onboarding

If excluded from git:
  ✅ Personal dev documentation
  ✅ Private brainstorming
  ⚠️ Lost if there's no backup

Mixed option (recommended for teams):
  # .gitignore
  .docs/brainstorming/     # Personal ideas
  .docs/context/           # Local session log
  # DO NOT ignore:
  # .docs/features/        # Shared
  # .docs/rules/           # Shared
  # .docs/memory/          # Shared
```

---

## Agent Rules for `.docs/`

```
1. NEVER delete files from .docs/ without explicit confirmation
2. NEVER edit features/ — that is written by the developer
3. CAN propose changes to features/ with suggestions
4. DOES write to context/ and memory/ as part of its workflow
5. DOES collaborate on brainstorming/ when asked
6. ALWAYS consult rules/ before technical/business decisions
7. If .docs/ doesn't exist, ask whether to create it with the standard structure
```

---

## Anti-patterns

```
❌ Features without A/C → the agent must not implement without acceptance criteria
❌ Memory with TODOs or next steps → memory is only accomplished facts
❌ Outdated context → the agent must update context/ DURING work
❌ Brainstorming that never graduates → if it has overview + goals + A/C → move to features/
❌ Empty or generic rules → better to have no rules than to have "be consistent"
```
