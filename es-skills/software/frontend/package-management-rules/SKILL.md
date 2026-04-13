---
name: package-management-rules
description: >
  Usa esta skill cuando gestiones dependencias con pnpm: instalación,
  actualización, lockfile, auditoría de seguridad, versionado,
  overrides/patches, y limpieza de dependencias.
---

# Gestión de Paquetes (pnpm)

## Flujo de trabajo del agente

1. Evaluar si la dependencia es necesaria (checklist sección 5) antes de agregarla.
2. Usar rangos según criticidad: pin exacto para React/Next/TS, caret para utilidades (sección 3).
3. Mantener `.npmrc` configurado y `packageManager` declarado en `package.json` (sección 2).
4. Siempre `--frozen-lockfile` en CI, `pnpm audit` antes de deploy (sección 7).
5. Overrides para vulnerabilidades en sub-dependencias, patches para bugs upstream (sección 4).

## 1. Comandos Esenciales

```bash
pnpm install --frozen-lockfile   # CI — falla si lockfile no coincide

pnpm add react-hook-form         # dependencies
pnpm add -D vitest               # devDependencies
pnpm add -D -w eslint            # workspace root (monorepo)

pnpm update                      # Según rango del package.json
pnpm update --latest             # Última versión (ignora rango)
pnpm update react --latest

pnpm remove lodash
pnpm outdated

pnpm audit
pnpm audit --fix

pnpm store prune
pnpm dedupe
```

## 2. Configuración de pnpm

```yaml
# .npmrc
auto-install-peers=true
strict-peer-dependencies=false
shamefully-hoist=false
resolution-mode=highest
prefer-frozen-lockfile=true

# Registros privados (si aplica)
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

## 3. Estrategia de Versionado

```
Dependencias críticas (React, Next.js, TypeScript):
  → Pin exact: "react": "19.0.0"
  → Actualizar manualmente con testing

Dependencias de utilidad (date-fns, clsx, zod):
  → Caret range: "zod": "^3.23.0"
  → Actualizar con pnpm update

DevDependencies (ESLint, Prettier, Vitest):
  → Caret range: "vitest": "^2.0.0"
  → Actualizar frecuentemente

Regla: Si un update rompe algo, NUNCA ignorar — investigar y fixear.
```

## 4. Overrides y Patches

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
pnpm patch-commit <carpeta-temporal>
```

## 5. Evaluación de Dependencias (Antes de Instalar)

Antes de `pnpm add <paquete>`:

1. **¿Es necesario?** — ¿Se puede hacer con API nativa del browser/Node.js?
2. **Tamaño** — Revisar en [bundlephobia.com](https://bundlephobia.com) o `import-cost` extension
3. **Mantenimiento** — ¿Última release < 6 meses? ¿Issues activos?
4. **Downloads** — ¿> 10K/semana? (indicador de adopción)
5. **Tree-shakeable** — ¿Exporta ESM? ¿Soporta named imports?
6. **Tipos** — ¿Incluye TypeScript types o existe `@types/*`?
7. **Licencia** — ¿Compatible con el proyecto? (MIT, Apache 2.0 → OK)

## 6. Scripts de package.json

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

## 7. CI — Pipeline de Dependencias

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

- `npm install` en proyecto pnpm genera `package-lock.json` conflictivo — usar siempre `pnpm install`.
- No commitear `pnpm-lock.yaml` causa builds no reproducibles.
- `pnpm install` sin `--frozen-lockfile` en CI puede instalar versiones distintas a las testeadas.
- Dependencias de runtime en `devDependencies` (o viceversa) rompe builds de producción.
- Ignorar `pnpm audit` warnings en producción expone vulnerabilidades conocidas.
- Versiones flotantes (`"*"` o `"latest"`) causan builds impredecibles.
