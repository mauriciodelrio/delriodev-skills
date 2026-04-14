---
name: iteration-rules
description: >
  Use this skill when the agent is about to implement a feature or work block.
  Defines the full cycle: decompose into tasks, present plan, execute with
  checkpoints, handle deviations (no-drift), verify A/C, and close with context/
  and memory/. Applies whenever there is code to implement, even if the user doesn't
  explicitly mention "iteration" or "plan".
---

# Iteration Rules — Task Execution

## Iteration Flow

1. **Decomposition** → split feature into atomic tasks, order by dependency
2. **Plan** → present task list to the developer and request confirmation — do NOT implement without confirmation
3. **Execution** → per task: implement, write tests, checkpoint each significant block, update `context/`
4. **Verification** → verify each A/C individually, tests pass, no regressions
5. **Closure** → update `memory/` with what was implemented, mark feature as completed in `context/`

If a deviation is detected during execution → apply no-drift rule (see section below).

---

## 1. Task Decomposition

Each task must be: completable in a continuous block, verifiable (clear output), independent or with explicit dependency, and describable in one sentence.

Order bottom-up: data layer → backend → middleware → frontend → integration → tests. Never start with UI if the backend doesn't exist.

---

## 2. Plan

Before touching code, present the plan to the developer:

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

When starting each task, announce what will be done. When completing, confirm what was done. If there were changes from the plan, explain why.

**Block checkpoints:** after completing a logical group of tasks (e.g. entire backend), checkpoint with summary of what was done, A/C covered, and next block. Ask if there are adjustments.

**Context updates:** update `.docs/context/iteration-YYYY-MM-DD.md` at least every 2-3 tasks. Do NOT wait until everything is finished. Format: see skill `docs-structure`.

---

## 4. Verification and Closure

### Pre-Closure Checklist

Before declaring a feature as completed:

- [ ] Each A/C verified individually
- [ ] Tests pass (unit + integration if applicable)
- [ ] No regressions in existing functionality
- [ ] Lint and type-check pass without errors
- [ ] No TODOs or commented-out code left behind
- [ ] New routes/endpoints protected if applicable
- [ ] Errors handled (no empty catches or silent errors)

### Closure

Upon completion: update `memory/` with what was implemented (format: see skill `docs-structure`) and mark feature as completed in `context/` with status 🟢.

---

## No-Drift Rule

During implementation, if the agent detects a deviation, it MUST pause and report before continuing.

**Drift types:**

- **Scope creep** — the task requires implementing something outside the feature → propose the minimum for the A/C, or create a derived feature
- **Missing dependency** — something needed isn't configured → report the dependency, propose as additional task or mark A/C as blocked
- **Inconsistency** — an A/C contradicts existing code → ask which is correct, do NOT assume existing code is right
- **Design decision** — multiple valid options with no definition in rules/ → present options with trade-offs, let the developer decide

**Report format:**

```
⚠️ DRIFT DETECTED — Type: [scope/dependency/inconsistency/design]

Context: [what I was doing]
Problem: [what I found]
Impact: [what's affected if I continue or not]

Options:
A) [option] — [trade-off]
B) [option] — [trade-off]

Recommendation: [which and why]
```

---

## Cross-Cutting Concerns

After implementing each significant block of code, walk through this checklist. For each applicable item, consult the corresponding skill and apply its rules to the newly created code. Only mark the task as completed when all applicable items are met.

- [ ] **Tests** — consult [`frontend/testing-rules`](../testing-rules/SKILL.md) or [`backend/testing`](../testing/SKILL.md). Minimum coverage: 80%
- [ ] **Clean code** — consult [`clean-code-principles`](../clean-code-principles/SKILL.md). JSDoc on public interfaces, named exports, atomic functions
- [ ] **Code quality** — consult [`frontend/code-quality-rules`](../code-quality-rules/SKILL.md). ESLint, naming conventions, imports
- [ ] **Documentation** — consult [`agent-workflow/project-documentation`](../project-documentation/SKILL.md). README updated if: new script, new env var, structure change
- [ ] **Accessibility** (frontend) — consult [`frontend/a11y-rules`](../a11y-rules/SKILL.md). WCAG 2.2 AA
- [ ] **i18n** (user-visible text) — **only if the project has i18n configured** (i18n dependencies in `package.json` and existing translation files). If applicable: consult [`frontend/i18n-react-rules`](../i18n-react-rules/SKILL.md) or [`frontend/i18n-nextjs-rules`](../i18n-nextjs-rules/SKILL.md) based on project type. Do NOT hardcode UI strings. If the project has no i18n, skip this item without reporting drift
- [ ] **Security** — consult [`frontend/security-rules`](../security-rules/SKILL.md) or [`backend/security`](../security/SKILL.md) + [`governance/owasp-top-10`](../owasp-top-10/SKILL.md). Validate inputs, sanitize outputs
- [ ] **Error handling** — consult [`frontend/error-handling-rules`](../error-handling-rules/SKILL.md) or [`backend/error-handling`](../error-handling/SKILL.md). No empty catches, typed errors
- [ ] **Logging** (backend) — consult [`backend/logging`](../logging/SKILL.md). Structured logging, no PII, correlation IDs

### Definition of Done

A feature is DONE when:

1. All A/C are met
2. Tests pass (coverage ≥ 80%)
3. Code follows [`clean-code-principles`](../clean-code-principles/SKILL.md) and `.docs/rules/`
4. Cross-cutting concerns checklist fulfilled
5. No unreported deviations from the plan
6. Context updated with final state
7. Memory updated with what was implemented
8. README updated if applicable

---

## Handling Large Features

If a feature has > 15 tasks or > 15 A/C → propose splitting into sub-features, each with its own `feature.md` in `.docs/features/`. If the developer prefers to keep it as one, group tasks into phases with more frequent checkpoints.

---

## Gotchas

- The agent tends to start coding without presenting the plan — always request confirmation first
- The agent may resolve a deviation silently — all drift must be reported to the developer
- Empty tests or trivial asserts (`expect(true).toBe(true)`) don't count as tests
- Commented-out code as "placeholder" is not valid implementation — implement fully or don't implement
- Don't wait until finishing everything to update `context/` — do it every 2-3 tasks
- Tasks too large ("implement the backend") are not atomic — decompose further
- Tasks too small ("create file X") create unnecessary overhead
- Declaring done without verifying each A/C individually is a frequent mistake
- Memory is only for accomplished facts — never include TODOs or future plans
