---
name: agent-workflow
description: >
  Use this skill as the agent's master protocol in any project.
  Applies whenever the agent receives a task (feature, bug fix, brainstorming)
  or arrives at a project without context. Orchestrates sub-skills:
  docs-structure, requirements-format, iteration-rules, project-resumption,
  and project-documentation. If anything about business logic is unclear,
  the agent asks — never infers.
---

# Agent Workflow — Work Protocol

The agent is a disciplined executor: it works with what is documented, asks about what it doesn't understand, reports what it implemented, and never deviates from scope without notice.

## General flow

### Entering the project

If it's the first time or the agent doesn't have fresh context, execute `project-resumption` before anything else.

### By task type

**Implement feature:**

1. Read the complete feature (`requirements-format`)
2. Group all questions and present them together (see Clarification protocol)
3. Decompose into tasks (`iteration-rules`) and confirm plan with the dev
4. Implement task by task with checkpoints per significant block
5. Update `context/` as progress is made, `memory/` upon completion

**Brainstorming:**

1. Read the developer's brainstorming doc
2. Answer questions, propose ideas
3. When consensus is reached, draft the feature in `.docs/features/`

**Fix / Bug fix:**

1. Read `context/` and `memory/` to understand history
2. Diagnose, propose fix, request confirmation
3. Implement and record in `memory/`

---

## Universal rules

### Do not infer business context

The agent does not assume business rules, validations, or flows that aren't documented. If the A/C doesn't specify what happens in a case, ask with concrete options: "The A/C doesn't specify X. Should I [option A] or [option B]?"

### Clarification protocol

Before implementing, group **all** questions into categories (business, technical, scope) and present them together in a single message. Don't ask one by one. Don't start implementing until critical questions are resolved; minor ones can be resolved during implementation.

### Validation checkpoints

Before each significant block, present what will be implemented, which files are affected, and which A/C it covers. Ask for confirmation.

Checkpoint before: creating new file structure, modifying existing business logic, changing DB schema, configuring infrastructure, or when there's more than one valid way to solve something. Don't checkpoint for trivial changes or obvious next steps within an already confirmed block.

### No-Drift rule

If during implementation the agent detects scope creep, unplanned dependencies, inconsistencies between A/C and existing code, or uncovered design decisions: **pause**, report to the developer with context (what was detected, impact, options, recommendation). Don't resolve creatively in silence or assume "it's probably fine."

---

## Connection with implementation skills

When moving from planning to execution, the agent **must** consult [`software`](../software/SKILL.md) to activate the correct skills based on the task type (frontend, backend, architecture). `software` is the orchestrator that routes to technical sub-skills and automatically activates mandatory cross-cutting ones (`clean-code-principles`, `typescript-patterns`, `git-usage`).

Full flow: `agent-workflow` (protocol) → `software` (technical routing) → specific sub-skills (implementation).

If the feature involves personal data, tokens, cookies, or regulations → also consult [`governance-risk-and-compliance`](../governance-risk-and-compliance/SKILL.md).

---

## Sub-skills

| Sub-skill | When invoked |
|-----------|-------------|
| `docs-structure` | Create or verify `.docs/` structure |
| `requirements-format` | Interpret features/US or brainstorming → feature |
| `iteration-rules` | Decompose tasks, execute, document progress |
| `project-resumption` | Arrive at a project without context or resume after inactivity |
| `project-documentation` | Create/update README or decide where public documentation goes |
