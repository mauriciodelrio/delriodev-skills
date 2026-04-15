---
name: install-dependencies-rules
description: >
  Use this skill ALWAYS before adding, updating, or removing any dependency
  in a Node.js project. Applies to frontend, backend, and monorepos.
  Covers mandatory pnpm usage, exact pinning without carets, querying the
  latest stable version, post-install auditing, protection against compromised
  packages with free tools, and Dependabot for controlled updates.
---

# Dependency Installation Rules

## Agent workflow — every time a dependency is installed

1. **Evaluate** whether the dependency is necessary (section **Before Installing**).
2. **Query** the latest stable version with `pnpm view` before running `pnpm add`.
3. **Install** with pnpm, no carets, with an explicit exact version.
4. **Audit** immediately after installation (`pnpm audit` + `osv-scanner`).
5. **Verify** that CI runs `pnpm audit --audit-level=high` and `osv-scanner`.
6. **Confirm** Dependabot is configured to receive controlled update PRs.

## Cross-references

| Skill | When to activate |
|-------|----------------|
| [`basic-workflows`](../basic-workflows/SKILL.md) | Configuring the `pnpm audit` step in CI and Dependabot in the repository |
| [`security`](../backend/security/SKILL.md) | If the dependency exposes endpoints or handles data — review security implications |

---

## Before Installing — Mandatory Checklist

Before running any `pnpm add`, answer these questions:

