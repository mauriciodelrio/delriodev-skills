---
name: git-usage
description: >
  Usa esta skill en toda operación de Git: commits, branches, PRs, push,
  rebase y configuración de hooks. Aplica Conventional Commits, commits
  granulares por tarea, push por feature, branch naming, Husky + lint-staged
  + commitlint, PR template, rebase strategy y .gitignore.
---

# Git Usage

## Flujo de trabajo del agente

1. Todo commit sigue Conventional Commits (`<type>(<scope>): <descripción>` ≤ 150 chars, imperativo)
2. Commits granulares: un commit = una unidad lógica de trabajo. Nunca un commit gigante por feature
3. Push solo al completar la feature (no después de cada commit)
4. Branches con formato `<type>/<descripcion-corta>` en minúsculas y guiones
5. Rebase sobre main antes de push. Nunca `--force` en branches compartidos
6. Validar contra la sección Gotchas antes de ejecutar operaciones Git

---

## 1. Conventional Commits

Formato obligatorio:

```
<type>(<scope>): <descripción>
```

- **Máximo 150 caracteres** en la primera línea (tipo + scope + descripción).
- Descripción en **imperativo presente** y en **minúsculas** (sin punto final).
- Scope es opcional pero recomendado.

### Tipos permitidos

| Tipo       | Cuándo usar                                    | Ejemplo                                           |
| ---------- | ---------------------------------------------- | -------------------------------------------------- |
| `feat`     | Nueva funcionalidad                            | `feat(cart): add quantity selector to cart items`   |
| `fix`      | Corrección de bug                              | `fix(auth): prevent token refresh race condition`   |
| `refactor` | Cambio de código sin cambiar comportamiento    | `refactor(api): extract validation to middleware`   |
| `style`    | Formato, espacios, punto y coma (no CSS)       | `style: apply prettier formatting`                 |
| `docs`     | Documentación                                  | `docs(readme): add deployment instructions`         |
| `test`     | Agregar o corregir tests                       | `test(products): add unit tests for price calc`     |
| `chore`    | Tareas de mantenimiento, configs, deps         | `chore(deps): upgrade next to 15.2.0`              |
| `ci`       | Cambios en CI/CD                               | `ci: add lighthouse audit to PR workflow`           |
| `perf`     | Mejora de rendimiento                          | `perf(images): lazy load below-the-fold images`     |
| `build`    | Cambios en sistema de build o deps externas    | `build: configure turborepo cache for ci`           |
| `revert`   | Revierte un commit anterior                    | `revert: revert feat(cart) add quantity selector`   |

### Body y Footer (opcionales)

```
feat(checkout): implement stripe payment integration

Add Stripe Elements for card input with 3D Secure support.
Handle payment intent confirmation and error states.

Closes #142
```

- Body: separado por línea en blanco, explica **qué** y **por qué** (no cómo).
- Footer: referencias a issues (`Closes #142`, `Refs #99`).

### Breaking Changes

```
feat(api)!: change auth endpoint response format

BREAKING CHANGE: /api/auth/login now returns { token, user }
instead of { accessToken, refreshToken, userData }.
```

---

## 2. Commits Granulares — Un Commit por Tarea

```
Regla: cada commit representa UNA unidad lógica de trabajo completada.

Feature: "Agregar carrito de compras"
├── feat(cart): create cart context and provider
├── feat(cart): add CartItem component with quantity controls
├── feat(cart): implement add-to-cart button in product card
├── feat(cart): create cart drawer with item list and totals
├── test(cart): add unit tests for cart operations
├── style(cart): adjust cart drawer responsive layout
└── ← push al completar toda la feature

❌ MAL: un solo commit gigante "feat: add shopping cart"
❌ MAL: commit con cambios mezclados "feat+fix+style: cart stuff"
❌ MAL: push después de cada commit individual
```

### Workflow por Feature

```bash
# 1. Crear branch desde main/develop
git checkout -b feat/shopping-cart

# 2. Trabajar y commitear granularmente (SIN push)
git add src/features/cart/CartContext.tsx
git commit -m "feat(cart): create cart context and provider"

git add src/features/cart/components/CartItem.tsx
git commit -m "feat(cart): add CartItem component with quantity controls"

# ... más commits por cada tarea completada

# 3. Push al completar la feature
git push origin feat/shopping-cart

# 4. Crear PR
```

---

## 3. Branch Naming

Formato obligatorio:

```
<type>/<descripcion-corta>
```

| Prefijo     | Uso                                  | Ejemplo                          |
| ----------- | ------------------------------------ | -------------------------------- |
| `feat/`     | Nueva funcionalidad                  | `feat/shopping-cart`             |
| `fix/`      | Corrección de bug                    | `fix/login-redirect-loop`        |
| `refactor/` | Refactorización                      | `refactor/auth-middleware`       |
| `chore/`    | Mantenimiento, configs               | `chore/upgrade-next-15`          |
| `docs/`     | Documentación                        | `docs/api-endpoints`             |
| `hotfix/`   | Fix urgente en producción            | `hotfix/payment-timeout`         |
| `test/`     | Solo agregar/mejorar tests           | `test/checkout-e2e`              |
| `release/`  | Preparar release                     | `release/2.1.0`                  |

Reglas:
- Solo minúsculas, números y guiones (`-`).
- Sin guiones bajos, espacios ni mayúsculas.
- Descriptivo pero corto (2–4 palabras máx).

