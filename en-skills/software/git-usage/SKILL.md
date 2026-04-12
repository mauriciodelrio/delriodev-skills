---
name: git-usage
description: >
  Git usage rules for software projects. Covers Conventional Commits,
  concise commit messages, Husky + lint-staged + commitlint for pre-commit
  validation, granular commits per task, push per feature, branch naming,
  PR template, rebase strategy, and .gitignore.
---

# 🌿 Git Usage — Rules

## Guiding Principle

> **Every commit tells a story.** A clean history is living documentation.
> Small and frequent commits, push only when the feature is complete.

---

## 1. Conventional Commits

Required format:

```
<type>(<scope>): <description>
```

- **Maximum 150 characters** on the first line (type + scope + description).
- Description in **present imperative** and **lowercase** (no trailing period).
- Scope is optional but recommended.

### Allowed Types

| Type       | When to Use                                   | Example                                            |
| ---------- | --------------------------------------------- | -------------------------------------------------- |
| `feat`     | New feature                                   | `feat(cart): add quantity selector to cart items`   |
| `fix`      | Bug fix                                       | `fix(auth): prevent token refresh race condition`   |
| `refactor` | Code change without changing behavior         | `refactor(api): extract validation to middleware`   |
| `style`    | Formatting, spaces, semicolons (not CSS)      | `style: apply prettier formatting`                 |
| `docs`     | Documentation                                 | `docs(readme): add deployment instructions`         |
| `test`     | Add or fix tests                              | `test(products): add unit tests for price calc`     |
| `chore`    | Maintenance tasks, configs, deps              | `chore(deps): upgrade next to 15.2.0`              |
| `ci`       | CI/CD changes                                 | `ci: add lighthouse audit to PR workflow`           |
| `perf`     | Performance improvement                       | `perf(images): lazy load below-the-fold images`     |
| `build`    | Changes to build system or external deps      | `build: configure turborepo cache for ci`           |
| `revert`   | Reverts a previous commit                     | `revert: revert feat(cart) add quantity selector`   |

### Body and Footer (optional)

```
feat(checkout): implement stripe payment integration

Add Stripe Elements for card input with 3D Secure support.
Handle payment intent confirmation and error states.

Closes #142
```

- Body: separated by blank line, explains **what** and **why** (not how).
- Footer: issue references (`Closes #142`, `Refs #99`).

### Breaking Changes

```
feat(api)!: change auth endpoint response format

BREAKING CHANGE: /api/auth/login now returns { token, user }
instead of { accessToken, refreshToken, userData }.
```

---

## 2. Granular Commits — One Commit per Task

```
Rule: each commit represents ONE completed logical unit of work.

Feature: "Add shopping cart"
├── feat(cart): create cart context and provider
├── feat(cart): add CartItem component with quantity controls
├── feat(cart): implement add-to-cart button in product card
├── feat(cart): create cart drawer with item list and totals
├── test(cart): add unit tests for cart operations
├── style(cart): adjust cart drawer responsive layout
└── ← push when the entire feature is complete

❌ BAD: one giant commit "feat: add shopping cart"
❌ BAD: commit with mixed changes "feat+fix+style: cart stuff"
❌ BAD: push after each individual commit
```

### Workflow per Feature

```bash
# 1. Create branch from main/develop
git checkout -b feat/shopping-cart

# 2. Work and commit granularly (WITHOUT pushing)
git add src/features/cart/CartContext.tsx
git commit -m "feat(cart): create cart context and provider"

git add src/features/cart/components/CartItem.tsx
git commit -m "feat(cart): add CartItem component with quantity controls"

# ... more commits for each completed task

# 3. Push when the feature is complete
git push origin feat/shopping-cart

# 4. Create PR
```

---

## 3. Branch Naming

Required format:

```
<type>/<short-description>
```

| Prefix      | Usage                                | Example                          |
| ----------- | ------------------------------------ | -------------------------------- |
| `feat/`     | New feature                          | `feat/shopping-cart`             |
| `fix/`      | Bug fix                              | `fix/login-redirect-loop`        |
| `refactor/` | Refactoring                          | `refactor/auth-middleware`       |
| `chore/`    | Maintenance, configs                 | `chore/upgrade-next-15`          |
| `docs/`     | Documentation                        | `docs/api-endpoints`             |
| `hotfix/`   | Urgent fix in production             | `hotfix/payment-timeout`         |
| `test/`     | Only adding/improving tests          | `test/checkout-e2e`              |
| `release/`  | Prepare release                      | `release/2.1.0`                  |

Rules:
- Only lowercase, numbers, and hyphens (`-`).
- No underscores, spaces, or uppercase.
- Descriptive but short (2–4 words max).

---

## 4. Husky + lint-staged + commitlint

### Installation

```bash
pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional
pnpm exec husky init
```

### commitlint — Validate commit format

```javascript
// commitlint.config.mjs
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Maximum 150 characters in header
    'header-max-length': [2, 'always', 150],
    // Allowed types
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'style', 'docs', 'test', 'chore', 'ci', 'perf', 'build', 'revert'],
    ],
    // Type in lowercase
    'type-case': [2, 'always', 'lower-case'],
    // Description not empty
    'subject-empty': [2, 'never'],
    // No trailing period
    'subject-full-stop': [2, 'never', '.'],
  },
};
```

### Husky hooks

```bash
# .husky/commit-msg — Validate message format
pnpm exec commitlint --edit $1
```

```bash
# .husky/pre-commit — Lint, format, tests, and build
pnpm exec lint-staged
```