| Question | Acceptance criterion |
|----------|---------------------|
| Is it really necessary? | Cannot be implemented with native API (Node.js / browser) in < 30 lines |
| Is it maintained? | Last release < 6 months ago; issues responded to; active repository |
| Does it have adoption? | > 10K weekly downloads on npm |
| Is the version correct? | Checked with `pnpm view <package>` (see next section) |
| Does it have types? | Includes `.d.ts` or `@types/<package>` exists |
| Is it tree-shakeable? | Exports ESM with named imports — doesn't import the entire bundle |
| How much does it weigh? | Check on [bundlephobia.com](https://bundlephobia.com) — prefer an alternative if size is excessive |
| Is the license compatible? | MIT, Apache 2.0, ISC, BSD → OK. GPL → requires approval |
| Is it free from malware? | Scanned with `osv-scanner` or `socket` before merging |

### Query metadata before installing

```bash
# Full summary: description, latest version, maintainers, dist-tags
pnpm view <package>

# Just the latest version
pnpm view <package> version

# All published versions
pnpm view <package> versions --json

# Available tags (latest, next, beta)
pnpm view <package> dist-tags

# Repository, license, and direct dependencies
pnpm view <package> repository license dependencies
```

Always install the **`latest` version** unless there is a documented reason for an older one.

---

## Secure Installation

### Golden rules

1. **pnpm only** — never `npm install` or `yarn add` in the project.
2. **Pin exact, no carets or tildes** — `"zod": "3.23.8"` not `"zod": "^3.23.8"`.
3. **Explicit version** — `pnpm add zod@3.23.8`, not `pnpm add zod` (even though it installs latest, the lockfile gets `^`).
4. **Separate `dependencies` and `devDependencies`** — use `-D` for everything that doesn't reach production.

```bash
# ✅ Correct — exact pin
pnpm add zod@3.23.8
pnpm add -D vitest@2.1.9

# ❌ Incorrect — leaves caret in package.json
pnpm add zod
pnpm add -D vitest
```

### Why no carets?

A caret (`^`) allows `pnpm install` on another machine or in CI to resolve a **higher minor version** without the team consciously deciding to upgrade. The most common supply chain attacks (e.g., `event-stream`, `ua-parser-js`, `colors`) spread exactly this way: via a compromised minor or patch version that silently enters projects using carets.

**Instead**: exact pin + Dependabot creates PRs for each update → the team reviews before merging.

### Configure `.npmrc` to enforce the rule

```ini
# .npmrc
auto-install-peers=true
strict-peer-dependencies=false
shamefully-hoist=false
resolution-mode=highest
prefer-frozen-lockfile=true
# Prevent save-prefix="^" from being added by default
save-exact=true
```

With `save-exact=true`, `pnpm add zod` will save `"zod": "3.23.8"` instead of `"zod": "^3.23.8"` automatically.

### `package.json` — declare environment versions

```json
{
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

### `.nvmrc` — pin Node version

```
20.18.0
```

---

## Day-to-Day Operations

Maintenance commands — do not require the new installation checklist:

```bash
# Monorepo — install at workspace root
pnpm add -D -w eslint

# Update within the range declared in package.json
pnpm update

# Update to latest version (ignores pin) — run audit + tests afterward
pnpm update --latest
pnpm update react --latest          # specific package

# Remove a dependency
pnpm remove lodash

# See what newer versions exist
pnpm outdated

# Global pnpm store maintenance
pnpm store prune                    # free space from unused versions
pnpm dedupe                         # deduplicate lockfile entries
```

---

## Post-Install Audit

Run **both** tools after each installation or update:

### 1. `pnpm audit` (npm advisory database)

```bash
pnpm audit                        # full report
pnpm audit --audit-level=high     # fails only on high/critical
pnpm audit --fix                  # applies automatic overrides when possible
```

### 2. OSV-Scanner (Google's OSV database — free)

Scans `pnpm-lock.yaml` against the Open Source Vulnerabilities database, which is broader than npm's:

```bash
# Install once
brew install osv-scanner           # macOS
# or: go install github.com/google/osv-scanner/cmd/osv-scanner@latest

# Scan project lockfile
osv-scanner --lockfile=pnpm-lock.yaml

# Scan entire directory (lockfiles + SBOM)
osv-scanner --recursive .
```

---

## Free Protection Tools

| Tool | What it detects | How to use | Free |
|------|----------------|------------|------|
| `pnpm audit` | Known CVEs in npm advisory | `pnpm audit` | ✅ Always |
| **OSV-Scanner** (Google) | CVEs in OSV DB (broader than npm) | CLI + GitHub Action | ✅ Always |
| **Dependabot** (GitHub) | Outdated dependencies with CVEs | `.github/dependabot.yml` | ✅ Public and private repos |
| **Socket.dev** | Packages with suspicious behavior (typosquatting, supply chain) | GitHub App + `npx socket` | ✅ Free app for public repos |
| **Snyk** | CVEs + license compliance | `npx snyk test` | ✅ Individual tier |

### Socket.dev — compromised package detection

Socket analyzes the actual code behavior of a package (network access, file system access, obfuscation) — goes beyond known CVEs.

```bash
# Scan a package before installing
npx @socketsecurity/cli npm info <package>@<version>
```

GitHub App (free for public repos): install from [socket.dev](https://socket.dev) to automatically review every PR that modifies `package.json`.

### OSV-Scanner in GitHub Actions

```yaml
# .github/workflows/security.yml
- name: Run OSV-Scanner
  uses: google/osv-scanner-action@v1
  with:
    scan-args: |-
      --lockfile=./pnpm-lock.yaml
```

---

## Dependabot — Controlled Updates

With everything pinned exactly, Dependabot is the only update gate: it creates individual PRs per dependency that the team reviews and merges.

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly        # PRs on Mondays, not daily
      day: monday
      time: "09:00"
    open-pull-requests-limit: 5
    groups:
      dev-deps:
        patterns: ["*"]
        dependency-type: development
    ignore:
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]  # Majors = manual PR review
```

With `groups`, Dependabot bundles all devDeps into a single weekly PR instead of dozens of individual ones.

---

## CI — Mandatory Security Steps

```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 9

- name: Install dependencies
  run: pnpm install --frozen-lockfile   # fails if lockfile doesn't match

- name: Audit (npm advisory)
  run: pnpm audit --audit-level=high

- name: OSV-Scanner
  uses: google/osv-scanner-action@v1
  with:
    scan-args: |-
      --lockfile=./pnpm-lock.yaml
```

---

## Overrides and Patches

When a transitive dependency has a vulnerability and the author hasn't released a fix:

```json
// package.json
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
# Create a patch for an unresolved upstream bug
pnpm patch buggy-lib@1.2.3
pnpm patch-commit <temp-folder>
```

After applying overrides, verify with `pnpm audit` and `osv-scanner` — if the audit passes, the risk is mitigated.

---

## package.json Scripts

Canonical script set for any team project:

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

## Mandatory Rules

1. **pnpm only** — `npm install`, `yarn add`, `npx install-*` are prohibited in any team project.
2. **`save-exact=true` in `.npmrc`** — configured from the repository's initial commit.
3. **Always pin exact** — no carets, no tildes, in `dependencies` and `devDependencies`.
4. **`pnpm view <package>` before `pnpm add`** — never install without verifying the latest stable.
5. **`pnpm audit` immediately after installation** — do not open a PR with high/critical vulnerabilities.
6. **`osv-scanner --lockfile` in CI** — non-optional step; fails the pipeline if vulnerabilities are found.
7. **Dependabot configured** — from the repository's initial commit.
8. **`--frozen-lockfile` in CI** — without exception; if it fails, the developer updates the lockfile locally.
9. **`packageManager` and `engines` declared** in `package.json`.
10. **Do not install packages with < 1K weekly downloads** without manually reviewing the source code.

## Gotchas

- **`pnpm add <package>` without a version** with `save-exact=false` saves a caret — verify `.npmrc` has `save-exact=true` before the first `pnpm add`.
- **`pnpm audit --fix` can introduce automatic overrides** that break features — review the `package.json` diff after running it.
- **Dependabot doesn't group by default** — without `groups`, it generates one PR per dependency and floods notification inboxes.
- **`osv-scanner` on macOS requires Go or Homebrew** — document installation in the project's `CONTRIBUTING.md`.
- **Updating Node without updating `.nvmrc`** creates inconsistencies between dev and CI — both must be updated together.
- **Socket.dev GitHub App is only free for public repos** — for private repos, evaluate a paid tier or run `npx @socketsecurity/cli` manually during periodic security reviews.
- **Runtime dependencies in `devDependencies`** (or vice versa) break production builds or inflate the bundle — always verify whether a dependency is used at runtime.
- **Floating versions** (`"*"` or `"latest"`) in sub-dependencies can still arrive via transitive deps — use `pnpm.overrides` to pin them; the app's lockfile alone is not enough.
