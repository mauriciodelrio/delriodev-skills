---
name: project-resumption
description: >
  Use this skill when the agent arrives at a project without prior context,
  resumes work after inactivity, or the developer says "let's pick this up"
  / "where did we leave off." Execute the full protocol before implementing
  anything. Does not apply if the agent just completed a task in the same
  session and context is fresh.
---

# Project Resumption — Resuming a Project Without Context

Never act without understanding first. The agent executes this protocol before implementing anything in a project it doesn't have fresh in memory.

## Resumption protocol

### Phase 1: Reconnaissance (read, don't act)

1. **Check for `.docs/`** — If it doesn't exist, ask the dev: "I can't find a `.docs/` folder in the project. Do you want me to create it with the standard structure?"
2. **Read `.docs/memory/`** (most recent first) — Reconstruct timeline of completed features and technical decisions.
3. **Read `.docs/context/`** (most recent first) — Understand current state: work in progress, pending tasks, blockers.
4. **Read `.docs/rules/`** — Understand business rules and conventions. These apply to everything implemented.
5. **Quick code scan** — `package.json` (stack), folder structure, `README.md`. Don't read all the code, just the structure.

The order matters: memory (history) → context (present) → rules (constraints) → features (future). Features is read last to avoid jumping to implementation without context.

### Phase 2: Synthesis

Present a summary to the developer with: project name, stack, implemented features, current state, pending tasks/blockers, and key rules detected. Close with: "Is this correct? Is there anything I should know that isn't documented?"

### Phase 3: Receive task

With confirmed context, receive the task and execute the normal flow (requirements-format → iteration-rules).

---

## Work in progress

If `.docs/context/` shows incomplete work, present to the dev which iteration was in progress, which tasks were completed and which are pending. Ask: "Should we resume from [pending task] or are there priority changes?"

- **If resuming**: read the original feature in `.docs/features/`, review implemented code, continue from where it left off.
- **If switching tasks**: update `context/` marking the iteration as paused and start new task with normal flow.

---

## Without `.docs/`

If the project doesn't have `.docs/`:

1. Ask if they want to create the structure
2. If yes, create `.docs/` with empty sub-folders
3. Do onboarding by reading: `package.json`, `tsconfig.json`, folder structure, `README.md`, `.env.example`, existing tests
4. Create first entry in `memory/` with the observed state (stack, dependencies, file count, tests, CI)

---

## Long projects (> 6 months)

Don't read the entire history line by line. Strategy:

1. Read the last month in full detail
2. Read titles of previous months
3. If something from the past is relevant to the current task, read that entry
4. Ask the dev if there's key historical context

---

## Orientation questions

If documentation is insufficient, the agent can ask:

- **Project**: general state, anything broken/urgent, deadlines
- **Stack**: external services, credentials needed, how to run locally
- **Task**: which feature to tackle, whether there's a feature.md or need to talk first

---

## Gotchas

- The agent tends to start coding without reading `.docs/` — always execute the full protocol
- Reading only `features/` without `memory/` and `context/` leaves the agent unaware of the real state
- Don't trust memory from previous sessions — if it's not in `.docs/` or in the code, it didn't happen
- Reading ALL the code before asking is inefficient — quick scan and ask
- Not presenting a summary of what was understood leaves the dev unsure if the agent understood correctly
- Ignoring `.docs/rules/` leads to contradicting project conventions
- On long projects, reading `memory/` from the beginning is unnecessary — most recent first
- Not updating `context/` when resuming breaks the next resumption
- In multi-agent environments, `.docs/` is the only source of truth — never assume "the other agent surely did X"
