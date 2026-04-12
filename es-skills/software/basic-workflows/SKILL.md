---
name: basic-workflows
description: >
  Workflows de CI/CD básicos obligatorios para todo proyecto nuevo. Esta skill se
  activa al crear o configurar un proyecto. Crea GitHub Actions para linting,
  build, tests, auditoría de seguridad, análisis de bundle y validación de tipos.
  Define branch protection rules y configuración de Dependabot. Cada PR debe pasar
  todos los checks antes de merge.
---

# ⚙️ Basic Workflows — CI/CD para Todo Proyecto

## Principio Rector

> **Si no está en CI, no existe.** Todo check que se hace localmente debe
> replicarse en CI. Un PR sin checks verdes no se mergea — sin excepciones.

---

## Estructura de Archivos

```
.github/
├── workflows/
│   ├── ci.yml                    ← Workflow principal (lint + type-check + test + build)
│   ├── security.yml              ← Auditoría de dependencias + CodeQL
│   └── bundle-analysis.yml       ← Análisis de tamaño de bundle (opcional pero recomendado)
├── dependabot.yml                ← Actualizaciones automáticas de deps
├── pull_request_template.md      ← Template de PR
└── CODEOWNERS                    ← Owners por directorio
```

---

## 1. Workflow Principal — CI

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
  # Instalar dependencias (cache compartido)
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

## 2. Workflow de Seguridad

```yaml
# .github/workflows/security.yml
name: Security

on:
  pull_request:
    branches: [main, develop]
  schedule:
    # Ejecutar diariamente a las 6:00 UTC (auditoría continua)
    - cron: '0 6 * * *'

permissions:
  security-events: write
  contents: read

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '9'

jobs:
  # ──────────────────────────────────────
  # Auditoría de dependencias (pnpm audit)
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
  # CodeQL — Análisis de código estático
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

## 3. Workflow de Bundle Analysis

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

      # Para Next.js: reportar tamaño de First Load JS
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
  # Dependencias de npm
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
      # Agrupar updates menores para reducir ruido
      minor-and-patch:
        update-types:
          - 'minor'
          - 'patch'
    ignore:
      # Excluir major bumps automáticos de frameworks críticos
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
# Estos usuarios son asignados automáticamente como reviewers.

# Default: todo el repo
* @team-lead-username

# Workflows y CI
.github/ @devops-username @team-lead-username

# Ejemplo por área (ajustar a tu equipo)
# src/features/payments/ @payments-team
# src/features/auth/     @security-team
```

---

## 6. Branch Protection Rules

Configurar en **GitHub → Settings → Branches → Add rule** para `main`:

```
Branch name pattern: main

✅ Require a pull request before merging
  ✅ Require approvals: 1 (mínimo)
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

✅ Require linear history (fuerza rebase/squash, evita merge commits)

✅ Include administrators (las reglas aplican para todos)

❌ Allow force pushes → NUNCA en main
❌ Allow deletions → NUNCA en main
```

### Automatizar via GitHub CLI (opcional)

```bash
# Crear branch protection rule via CLI
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Lint","Type Check","Tests","Build","Dependency Audit"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

### Para `develop` (si aplica)

```
Mismas reglas que main EXCEPTO:
- Approvals: 1 (en vez de 2 si main requiere 2)
- Allow squash merge: sí
```

---

## 7. PR Template

```markdown
<!-- .github/pull_request_template.md -->

## Descripción

<!-- Breve resumen de los cambios realizados y por qué. -->



## Checklist

- [ ] Sigue Conventional Commits en todos los mensajes
- [ ] Commits granulares (1 commit = 1 tarea lógica)
- [ ] Sin `console.log` ni código comentado
- [ ] Tipos TypeScript correctos (sin `any`)
- [ ] Tests agregados/actualizados para los cambios
- [ ] Tests pasan localmente (`pnpm test:ci`)
- [ ] Build exitoso localmente (`pnpm build`)
- [ ] Lint/format sin errores (`pnpm lint && pnpm format:check`)
- [ ] Accesibilidad verificada (si aplica UI)
- [ ] Responsive verificado (si aplica UI)

## Tests

<!-- Adjuntar screenshot o output de tests. -->

### Unit / Integration
<!-- ![tests](url-o-drag-and-drop) -->

### E2E (si aplica)
<!-- ![e2e](url-o-drag-and-drop) -->

## Build

<!-- Adjuntar screenshot del build exitoso. -->
<!-- ![build](url-o-drag-and-drop) -->

## Notas adicionales

<!-- Contexto extra, decisiones técnicas, trade-offs, etc. Eliminar si no aplica. -->
```

---

## 8. Scripts Requeridos en package.json

Los workflows asumen estos scripts. Deben existir en todo proyecto:

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

## Checklist de Setup Inicial

Al crear un proyecto nuevo, verificar que TODO esto exista:

- [ ] `.github/workflows/ci.yml` — Lint + Type Check + Tests + Build
- [ ] `.github/workflows/security.yml` — pnpm audit + CodeQL
- [ ] `.github/dependabot.yml` — Updates automáticos
- [ ] `.github/pull_request_template.md` — Template de PR
- [ ] `.github/CODEOWNERS` — Asignación automática de reviewers
- [ ] Branch protection rules configuradas en `main`
- [ ] Scripts `lint`, `format:check`, `type-check`, `test:ci`, `build` en package.json
- [ ] Husky + lint-staged + commitlint configurados (ver skill `git-usage`)

---

## Anti-patrones

```yaml
# ❌ Workflows que NO cachean node_modules → builds lentos
# ❌ Checks que se pueden skipear con [skip ci] sin restricción
# ❌ Branch main sin protección → push directo posible
# ❌ PRs sin status checks requeridos → merge sin CI
# ❌ pnpm install sin --frozen-lockfile en CI → lockfile inconsistente
# ❌ Secrets hardcodeados en workflows → usar GitHub Secrets
# ❌ Workflows que corren en push a TODOS los branches → desperdicio de CI minutes
# ❌ Ignorar security alerts de Dependabot
# ❌ Build como primer step → desperdicias CI si lint falla
# ❌ Sin concurrency → PRs viejos consumen runners innecesariamente
```
