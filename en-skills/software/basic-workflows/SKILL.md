---
name: basic-workflows
description: >
  Mandatory basic CI/CD workflows for every new project. This skill is
  activated when creating or configuring a project. Creates GitHub Actions for
  linting, build, tests, security audit, bundle analysis, and type validation.
  Defines branch protection rules and Dependabot configuration. Every PR must
  pass all checks before merge.
---

# ⚙️ Basic Workflows — CI/CD for Every Project

## Guiding Principle

> **If it's not in CI, it doesn't exist.** Every check done locally must
> be replicated in CI. A PR without green checks doesn't get merged — no exceptions.

---

## File Structure

```
.github/
├── workflows/
│   ├── ci.yml                    ← Main workflow (lint + type-check + test + build)
│   ├── security.yml              ← Dependency audit + CodeQL
│   └── bundle-analysis.yml       ← Bundle size analysis (optional but recommended)
├── dependabot.yml                ← Automatic dependency updates
├── pull_request_template.md      ← PR template
└── CODEOWNERS                    ← Owners per directory
```

---

## 1. Main Workflow — CI

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '9'

jobs:
  # ──────────────────────────────────────
  # Install dependencies (shared cache)
  # ──────────────────────────────────────
  install:
    name: Install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - uses: actions/cache/save@v4
        with:
          path: |
            node_modules
            ~/.pnpm-store
          key: deps-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}

  # ──────────────────────────────────────
  # Lint (ESLint + Prettier)
  # ──────────────────────────────────────
  lint:
    name: Lint
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - uses: actions/cache/restore@v4
        with:
          path: |
            node_modules
            ~/.pnpm-store
          key: deps-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}

      - name: ESLint
        run: pnpm lint

      - name: Prettier check
        run: pnpm format:check

  # ──────────────────────────────────────
  # Type Check (TypeScript)
  # ──────────────────────────────────────
  type-check:
    name: Type Check
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - uses: actions/cache/restore@v4
        with:
          path: |
            node_modules
            ~/.pnpm-store
          key: deps-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}

      - run: pnpm type-check

  # ──────────────────────────────────────
  # Tests (Unit + Integration)
  # ──────────────────────────────────────
  test:
    name: Tests
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - uses: actions/cache/restore@v4
        with:
          path: |
            node_modules
            ~/.pnpm-store
          key: deps-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}

      - name: Run tests with coverage
        run: pnpm test:ci

      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

  # ──────────────────────────────────────
  # Build
  # ──────────────────────────────────────
  build:
    name: Build
    needs: [lint, type-check, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - uses: actions/cache/restore@v4
        with:
          path: |
            node_modules
            ~/.pnpm-store
          key: deps-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}

      - name: Build
        run: pnpm build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: |
            .next/
            dist/
          retention-days: 1
```

---

## 2. Security Workflow

```yaml
# .github/workflows/security.yml
name: Security

on:
  pull_request:
    branches: [main, develop]
  schedule:
    # Run daily at 6:00 UTC (continuous audit)
    - cron: '0 6 * * *'

permissions:
  security-events: write
  contents: read

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '9'

jobs:
  # ──────────────────────────────────────
  # Dependency audit (pnpm audit)
  # ──────────────────────────────────────
  audit:
    name: Dependency Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Audit dependencies
        run: pnpm audit --audit-level=high

  # ──────────────────────────────────────
  # CodeQL — Static code analysis
  # ──────────────────────────────────────
  codeql:
    name: CodeQL Analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
          queries: security-and-quality

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: '/language:javascript-typescript'
```

---

## 3. Bundle Analysis Workflow

```yaml
# .github/workflows/bundle-analysis.yml
name: Bundle Analysis

on:
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '9'

jobs:
  analyze:
    name: Analyze Bundle Size
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Build and analyze
        run: ANALYZE=true pnpm build

      # For Next.js: report First Load JS size
      - name: Report bundle size
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const path = '.next/analyze/client.html';
            if (fs.existsSync(path)) {
              const stats = fs.statSync(path);
              console.log(`Bundle analysis report generated (${stats.size} bytes)`);
            }

      - name: Upload analysis
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: bundle-analysis
          path: .next/analyze/
          retention-days: 7
