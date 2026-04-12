---
name: requirements-format
description: >
  Defines how the developer writes features/User Stories and how the agent
  interprets them. Covers the feature.md format (overview, goals, A/C, tech notes),
  the flow from brainstorming to ready feature, and the clarification protocol
  the agent executes before implementing. If something is unclear, the agent
  ALWAYS asks — it never infers business context.
---

# 📝 Requirements Format — How Features Are Written and Read

## Principle

> **A well-written feature is 80% of the work.**
> The developer writes the WHAT and the WHY.
> The agent executes the HOW. If the WHAT is unclear, the agent asks.

---

## Feature Format (`feature.md`)

Each feature lives in `.docs/features/{feature-name}/feature.md` and has
4 mandatory sections:

```markdown
# {Feature Name}

## Overview
[General description of the feature in 2-5 sentences.
What it is, who it's for, and why it exists.
Should give enough context for someone who doesn't know the project
to understand the intention.]

## Goals
[List of objectives this feature must achieve.
These are high-level expected outcomes, not implementation details.]

- Goal 1: ...
- Goal 2: ...
- Goal 3: ...

## Acceptance Criteria
[Specific and verifiable list of conditions that must be met
to consider the feature COMPLETE. Each A/C must be testable.]

- [ ] AC-1: ...
- [ ] AC-2: ...
- [ ] AC-3: ...

## Tech Notes
[Optional technical notes from the developer. May include:
implementation preferences, constraints, references to existing
code, external APIs to use, or decisions already made.
If empty, the agent has full technical freedom.]

- ...
```

---

## Section by Section

### Overview

```
Answers:
  - What is this feature?
  - Who is it for? (end user, admin, internal system)
  - Why does it exist? (problem it solves, opportunity it captures)
  - How does it fit into the overall product?

Good:
  "Authentication system that allows users to register
   and sign in with email and password. It's the foundation for the
   entire permissions system. Current users can only see the
   landing page — this gives them access to the dashboard."

Bad:
  "Login."
  "Do the auth."
  "Like the other app but different."
```

### Goals

```
Answers:
  - What outcomes should this feature have?
  - What changes for the user once it's implemented?

Good:
  - Users can create an account with email and password
  - Users can sign in and maintain an active session
  - Unauthenticated users are redirected to login
  - Passwords are stored securely (hash + salt)

Bad:
  - Do the login
  - Make it work
  - Full auth
```

### Acceptance Criteria (A/C)

```
GOLDEN RULE: If it can't be tested, it's not an acceptance criterion.

Format: checkboxes so the agent can track progress.
Each A/C is a binary condition: it's met or it's not.

Good:
  - [ ] The registration form asks for: name, email, password, confirm password
  - [ ] Email is validated for valid format and uniqueness in DB
  - [ ] Password requires minimum 8 characters, 1 uppercase, 1 number
  - [ ] Upon registering, the user receives a verification email
  - [ ] On successful login, redirects to /dashboard
  - [ ] On failed login, shows generic error (don't reveal if email exists)
  - [ ] After 5 failed attempts, lock account for 15 minutes
  - [ ] Protected routes (/dashboard, /settings) redirect to /login if no session
  - [ ] Session token expires in 15 minutes with automatic refresh

Bad:
  - [ ] Login works
  - [ ] Looks good
  - [ ] Is secure
  - [ ] Errors are handled

Recommended pattern for each A/C:
  "Given [context], when [action], then [expected result]"

  Example:
  - [ ] Given a user with 5 failed attempts, when they try to login
        again, then they see the message "Account locked, try again in 15 min"
```

### Tech Notes

```
OPTIONAL section from the developer. The agent respects it as a directive.

May contain:
  - Library preference: "Use Resend for email sending"
  - Constraint: "Don't use ORM, direct SQL queries with Drizzle"
  - Reference: "The base component is at src/components/ui/Form.tsx"
  - External API: "Payment API documentation: [link]"
  - Schema: "The users table already has name and email fields"
  - Decision made: "JWT in httpOnly cookie, not localStorage"

If Tech Notes is empty:
  → The agent has freedom to choose the technical implementation
  → But ALWAYS shows its plan in the validation checkpoint
  → And justifies relevant technical decisions
```

