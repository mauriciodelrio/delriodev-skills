---
name: package-management-rules
description: >
  Use this skill when managing dependencies with pnpm: installation,
  updates, lockfile, security auditing, versioning strategy,
  overrides/patches, and dependency cleanup.
---

# Package Management (pnpm)

## Agent workflow

1. Evaluate whether the dependency is necessary (section 5 checklist) before adding it.
2. Use ranges by criticality: exact pin for React/Next/TS, caret for utilities (section 3).
3. Keep `.npmrc` configured and `packageManager` declared in `package.json` (section 2).
4. Always `--frozen-lockfile` in CI, `pnpm audit` before deploy (section 7).
5. Overrides for vulnerabilities in sub-dependencies, patches for upstream bugs (section 4).

## 1. Essential Commands

```bash
pnpm install --frozen-lockfile   # CI — fails if lockfile doesn't match

pnpm add react-hook-form         # dependencies
pnpm add -D vitest               # devDependencies
pnpm add -D -w eslint            # workspace root (monorepo)

pnpm update                      # According to package.json range
pnpm update --latest             # Latest version (ignores range)
pnpm update react --latest

pnpm remove lodash
pnpm outdated

pnpm audit
pnpm audit --fix

pnpm store prune
pnpm dedupe
```

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
{
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

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

## 4. Overrides and Patches

```json
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
pnpm patch buggy-lib@1.2.3
pnpm patch-commit <temporary-folder>
```

## 5. Dependency Evaluation (Before Installing)

Before `pnpm add <package>`:

1. **Is it necessary?** — Can it be done with native browser/Node.js APIs?
2. **Size** — Check on [bundlephobia.com](https://bundlephobia.com) or `import-cost` extension
3. **Maintenance** — Last release < 6 months? Active issues?
4. **Downloads** — > 10K/week? (adoption indicator)
5. **Tree-shakeable** — Does it export ESM? Supports named imports?
6. **Types** — Includes TypeScript types or `@types/*` exists?
7. **License** — Compatible with the project? (MIT, Apache 2.0 → OK)

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

## 7. CI — Dependency Pipeline

```yaml
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

## Gotchas

- `npm install` in a pnpm project generates conflicting `package-lock.json` — always use `pnpm install`.
- Not committing `pnpm-lock.yaml` causes non-reproducible builds.
- `pnpm install` without `--frozen-lockfile` in CI may install different versions than tested.
- Runtime dependencies in `devDependencies` (or vice versa) breaks production builds.
- Ignoring `pnpm audit` warnings in production exposes known vulnerabilities.
- Floating versions (`"*"` or `"latest"`) cause unpredictable builds.
