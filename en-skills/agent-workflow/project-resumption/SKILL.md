---
name: project-resumption
description: >
  Onboarding and re-onboarding protocol for when the agent arrives at a
  project without prior context. Defines what to read, in what order, what to ask,
  and how to reconstruct the project's mental state before doing anything.
  Applies both for new agents and for resuming after a period of inactivity.
---

# 🔄 Project Resumption — Resuming a Project Without Context

## Principle

> **Never act without understanding first.**
> It doesn't matter how long it's been or how large the project is —
> the agent ALWAYS executes this protocol before implementing
> anything in a project it doesn't have fresh in memory.

---

## When It Applies

```
This protocol is executed when:
  ✅ It's the first time the agent works on this project
  ✅ The agent resumes after a period of inactivity
  ✅ The previous conversation context was lost
  ✅ The developer says "let's pick this up" or "where did we leave off"
  ✅ The agent detects it doesn't have sufficient context

Does NOT apply when:
  ❌ The agent just completed a task in the same session
  ❌ The context is fresh and clear
```

---

## Resumption Protocol

```
PHASE 1: RECONNAISSANCE (read, don't act)
│
├── Step 1: Verify existence of .docs/
│   ├── Exists → continue with Step 2
│   └── Doesn't exist → ask the dev:
│       "I can't find a .docs/ folder in the project.
│        Do you want me to create it with the standard structure?"
│
├── Step 2: Read .docs/memory/ (most recent first)
│   → Understand WHAT has been implemented historically
│   → Reconstruct timeline of completed features
│   → Note technical decisions made previously
│
├── Step 3: Read .docs/context/ (most recent first)
│   → Understand the CURRENT STATE of the project
│   → Is there work in progress?
│   → Are there pending tasks from a previous iteration?
│   → Are there reported blockers?
│
├── Step 4: Read .docs/rules/
│   → Understand business rules and project conventions
│   → These rules apply to EVERYTHING implemented
│
└── Step 5: Quick code scan
    → package.json (stack, key dependencies)
    → Folder structure (understand the organization)
    → Project README.md (if it exists)
    → Don't read all the code — just the structure

PHASE 2: SYNTHESIS
│
└── Present summary to the developer:

    "I've reviewed the project documentation. Here's what I understand:

     📋 Project: [name/description]
     🛠️ Stack: [main technologies]
     
     📦 Implemented features:
       - [feature 1] (date)
       - [feature 2] (date)
       - ...
     
     📍 Current state:
       - [last work done]
       - [pending tasks if any]
       - [blockers if any]
     
     📏 Project rules:
       - [key rules I noted]
     
     Is this correct? Is there anything I should know that isn't documented?"

PHASE 3: RECEIVE TASK
│
└── With confirmed context, receive the developer's task
    and execute the normal flow (requirements-format → iteration-rules)
```

---

## Reading Order (Important)

```
The order is NOT arbitrary:

1. memory/   → History (what happened)
2. context/  → Present (where we are)
3. rules/    → Constraints (what I can't do)
4. features/ → Future (what needs to be done)

Why this order?
  - Memory gives the big picture of how we got here
  - Context gives the current state and possible tasks in progress
  - Rules establish constraints before planning
  - Features is what needs to be done NOW — read last
    to avoid jumping to implementation without context
```

---

## Resumption with Work in Progress

```
If .docs/context/ shows incomplete work:

  "I see there's an iteration in progress from [date]:
   Feature: [name]
   
   Completed:
   - [x] Task 1
   - [x] Task 2
   
   Pending:
   - [ ] Task 3
   - [ ] Task 4
   
   Should we resume from Task 3 or are there priority changes?"

If the developer wants to resume:
  → The agent reads the original feature in .docs/features/
  → Reviews the code implemented so far
  → Continues from where it left off

If the developer wants to switch tasks:
  → Update context/ marking the iteration as paused
  → Start new task with the normal flow
```

---

## Resumption Without `.docs/`

```
If the project doesn't have .docs/:

  1. Ask if they want to create the structure
  2. If YES: create .docs/ with empty sub-folders
  3. Do onboarding by reading the code:
     - package.json, tsconfig.json → stack
     - Folder structure → architecture
     - README.md → purpose
     - .env.example → external services
     - Existing tests → coverage and patterns
  
  4. Create first entry in memory/ with the observed state:
     
     ## [date] — project-onboarding
     - **Feature:** Initial project reconnaissance
     - **Observed:**
       - Stack: Next.js 15, TypeScript, Tailwind, Prisma
       - DB: PostgreSQL (Neon)
       - Auth: NextAuth.js
       - 47 files in src/
       - Tests: 12 test files (Vitest)
       - CI: GitHub Actions (lint + test + build)
     - **State:** Functional project, without .docs/ documentation
```

---

## Long Projects (> 6 months of history)

```
If memory/ has many months of history:

  Do NOT read EVERYTHING line by line from 6+ months.
  
  Strategy:
  1. Read the last month in full detail
  2. Read headers/titles of previous months (feature list)
  3. If something from the past is relevant to the current task → read that entry
  4. Ask the dev if there's key historical context to be aware of

  "The project has history since [date]. I've read the last
   month in detail and the titles of the rest. Are there decisions or
   old features I should keep in mind for the current task?"
```

---

## Multiple Agents / Sessions

```
If the project is worked on by multiple agents
(different sessions, different tools):

  → .docs/ is the ONLY source of truth
  → Each agent reads before acting
  → Each agent writes to context/ and memory/ when finishing
  → Never trust "the other agent surely did X"
    — verify in memory/ and in the code

  Rule: if it's not in .docs/ or in the code, it didn't happen.
```

---

## Resumption Questions (Checklist)

```
If the documentation is insufficient or ambiguous, the agent can
ask these orientation questions:

About the project:
  □ What's the general state? (active, on hold, maintenance)
  □ Is there anything broken or urgent to fix?
  □ Is there a deadline or special priority?

About the stack:
  □ Are there external services I need to know about? (APIs, DBs, providers)
  □ Are there credentials or access I need to test?
  □ Does the project run locally? How do you start it?

About the task:
  □ What feature or task do you want me to work on?
  □ Is there a feature.md already written or should we talk first?
```

---

## Anti-patterns

```
❌ Start coding without reading .docs/ → zero context, errors guaranteed
❌ Read only features/ without reading memory/ and context/ → doesn't know the state
❌ Assume it remembers from a previous session → don't trust memory
❌ Read ALL the code before asking → inefficient, ask first
❌ Not presenting a summary of what was understood → dev doesn't know if it understood correctly
❌ Ignoring .docs/rules/ → will contradict conventions
❌ Reading memory/ from the beginning on long projects → read recent first
❌ Not updating context/ when resuming → the next resumption won't know
```