---

## 4. Husky + lint-staged + commitlint

### Instalación

```bash
pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional
pnpm exec husky init
```

### commitlint — Validar formato de commit

```javascript
// commitlint.config.mjs
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Máximo 150 caracteres en header
    'header-max-length': [2, 'always', 150],
    // Tipos permitidos
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'style', 'docs', 'test', 'chore', 'ci', 'perf', 'build', 'revert'],
    ],
    // Tipo en minúsculas
    'type-case': [2, 'always', 'lower-case'],
    // Descripción no vacía
    'subject-empty': [2, 'never'],
    // Sin punto final
    'subject-full-stop': [2, 'never', '.'],
  },
};
```

### Husky hooks

```bash
# .husky/commit-msg — Validar formato del mensaje
pnpm exec commitlint --edit $1
```

```bash
# .husky/pre-commit — Lint, format, tests y build
pnpm exec lint-staged
```

### lint-staged — Validar archivos staged

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

### Pre-push — Tests y build

```bash
# .husky/pre-push — Ejecutar tests y build antes de push
pnpm run type-check && pnpm run test:ci && pnpm run build
```

> **Flujo completo:**
> `git commit` → commitlint valida mensaje → lint-staged ejecuta ESLint + Prettier en archivos staged → si todo pasa, se crea el commit.
> `git push` → type-check + tests + build → si todo pasa, se hace push.

### Scripts requeridos en package.json

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

Crear archivo en la raíz del repositorio:

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

## 6. Rebase Strategy

```bash
# ✅ Antes de hacer push, rebase sobre main para historial lineal
git fetch origin
git rebase origin/main

# ✅ Si hay conflictos durante rebase
git rebase origin/main
# Resolver conflictos en cada archivo...
git add <archivos-resueltos>
git rebase --continue

# ✅ Abortar rebase si algo sale mal
git rebase --abort

# ✅ Interactive rebase para limpiar historial ANTES del push
git rebase -i HEAD~5   # Revisar últimos 5 commits
# pick   → mantener
# squash → fusionar con el anterior (unir commits WIP)
# reword → cambiar mensaje
# drop   → eliminar commit

# ❌ NUNCA hacer rebase de commits ya pusheados
# ❌ NUNCA git push --force en main/develop
```

### Merge strategy del equipo

```
main ← PR con squash merge o merge commit (según equipo)
  │
  └── feat/shopping-cart ← rebase sobre main antes de PR
        ├── commit 1 (granular)
        ├── commit 2 (granular)
        └── commit 3 (granular)
```

---

## 7. .gitignore Esenciales

```gitignore
# .gitignore

# Dependencias
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

# Entorno
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

> **Regla:** `.env.example` con valores placeholder SÍ se commitea. `.env.local` NUNCA.

---

## 8. Reglas Adicionales

### Stashing

```bash
# ✅ Guardar cambios temporales para cambiar de branch
git stash push -m "wip: cart sidebar layout"
git checkout fix/urgent-bug
# ... trabajar en el fix ...
git checkout feat/shopping-cart
git stash pop   # Recuperar cambios
```

### Tagging (Releases)

```bash
# Semantic versioning para releases
git tag -a v2.1.0 -m "release: v2.1.0 — shopping cart feature"
git push origin v2.1.0
```

### Amend (Solo commits locales)

```bash
# ✅ Corregir el último commit (solo si NO se hizo push)
git add <archivos-olvidados>
git commit --amend --no-edit     # Agregar archivos al último commit
git commit --amend -m "nuevo mensaje"  # Cambiar mensaje
```

### Aliases recomendados

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

## Resumen del Workflow

```
1. git checkout -b feat/nombre-feature          ← Branch nueva
2. Trabajar en tarea 1...
3. git add <archivos> && git commit              ← Commit granular
   → commitlint valida mensaje (conventional commit ≤ 150 chars)
   → lint-staged ejecuta ESLint + Prettier
   → Si pasa → commit creado
4. Repetir pasos 2–3 para cada tarea de la feature
5. git fetch origin && git rebase origin/main    ← Sync con main
6. git push origin feat/nombre-feature           ← Push al completar
   → pre-push ejecuta type-check + tests + build
   → Si pasa → push realizado
7. Crear PR con template                         ← Review
8. Merge a main                                  ← Feature integrada
```

---

## Gotchas

- Nunca `git add . && git commit -m "changes"` — el mensaje debe seguir Conventional Commits con tipo, scope opcional y descripción significativa.
- Un commit gigante con 40 archivos no es granular. Cada commit debe representar una unidad lógica completada.
- No hacer push después de cada commit individual — genera ruido en CI y PRs. Push al completar la feature.
- Nunca `git push --force` en branches compartidos (main, develop) — reescribe historial ajeno.
- Nunca commitear archivos `.env` ni secrets. Verificar `.gitignore` antes del primer commit del proyecto.
- Mensajes en imperativo presente ("add", "fix"), nunca en pasado ("added", "fixed").
- Nunca deshabilitar husky con `--no-verify` — las validaciones existen por una razón.
- Branches deben tener prefijo descriptivo (`feat/`, `fix/`), nunca nombres genéricos como "test" o "temp".
- No crear merge commits locales innecesarios — usar rebase para mantener historial lineal.
- Nunca hacer rebase de commits ya pusheados a un branch remoto.
