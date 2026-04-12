---
name: iteration-rules
description: >
  Defines how the agent decomposes features into tasks, executes them sequentially,
  documents progress in context/, updates memory/ upon completion, and applies
  validation checkpoints between significant blocks. Includes Definition of Done,
  no-drift rule, and task granularity protocol.
---

# ⚙️ Iteration Rules — Task Execution and Documentation

## Principle

> **Implementing is a controlled process, not an uncontrolled sprint.**
> Each feature is decomposed, confirmed, executed in blocks,
> documented as progress is made, and recorded upon completion.

---

## Iteration Flow

```
FEATURE RECEIVED (already went through requirements-format)
│
├── 1. DECOMPOSITION
│   → Split feature into atomic tasks
│   → Order by dependency
│   → Estimate relative complexity
│
├── 2. CHECKPOINT — PLAN
│   → Present task list to the developer
│   → Request plan confirmation
│
├── 3. EXECUTION (for each task)
│   ├── Mark task as in progress
│   ├── Implement
│   ├── Significant block? → Validation checkpoint
│   ├── Drift detected? → Pause, report (no-drift)
│   ├── Update .docs/context/ as progress is made
│   └── Mark task as completed
│
├── 4. VERIFICATION
│   → Do all A/C pass?
│   → Do tests pass?
│   → Are there no regressions?
│
└── 5. CLOSURE
    → Update .docs/memory/ with what was implemented
    → Mark feature as completed in context/
```

---

## 1. Task Decomposition

### Granularity

```
Each task must be:
  ✅ Completable in a continuous work block
  ✅ Verifiable (has clear output)
  ✅ Independent or with explicit dependency
  ✅ Describable in one sentence

Example — Feature: auth-login

  Tasks:
  1. Create DB schema for users table (migrations)
  2. Implement POST /api/auth/register endpoint
  3. Implement POST /api/auth/login endpoint
  4. Implement authentication middleware (JWT verify)
  5. Create RegisterForm component with validation
  6. Create LoginForm component with validation
  7. Implement route protection (/dashboard → redirect if not auth)
  8. Implement lockout after failed attempts
  9. Unit tests (endpoints + middleware)
  10. Integration tests (full flow register → login → dashboard)
```

### Dependency Order

```
Tasks are ordered bottom-up:
  1. Data layer (schema, migrations)
  2. Backend (endpoints, business logic)
  3. Middleware / infrastructure
  4. Frontend (components, pages)
  5. Integration (connect frontend with backend)
  6. Tests
  7. Cleanup and documentation

Never start with the UI if the backend doesn't exist.
Never implement tests before the code they test.
```

---

## 2. Checkpoint — Plan

Before touching code, the agent presents:

```markdown
## Implementation Plan — auth-login

**Feature:** Login with email and password
**A/C to cover:** 9 criteria

### Tasks (10)

| # | Task | Depends on | Complexity |
|---|------|------------|------------|
| 1 | Users schema + migration | — | low |
| 2 | POST /api/auth/register | 1 | medium |
| 3 | POST /api/auth/login | 1 | medium |
| 4 | JWT Middleware | 3 | medium |
| 5 | RegisterForm + validation | — | medium |
| 6 | LoginForm + validation | — | medium |
| 7 | Route protection | 4 | low |
| 8 | Lockout after failed attempts | 3 | medium |
| 9 | Unit tests | 1-8 | medium |
| 10 | Integration tests | 1-8 | high |

### Proposed Technical Decisions
- bcrypt for password hashing (standard, well supported)
- JWT in httpOnly cookie (more secure than localStorage)
- Zod for form validation (consistent with the project)

**Do you confirm this plan or are there adjustments?**
```

The agent **does NOT start implementing** without plan confirmation.

---

## 3. Execution

### Per Task

```
When starting a task:
  → Announce: "Implementing task N: [description]"

During the task:
  → Implement the code
  → If there's a relevant technical decision → mention it
  → If there's a question → ask BEFORE assuming

When completing a task:
  → Confirm: "✅ Task N completed: [what was done]"
  → If there were changes vs the plan → explain why
```