```

---

## 4. Dependabot

```yaml
# .github/dependabot.yml
version: 2
updates:
  # npm dependencies
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
      day: 'monday'
      time: '09:00'
      timezone: 'America/Mexico_City'
    open-pull-requests-limit: 10
    reviewers:
      - 'team-lead-username'
    labels:
      - 'dependencies'
      - 'automated'
    commit-message:
      prefix: 'chore(deps)'
    groups:
      # Group minor updates to reduce noise
      minor-and-patch:
        update-types:
          - 'minor'
          - 'patch'
    ignore:
      # Exclude automatic major bumps for critical frameworks
      - dependency-name: 'next'
        update-types: ['version-update:semver-major']
      - dependency-name: 'react'
        update-types: ['version-update:semver-major']

  # GitHub Actions
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'weekly'
    labels:
      - 'ci'
      - 'automated'
    commit-message:
      prefix: 'ci(deps)'
```

---

## 5. CODEOWNERS

```
# .github/CODEOWNERS
# These users are automatically assigned as reviewers.

# Default: entire repo
* @team-lead-username

# Workflows and CI
.github/ @devops-username @team-lead-username

# Example by area (adjust to your team)
# src/features/payments/ @payments-team
# src/features/auth/     @security-team
```

---

## 6. Branch Protection Rules

Configure in **GitHub → Settings → Branches → Add rule** for `main`:

```
Branch name pattern: main

✅ Require a pull request before merging
  ✅ Require approvals: 1 (minimum)
  ✅ Dismiss stale pull request approvals when new commits are pushed
  ✅ Require review from Code Owners

✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  Status checks required:
    - Lint
    - Type Check
    - Tests
    - Build
    - Dependency Audit

✅ Require conversation resolution before merging

✅ Require linear history (forces rebase/squash, prevents merge commits)

✅ Include administrators (rules apply to everyone)

❌ Allow force pushes → NEVER on main
❌ Allow deletions → NEVER on main
```

### Automate via GitHub CLI (optional)

```bash
# Create branch protection rule via CLI
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Lint","Type Check","Tests","Build","Dependency Audit"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

### For `develop` (if applicable)

```
Same rules as main EXCEPT:
- Approvals: 1 (instead of 2 if main requires 2)
- Allow squash merge: yes
```

---

## 7. PR Template

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

## 8. Required Scripts in package.json

The workflows assume these scripts. They must exist in every project:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ci": "vitest run --coverage",
    "test:e2e": "playwright test",
    "prepare": "husky"
  }
}
```

---

## Initial Setup Checklist

When creating a new project, verify that ALL of this exists:

- [ ] `.github/workflows/ci.yml` — Lint + Type Check + Tests + Build
- [ ] `.github/workflows/security.yml` — pnpm audit + CodeQL
- [ ] `.github/dependabot.yml` — Automatic updates
- [ ] `.github/pull_request_template.md` — PR template
- [ ] `.github/CODEOWNERS` — Automatic reviewer assignment
- [ ] Branch protection rules configured on `main`
- [ ] Scripts `lint`, `format:check`, `type-check`, `test:ci`, `build` in package.json
- [ ] Husky + lint-staged + commitlint configured (see `git-usage` skill)

---

## Anti-patterns

```yaml
# ❌ Workflows that DON'T cache node_modules → slow builds
# ❌ Checks that can be skipped with [skip ci] without restriction
# ❌ main branch without protection → direct push possible
# ❌ PRs without required status checks → merge without CI
# ❌ pnpm install without --frozen-lockfile in CI → inconsistent lockfile
# ❌ Hardcoded secrets in workflows → use GitHub Secrets
# ❌ Workflows that run on push to ALL branches → wasted CI minutes
# ❌ Ignoring Dependabot security alerts
# ❌ Build as first step → wastes CI if lint fails
# ❌ Without concurrency → old PRs consume runners unnecessarily
```
