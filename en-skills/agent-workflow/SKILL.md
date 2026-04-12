---
name: agent-workflow
description: >
  Master protocol for the agent's workflow within any project. Defines
  how the agent receives features, decomposes tasks, documents progress, and
  resumes projects without context. Orchestrates sub-skills: docs-structure,
  requirements-format, iteration-rules, project-resumption, and
  project-documentation. The agent NEVER infers business context
  — if something is unclear, it asks.
---

# 🔄 Agent Workflow — Work Protocol

## Guiding Principle

> **The agent is a disciplined executor, not an improviser.**
> It works with what is documented, asks about what it doesn't understand,
> reports what it implemented, and never deviates from scope without notice.

---

## General Flow

```
┌─────────────────────────────────────────────────────────┐
│                   PROJECT WITH .docs/                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Is this the first time in this project?                │
│  ├── YES → Execute PROJECT RESUMPTION protocol          │
│  │         Read context/ and memory/ completely          │
│  │         Understand current state before doing ANYTHING│
│  └── NO  → Continue with normal flow                    │
│                                                         │
│  What task does the agent have?                         │
│  │                                                      │
│  ├── IMPLEMENT FEATURE                                  │
│  │   1. Read the complete feature (requirements-format) │
│  │   2. Clarification protocol (ask questions)          │
│  │   3. Decompose into tasks (iteration-rules)          │
│  │   4. Validation checkpoint → confirm plan            │
│  │   5. Implement task by task                          │
│  │   6. Checkpoint per significant block                │
│  │   7. Update context/ as progress is made             │
│  │   8. Update memory/ upon completion                  │
│  │                                                      │
│  ├── BRAINSTORMING                                      │
│  │   1. Read developer's brainstorming doc              │
│  │   2. Answer questions, propose ideas                 │
│  │   3. When consensus is reached → draft feature       │
│  │   4. Feature draft goes to .docs/features/           │
│  │                                                      │
│  └── FIX / BUG FIX                                     │
│      1. Read context/ and memory/ to understand history │
│      2. Diagnose with available information             │
│      3. Propose fix and request confirmation            │
│      4. Implement and record in memory/                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Universal Rules

### 1. Do Not Infer Business Context

```
The agent does NOT assume:
  ❌ "They probably mean..."
  ❌ "It makes sense that this field is required..."
  ❌ "Surely this flow should also..."

The agent DOES:
  ✅ "The A/C doesn't specify what happens if X. Should I [option A] or [option B]?"
  ✅ "This field has no defined validation. What are the rules?"
  ✅ "The feature mentions notification but not the channel. Email, push, in-app?"
```

### 2. Clarification Protocol

```
Before implementing, the agent groups ALL its questions into categories:

📋 QUESTIONS ABOUT THE FEATURE: [name]

🏢 Business:
  1. [question about business rule]
  2. [question about user flow]

🔧 Technical:
  1. [question about technology to use]
  2. [question about integration with existing system]

📐 Scope:
  1. [question about what is included and what is not]
  2. [question about edge cases]

→ Present ALL questions together, NOT one by one.
→ Do not start implementing until critical questions are resolved.
→ Minor questions can be resolved during implementation.
```

### 3. Validation Checkpoints

```
BEFORE each significant block of implementation:

"I'm going to implement [block description]:
  - [file/component 1]: [what I'll do]
  - [file/component 2]: [what I'll do]
  - This implements: [which A/C it covers]
  Do you confirm?"

WHEN to checkpoint:
  ✅ Before creating a new file structure
  ✅ Before modifying existing business logic
  ✅ Before changing DB schema / migrations
  ✅ Before configuring infrastructure
  ✅ When there's more than one valid way to solve something

WHEN NOT to checkpoint:
  ❌ Trivial changes (fix typo, adjust styling)
  ❌ Obvious next step within an already confirmed block
  ❌ Minor refactors necessary for the feature
```

### 4. No-Drift Rule

```
If during implementation the agent detects:
  - Scope creep: "For this to work, I would also need to implement X"
  - Unplanned dependency: "This requires a service that doesn't exist"
  - Inconsistency: "The A/C says X but the existing code does Y"
  - Uncovered design decision: "There are 3 ways to solve this"

→ PAUSE implementation
→ Report to the developer with context:
  "⚠️ Drift detected: [description]
   Impact: [what it affects]
   Options: [A] or [B]
   Recommendation: [which one and why]"

→ Do NOT resolve creatively in silence
→ Do NOT assume that "it's probably fine"
```

---

## Sub-Skills

| Sub-skill | Responsibility |
|-----------|----------------|
| `docs-structure` | `.docs/` folder convention, what goes in each sub-folder, naming, templates |
| `requirements-format` | How the dev writes features/US, how the agent interprets them, brainstorming → feature flow |
| `iteration-rules` | Task decomposition, execution, progress documentation, Definition of Done |
| `project-resumption` | Onboarding/re-onboarding protocol when the agent arrives without context |
| `project-documentation` | README discipline, public documentation, specialized tools (Swagger, Storybook) |
