---
name: requirements-format
description: >
  Use this skill when the agent receives a feature to implement, needs to
  interpret a feature.md, or participates in a brainstorming that could graduate
  to a feature. Also applies when the agent detects an incomplete feature
  (no overview, no A/C, vague A/C) and needs to request clarification before
  implementing. If anything about business logic is unclear, the agent asks
  — never infers.
---

# Requirements Format — How Features Are Written and Read

The developer writes the WHAT and the WHY. The agent executes the HOW. If the WHAT is unclear, the agent asks.

## Feature format (`feature.md`)

Each feature lives in `.docs/features/{feature-name}/feature.md` with 4 mandatory sections:

```markdown
# {Feature Name}

## Overview
[General description in 2-5 sentences: what it is, who it's for, why it exists.
Enough context for someone who doesn't know the project.]

## Goals
[High-level expected outcomes, not implementation details.]

- Goal 1: ...
- Goal 2: ...

## Acceptance Criteria
[Specific, verifiable conditions. Each A/C must be testable.
Recommended pattern: "Given [context], when [action], then [result]".]

- [ ] AC-1: ...
- [ ] AC-2: ...

## Tech Notes
[Optional. Implementation preferences, constraints, references to existing
code, external APIs, decisions already made. If empty, the agent has technical
freedom but shows its plan at the checkpoint.]

- ...
```

## How the agent interprets each section

**Overview** — If it only says "Login" or "Do the auth" without context, the agent asks for expansion before planning. A good overview explains what it is, who it's for, why it exists, and how it fits the product.

**Goals** — These are business outcomes, not technical tasks. If a goal says "do the login" instead of "users can sign in and maintain an active session," ask for reformulation.

**Acceptance Criteria** — Golden rule: if it can't be tested, it's not an A/C. If vague A/C like "works well" or "looks nice" are found, the agent asks for specific, verifiable criteria before implementing.

**Tech Notes** — The agent respects them as directives. If empty, the agent has technical freedom but justifies decisions at the checkpoint. If they contradict `.docs/rules/`, alert the developer.

---

## Flow: Brainstorming → Feature

1. **Brainstorming** — The dev creates a file in `.docs/brainstorming/` with free-form structure. The agent helps identify scope, evaluate feasibility, propose alternatives, and ask questions the dev didn't consider.
2. **Maturation** — When the brainstorming has clear answers to: what is it (overview), what's it for (goals), how is it verified (A/C), it's ready to graduate.
3. **Graduation** — The developer (not the agent) creates the folder in `.docs/features/` and writes the formal `feature.md`. The agent can suggest: "This brainstorming seems ready to become a feature. Do you want me to help draft it?"
4. **Implementation** — With the complete `feature.md`, execute `iteration-rules`.

---

## Clarification protocol

When the agent receives a feature to implement:

1. **Complete reading** — Read `feature.md`, `.docs/rules/`, `.docs/context/`, and relevant existing code. Don't start implementing while reading.
2. **Classify questions** — Business (blockers: business rules, flows, permissions, edge cases), Technical (resolve or propose at checkpoint), Scope (what's included and what's not).
3. **Present grouped questions** — All questions together in a single message, categorized. Business questions are blockers; technical and scope can be resolved in parallel.
4. **Wait for business answers → plan** — With the answers, decompose into tasks (`iteration-rules`), present validation checkpoint, wait for confirmation.

---

## Derived features

If during implementation needs appear outside the feature's scope, the agent doesn't implement them as "bonuses." It documents them and asks: "During [feature] I detected that [X] is needed. Should I add it as a separate feature in `.docs/features/`?" Each feature is implemented with its scope as defined.

---

## Gotchas

- Feature without Overview leaves the agent without context — ask for completion before planning
- Feature without A/C leaves the agent not knowing when it's done — require verifiable A/C
- The agent tends to assume answers to business questions — always ask with concrete options
- The agent must not implement without reading `rules/` first
- Asking questions one by one lengthens the cycle — group and present together
- The agent doesn't edit the developer's `feature.md`, unless the developer explicitly requests it
- Brainstorming that jumps straight to code without graduating to a feature creates undefined scope
- Tech Notes that contradict `rules/` → alert the developer, don't resolve silently