### lint-staged — Validate staged files

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --max-warnings=0",
      "prettier --write"
    ],
    "*.{json,md,css,yaml,yml}": [
      "prettier --write"
    ]
  }
}
```

### Pre-push — Tests and build

```bash
# .husky/pre-push — Run tests and build before push
pnpm run type-check && pnpm run test:ci && pnpm run build
```

> **Full flow:**
> `git commit` → commitlint validates message → lint-staged runs ESLint + Prettier on staged files → if everything passes, commit is created.
> `git push` → type-check + tests + build → if everything passes, push is performed.

### Required scripts in package.json

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ci": "vitest run --coverage",
    "build": "next build",
    "prepare": "husky"
  }
}
```

---

## 5. PR Template

Create a file at the repository root:

```markdown
<!-- .github/pull_request_template.md -->

## Description

<!-- Brief summary of the changes made and why. -->



## Checklist

- [ ] Follows Conventional Commits in all messages
- [ ] Granular commits (1 commit = 1 logical task)
- [ ] No `console.log` or commented-out code
- [ ] Correct TypeScript types (no `any`)
- [ ] Tests added/updated for the changes
- [ ] Tests pass locally (`pnpm test:ci`)
- [ ] Successful local build (`pnpm build`)
- [ ] Lint/format without errors (`pnpm lint && pnpm format:check`)
- [ ] Accessibility verified (if UI applies)
- [ ] Responsive verified (if UI applies)

## Tests

<!-- Attach screenshot or test output. -->

### Unit / Integration
<!-- ![tests](url-or-drag-and-drop) -->

### E2E (if applicable)
<!-- ![e2e](url-or-drag-and-drop) -->

## Build

<!-- Attach screenshot of successful build. -->
<!-- ![build](url-or-drag-and-drop) -->

## Additional Notes

<!-- Extra context, technical decisions, trade-offs, etc. Remove if not applicable. -->
```

---

## 6. Rebase Strategy

```bash
# ✅ Before pushing, rebase onto main for linear history
git fetch origin
git rebase origin/main

# ✅ If there are conflicts during rebase
git rebase origin/main
# Resolve conflicts in each file...
git add <resolved-files>
git rebase --continue

# ✅ Abort rebase if something goes wrong
git rebase --abort

# ✅ Interactive rebase to clean up history BEFORE push
git rebase -i HEAD~5   # Review last 5 commits
# pick   → keep
# squash → merge with previous (combine WIP commits)
# reword → change message
# drop   → remove commit

# ❌ NEVER rebase already pushed commits
# ❌ NEVER git push --force on main/develop
```

### Team merge strategy

```
main ← PR with squash merge or merge commit (per team)
  │
  └── feat/shopping-cart ← rebase onto main before PR
        ├── commit 1 (granular)
        ├── commit 2 (granular)
        └── commit 3 (granular)
```

---

## 7. Essential .gitignore

```gitignore
# .gitignore

# Dependencies
node_modules/
.pnpm-store/

# Build
.next/
dist/
out/
build/
.turbo/

# Cache
*.tsbuildinfo
.eslintcache
.prettiercache

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
.idea/

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
playwright-report/
test-results/

# Debug
npm-debug.log*
pnpm-debug.log*

# Sentry
.sentryclirc
```

> **Rule:** `.env.example` with placeholder values IS committed. `.env.local` NEVER.

---

## 8. Additional Rules

### Stashing

```bash
# ✅ Save temporary changes to switch branches
git stash push -m "wip: cart sidebar layout"
git checkout fix/urgent-bug
# ... work on the fix ...
git checkout feat/shopping-cart
git stash pop   # Recover changes
```

### Tagging (Releases)

```bash
# Semantic versioning for releases
git tag -a v2.1.0 -m "release: v2.1.0 — shopping cart feature"
git push origin v2.1.0
```

### Amend (Local commits only)

```bash
# ✅ Fix the last commit (only if NOT pushed)
git add <forgotten-files>
git commit --amend --no-edit     # Add files to the last commit
git commit --amend -m "new message"  # Change message
```

### Recommended aliases

```bash
# ~/.gitconfig
[alias]
  s  = status -sb
  l  = log --oneline --graph -20
  co = checkout
  cb = checkout -b
  cm = commit -m
  ca = commit --amend --no-edit
  df = diff --stat
  ps = push origin HEAD
  pl = pull --rebase origin main
  rb = rebase -i
  st = stash push -m
  sp = stash pop
```

---

## Workflow Summary

```
1. git checkout -b feat/feature-name             ← New branch
2. Work on task 1...
3. git add <files> && git commit                  ← Granular commit
   → commitlint validates message (conventional commit ≤ 150 chars)
   → lint-staged runs ESLint + Prettier
   → If it passes → commit created
4. Repeat steps 2–3 for each task in the feature
5. git fetch origin && git rebase origin/main     ← Sync with main
6. git push origin feat/feature-name              ← Push when complete
   → pre-push runs type-check + tests + build
   → If it passes → push performed
7. Create PR with template                        ← Review
8. Merge to main                                  ← Feature integrated
```

---

## Anti-patterns

```bash
# ❌ git add . && git commit -m "changes"       — meaningless message
# ❌ git commit -m "fix"                         — doesn't follow conventional commits
# ❌ One single commit per feature with 40 files — not granular
# ❌ Push after each commit                      — noise in CI and PRs
# ❌ git push --force on shared branches         — rewrites others' history
# ❌ Commits with .env files or secrets          — data leakage
# ❌ Past-tense messages "added", "fixed"        — use imperative: "add", "fix"
# ❌ Disabling husky with --no-verify            — bypassing validations
# ❌ Branches with names like "test", "temp"     — use prefix + description
# ❌ Unnecessary local merge commits             — use rebase
```
