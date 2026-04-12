---
name: package-management-rules
description: >
  Package management rules with pnpm. Covers dependency installation and updates,
  lockfile management, security auditing, versioning strategy,
  overrides/patches, and dependency cleanup.
---

# 📦 Package Management (pnpm)

## Guiding Principle

> **pnpm by default.** Lockfile always in Git. Audit before deploy.
> Every added dependency must be justified.

---

## 1. Essential Commands

```bash
# Install dependencies (respects lockfile)
pnpm install --frozen-lockfile   # CI — fails if lockfile doesn't match

# Add dependency
pnpm add react-hook-form         # dependencies
pnpm add -D vitest               # devDependencies
pnpm add -D -w eslint            # workspace root (monorepo)

# Update
pnpm update                      # According to package.json range
pnpm update --latest             # Latest version (ignores range)
pnpm update react --latest       # Only react

# Remove
pnpm remove lodash

# View outdated
pnpm outdated                    # Lists deps with newer versions

# Security audit
pnpm audit                       # Known vulnerabilities
pnpm audit --fix                 # Auto-fix when possible

# Cleanup
pnpm store prune                 # Clean pnpm global store
pnpm dedupe                      # Reduce duplicates in lockfile
```

---

## 2. pnpm Configuration

```yaml
# .npmrc
auto-install-peers=true
strict-peer-dependencies=false
shamefully-hoist=false
resolution-mode=highest
prefer-frozen-lockfile=true

# Private registries (if applicable)
# @company:registry=https://npm.company.com/
```

```json
// package.json — Required engine
{
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

```javascript
// .nvmrc or .node-version
// 20.18.0
```

---

## 3. Versioning Strategy

```
Critical dependencies (React, Next.js, TypeScript):
  → Pin exact: "react": "19.0.0"
  → Update manually with testing

Utility dependencies (date-fns, clsx, zod):
  → Caret range: "zod": "^3.23.0"
  → Update with pnpm update

DevDependencies (ESLint, Prettier, Vitest):
  → Caret range: "vitest": "^2.0.0"
  → Update frequently

Rule: If an update breaks something, NEVER ignore — investigate and fix.
```

---

## 4. Overrides and Patches

```json
// package.json — Force sub-dependency versions
{
  "pnpm": {
    "overrides": {
      "glob@<9": ">=9.0.0",
      "semver@<7.5.2": ">=7.5.2"
    },
    "patchedDependencies": {
      "buggy-lib@1.2.3": "patches/buggy-lib@1.2.3.patch"
    }
  }
}
```

```bash
# Create patch for a package
pnpm patch buggy-lib@1.2.3
# Edit files in the temporary folder...
pnpm patch-commit <temporary-folder>
# Automatically generates patches/buggy-lib@1.2.3.patch
```

---

## 5. Dependency Evaluation (Before Installing)

Before `pnpm add <package>`:

1. **Is it necessary?** — Can it be done with native browser/Node.js APIs?
2. **Size** — Check on [bundlephobia.com](https://bundlephobia.com) or `import-cost` extension
3. **Maintenance** — Last release < 6 months? Active issues?
4. **Downloads** — > 10K/week? (adoption indicator)
5. **Tree-shakeable** — Does it export ESM? Supports named imports?
6. **Types** — Includes TypeScript types or `@types/*` exists?
7. **License** — Compatible with the project? (MIT, Apache 2.0 → OK)

```bash
# Check bundle size before installing
npx import-cost   # VS Code extension alternative
```

---

## 6. package.json Scripts

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
    "analyze": "ANALYZE=true next build",
    "clean": "rm -rf .next node_modules/.cache",
    "prepare": "husky"
  }
}
```

---

## 7. CI — Dependency Pipeline

```yaml
# .github/workflows/ci.yml (snippet)
- name: Install pnpm
  uses: pnpm/action-setup@v4

- name: Install dependencies
  run: pnpm install --frozen-lockfile

- name: Audit
  run: pnpm audit --audit-level=high

- name: Type check
  run: pnpm type-check

- name: Lint
  run: pnpm lint

- name: Test
  run: pnpm test:ci
```

---

## Anti-patterns

```bash
# ❌ npm install in a pnpm project (generates conflicting package-lock.json)
# ❌ Not committing pnpm-lock.yaml
# ❌ pnpm install without --frozen-lockfile in CI
# ❌ Adding dependencies without evaluating size/maintenance
# ❌ Runtime dependencies in devDependencies (or vice versa)
# ❌ Ignoring pnpm audit warnings in production
# ❌ node_modules in the repo (add to .gitignore)
# ❌ Floating versions without caret/tilde: "*" or "latest"
```