---

## Flow: Brainstorming → Feature

```
STAGE 1: BRAINSTORMING (.docs/brainstorming/)
  The developer has a shapeless idea.
  Creates a file with free-form structure.
  Interacts with the agent in the Q&A section.
  The agent helps to:
    - Identify scope
    - Evaluate technical feasibility
    - Propose alternatives
    - Ask questions the dev didn't consider

STAGE 2: MATURATION
  When the brainstorming has clear answers to:
    ✅ What is it? (overview)
    ✅ What's it for? (goals)
    ✅ How is it verified? (A/C)
  → It's ready to graduate to a feature.

STAGE 3: GRADUATION
  The developer (not the agent) creates the folder in .docs/features/
  and writes the formal feature.md.
  The agent can suggest: "This brainstorming seems ready to
  become a feature. Do you want me to help draft it?"

STAGE 4: IMPLEMENTATION
  With the complete feature.md, the agent executes the
  iteration-rules protocol.
```

---

## Agent Clarification Protocol

When the agent receives a feature to implement:

### Step 1: Complete Reading

```
Read the full feature.md. Do NOT start implementing while reading.
Also read:
  - .docs/rules/ → applicable business rules
  - .docs/context/ → latest project state
  - Relevant existing code → understand what already exists
```

### Step 2: Classify Questions

```
Categorize everything that is unclear:

🏢 BUSINESS (blockers — do not implement without an answer):
  Questions about business rules, user flows, permissions,
  expected behavior in edge cases.

🔧 TECHNICAL (resolve or propose):
  Questions about what technology to use, how to integrate with existing
  systems, implementation patterns. The agent can propose and request
  confirmation at the checkpoint.

📐 SCOPE (clarify):
  Does this include X? What about the case of Y? Is error Z handled here
  or in another feature?
```

### Step 3: Present Grouped Questions

```
📋 QUESTIONS — Feature: {name}

🏢 Business:
  1. The A/C says "lock after 5 attempts" — does it apply per IP,
     per email, or both?
  2. Is the verification email mandatory to use the app or
     can they verify later?

🔧 Technical:
  1. There are no Tech Notes about email sending. Is there a preferred
     service (Resend, SES, SendGrid)?

📐 Scope:
  1. Is "forgot password" part of this feature or will it be another?
  2. Is login with Google/GitHub implemented here or later?

→ Business questions are BLOCKERS.
→ Technical and Scope questions can be resolved in parallel.
```

### Step 4: Wait for Answers (business) → Plan (technical)

```
With the business answers, the agent:
  1. Updates its understanding of the feature
  2. Decomposes into tasks (see iteration-rules)
  3. Presents a validation checkpoint with the plan
  4. Waits for confirmation before implementing
```

---

## Derived Features

```
Sometimes during implementation, needs appear that aren't
in the original feature.

The agent does NOT implement them as "bonuses":
  ❌ "While I was at it, I also did forgot password"

The agent documents them as derived features:
  ✅ "During auth-login I detected that forgot-password is needed.
      Should I add it as a separate feature in .docs/features/?"

Rule: each feature is implemented with its scope as defined.
If something new appears → new feature.
```

---

## Anti-patterns

```
❌ Feature without Overview → the agent doesn't know the context
❌ Feature without A/C → the agent doesn't know when it's done
❌ Vague A/C ("works well", "looks nice") → not testable
❌ The agent assuming answers to business questions
❌ The agent implementing without reading rules/ first
❌ Questions one by one → group and present together
❌ The agent editing the developer's feature.md
❌ Brainstorming that jumps straight to code without graduating to a feature
❌ Feature with infinite scope (no clear boundaries)
❌ Tech Notes that contradict rules/ → alert the developer
```