### Block Checkpoints

```
After completing a logical group of tasks, checkpoint:

"I've completed the backend block (tasks 1-4):
  - Users schema created with fields: id, name, email, password_hash, ...
  - Register endpoint validating unique email, hashing with bcrypt
  - Login endpoint with verification, JWT with 15min expiry
  - Middleware verifying token on protected routes
  
  A/C covered: AC-1, AC-2, AC-3, AC-5, AC-9
  
  Next block: Frontend (tasks 5-7).
  Any adjustments before continuing?"
```

### Context Update

```
When completing each block, update .docs/context/iteration-YYYY-MM-DD.md:

  ## Work Done
  - [x] Task 1: Users schema
  - [x] Task 2: Register endpoint
  - [x] Task 3: Login endpoint
  - [x] Task 4: JWT Middleware
  - [ ] Task 5: RegisterForm     ← next
  - [ ] Task 6: LoginForm
  ...

  ## Decisions Made
  - bcrypt for hashing (proposed in plan, confirmed)
  - JWT in httpOnly cookie (proposed in plan, confirmed)

Frequency: at least every 2-3 completed tasks.
Do NOT wait until everything is finished to update context.
```

---

## 4. Verification

### Pre-Closure Checklist

```
Before declaring a feature as completed:

☐ Each A/C verified individually
☐ Tests pass (unit + integration if applicable)
☐ No regressions in existing functionality
☐ Lint and type-check pass without errors
☐ No TODOs or commented-out code left behind
☐ New routes/endpoints are protected if applicable
☐ Errors are handled (no empty catches or silent errors)
```

### Definition of Done

```
A feature is DONE when:
  1. ✅ All A/C are met
  2. ✅ Tests pass
  3. ✅ Code follows .docs/rules/
  4. ✅ No unreported deviations from the plan
  5. ✅ Context updated with final state
  6. ✅ Memory updated with what was implemented
```

---

## 5. Closure

### Update Memory

```
Upon completing the feature, add an entry to .docs/memory/YYYY-MM.md:

  ## 2026-04-11 — auth-login
  - **Feature:** Login with email and password
  - **Implemented:**
    - Users schema with migration
    - POST /api/auth/register with validation
    - POST /api/auth/login with JWT
    - Authentication middleware
    - LoginForm and RegisterForm with Zod
    - Route protection
    - Lockout after 5 failed attempts (per email, 15 min)
    - Unit and integration tests
  - **Decisions:**
    - bcrypt over argon2 (availability on edge)
    - JWT httpOnly cookie (security over localStorage)
    - Lockout per email (not per IP, to avoid false positives on VPN)
  - **Key files:**
    - src/db/schema/users.ts
    - src/app/api/auth/register/route.ts
    - src/app/api/auth/login/route.ts
    - src/middleware.ts
    - src/components/auth/LoginForm.tsx
    - src/components/auth/RegisterForm.tsx

Format: see template in docs-structure
```

### Update Context (Final)

```
Mark the iteration as completed:

  ## Status
  🟢 Completed

  ## Work Done
  - [x] Task 1: Users schema
  - [x] Task 2: Register endpoint
  ...all marked...

  ## Feature completed: ✅
  → Recorded in memory/2026-04.md
```

---

## No-Drift Rule (Detailed)

```
DURING implementation, if the agent detects:

TYPE 1 — SCOPE CREEP:
  "To complete the lockout A/C, I would need to
   implement a general rate limiting system."
  → PAUSE. This exceeds the feature scope.
  → Propose: implement only the minimum for the A/C,
    or create a derived feature for full rate limiting.

TYPE 2 — MISSING DEPENDENCY:
  "The login needs to send a verification email but there's no
   email service configured."
  → PAUSE. Report the dependency.
  → Propose: configure email service as an additional task,
    or mark A/C as blocked and continue with the rest.

TYPE 3 — INCONSISTENCY:
  "The A/C says redirect to /dashboard but the existing code
   uses /app as the main route."
  → PAUSE. Ask which one is correct.
  → Do NOT assume that the existing code is correct.
```
