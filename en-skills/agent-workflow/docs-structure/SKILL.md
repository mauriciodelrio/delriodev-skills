---
name: docs-structure
description: >
  Use this skill when the user wants to organize project documentation, create or
  maintain the .docs/ folder, or define where features, business rules, iteration logs,
  or implementation history should go. Also applies when the agent needs to know where
  to read project context or where to record decisions and completed work, even if the
  user doesn't explicitly mention ".docs/".
---

# Docs Structure — `.docs/` Folder Convention

> `.docs/` is the contract between the developer and the agent.
> Everything the agent needs to know is here. Everything it produces as documentation goes here.

## Agent workflow

1. **When starting work** → read `rules/` and the current month's `memory/` for context
2. **When receiving a feature** → read `.docs/features/<name>/feature.md` and verify it has A/C
3. **During implementation** → create or update `context/iteration-YYYY-MM-DD.md` with progress
4. **When completing a feature** → add entry in `memory/YYYY-MM.md` using the mandatory template
5. **If `.docs/` doesn't exist** → ask the developer whether to create it with the standard structure

## Structure

```
.docs/
├── features/          ← Features to implement (only the developer writes here)
├── brainstorming/     ← Ideas under exploration (agent collaborates when asked)
├── rules/             ← Project rules (consult BEFORE making decisions)
├── context/           ← Iteration log (the agent writes here)
└── memory/            ← Permanent history (the agent writes here)
```

---

## Folder: `features/`

**Writes:** the developer. **Consumes:** the agent. The agent NEVER edits features/, but can propose changes as suggestions.

Each feature has its own folder with a `feature.md` file. Internal structure: see sub-skill `requirements-format`.

Naming: descriptive kebab-case (`auth-login`, `user-profile`). Avoid cryptic IDs (`US-001`) or vague names (`update`, `changes`).

Optional files per feature:
- `wireframes/` — reference images
- `api-spec.md` — API contracts for the feature
- `data-model.md` — schema or data model

---

## Folder: `brainstorming/`

**Writes:** the developer initiates, the agent collaborates when asked. **Consumes:** both.

Created when an idea needs exploration before becoming a feature. Free-form format, with this suggested structure:

```markdown
# [Idea Name]

## Context
[Why we're exploring this]

## Initial Ideas
- Idea A: ...
- Idea B: ...

## Open Questions
- ...?

## Q&A with Agent
**Dev:** [question or scenario]
**Agent:** [answer, analysis, proposal]

## Conclusions
[What was decided]

## → Derived Feature
[Link to the feature in .docs/features/ when it graduates]
```

When a brainstorming has clear overview + goals + A/C → it graduates to `features/`. The original is kept as historical reference.

---

## Folder: `rules/`

**Writes:** the developer. **Consumes:** the agent. ALWAYS consult before making technical or business decisions.

One file per rules domain with concise bullet points. Typical content:
- High-level business rules
- API conventions (naming, versioning, response format)
- Technical restrictions ("don't use library X")
- Architectural decisions and their justification
- Domain glossary

Example — `business-rules.md`:

```markdown
# Business Rules

## Users
- A user can have a maximum of 3 active workspaces
- The free plan has a limit of 5 members per workspace
- Emails are case-insensitive and normalized to lowercase

## Payments
- Prices always stored in cents (integer)
- Subscriptions charged at the beginning of the period
- No automatic refunds — they require manual approval
```

---

## Folder: `context/`

**Writes:** the agent. **Consumes:** the agent (when resuming), the developer (for oversight).

Log of the current iteration. Created at the start of each significant work session. Naming: `iteration-YYYY-MM-DD.md` (one per day or session).

**CRITICAL RULE:** update context/ DURING work, not just at the end. If the agent disconnects mid-task, context/ must reflect exactly where it left off.

Template:

```markdown
# Iteration — YYYY-MM-DD

## Objective
[Feature or task being implemented]

## Status
🟢 Completed | 🟡 In Progress | 🔴 Blocked

## Work Done
- [x] Completed task
- [ ] Pending task

## Decisions Made
- [Decision and justification]

## Blockers / Pending Questions
- [Question for the developer]

## Next Steps
- [What follows]
```

---

## Folder: `memory/`

**Writes:** the agent. **Consumes:** the agent (when resuming project). Append-only: past entries are NOT edited.

PERMANENT history of what was implemented. Only accomplished facts — never plans or TODOs.

Naming: `YYYY-MM.md` (one file per month).

Mandatory template:

```markdown
# Memory — YYYY-MM

## YYYY-MM-DD — [feature-name]
- **Feature:** [Brief description]
- **Implemented:**
  - [List of what was built]
- **Decisions:**
  - [Why X and not Y]
- **Key files:**
  - [Paths to key files]
```

Memory rules:
- Only record what was actually implemented
- Include relevant technical decisions
- List key files created/modified
- Exact date on each entry

---

## Gotchas

- The agent tends to create a single `context.md` file — it must be one file per iteration/day: `iteration-YYYY-MM-DD.md`
- The agent may want to edit `features/` directly — that is exclusive to the developer; only propose changes as suggestions
- Memory is NOT for TODOs or next steps — only accomplished facts with exact dates
- Do not implement features without defined acceptance criteria (A/C)
- Empty or generic rules ("be consistent") add no value — better to have no rules
- If a brainstorming has overview + goals + A/C → it must graduate to `features/`, not stay indefinitely
- NEVER delete files from `.docs/` without explicit confirmation from the developer
- Memory without dates makes it impossible to reconstruct the project timeline
