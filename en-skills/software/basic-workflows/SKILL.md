---
name: basic-workflows
description: >
  Use this skill when creating or configuring a new project. Creates GitHub
  Actions for lint, type-check, tests, build, security audit and bundle
  analysis. Configures branch protection, Dependabot, CODEOWNERS and PR
  template. Every PR must pass all checks before merge.
---

# Basic Workflows

## Agent workflow

1. Create `.github/workflows/ci.yml` with jobs: install → lint → type-check → test → build (in that dependency order)
2. Create `.github/workflows/security.yml` with pnpm audit + CodeQL (daily schedule + on PRs)
3. Create `.github/dependabot.yml` for npm + github-actions with minor/patch grouping
4. Create `.github/CODEOWNERS` and `.github/pull_request_template.md`
5. Configure branch protection on main: require status checks, approvals, linear history
6. Verify that scripts `lint`, `format:check`, `type-check`, `test:ci`, `build` exist in package.json
7. Validate against the Gotchas section before configuring workflows

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

## Gotchas

- Workflows without node_modules cache produce slow builds — use `actions/cache` with key based on `pnpm-lock.yaml`.
- Never allow `[skip ci]` without restriction — checks exist to protect main.
- Main branch without protection allows direct push — always configure branch protection rules.
- PRs without required status checks allow merge without CI — mark Lint, Type Check, Tests, Build as required.
- Never `pnpm install` without `--frozen-lockfile` in CI — without it the lockfile can mutate and cause inconsistencies.
- Never hardcode secrets in workflows — use GitHub Secrets (`${{ secrets.NAME }}`).
- Workflows running on push to all branches waste CI minutes — limit to `main` and `develop`.
- Ignoring Dependabot security alerts leaves vulnerabilities open — review and update weekly.
- Putting build as first step wastes CI if lint fails — order: lint → type-check → test → build.
- Without `concurrency` with `cancel-in-progress`, old PRs consume runners unnecessarily.
