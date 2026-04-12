---
name: package-management-rules
description: >
  Reglas para gestión de paquetes con pnpm. Cubre instalación y actualización
  de dependencias, lockfile management, auditoría de seguridad, estrategia
  de versionado, overrides/patches, y limpieza de dependencias.
---

# 📦 Gestión de Paquetes (pnpm)

## Principio Rector

> **pnpm por defecto.** Lockfile siempre en Git. Auditar antes de deploy.
> Cada dependencia agregada debe justificarse.

---

## 1. Comandos Esenciales

```bash
# Instalar dependencias (respeta lockfile)
pnpm install --frozen-lockfile   # CI — falla si lockfile no coincide

# Agregar dependencia
pnpm add react-hook-form         # dependencies
pnpm add -D vitest               # devDependencies
pnpm add -D -w eslint            # workspace root (monorepo)

# Actualizar
pnpm update                      # Según rango del package.json
pnpm update --latest             # Última versión (ignora rango)
pnpm update react --latest       # Solo react

# Eliminar
pnpm remove lodash

# Ver outdated
pnpm outdated                    # Lista deps con versiones nuevas

# Auditar seguridad
pnpm audit                       # Vulnerabilidades conocidas
pnpm audit --fix                 # Auto-fix cuando es posible

# Limpiar
pnpm store prune                 # Limpiar store global de pnpm
pnpm dedupe                      # Reducir duplicados en lockfile
```

---

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
// package.json — Motor requerido
{
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

```javascript
// .nvmrc o .node-version
// 20.18.0
```

---

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

---

## 4. Overrides y Patches

```json
// package.json — Forzar versiones de sub-dependencias
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
# Crear patch para un paquete
pnpm patch buggy-lib@1.2.3
# Editar archivos en la carpeta temporal...
pnpm patch-commit <carpeta-temporal>
# Genera patches/buggy-lib@1.2.3.patch automáticamente
```

---

## 5. Evaluación de Dependencias (Antes de Instalar)

Antes de `pnpm add <paquete>`:

1. **¿Es necesario?** — ¿Se puede hacer con API nativa del browser/Node.js?
2. **Tamaño** — Revisar en [bundlephobia.com](https://bundlephobia.com) o `import-cost` extension
3. **Mantenimiento** — ¿Última release < 6 meses? ¿Issues activos?
4. **Downloads** — ¿> 10K/semana? (indicador de adopción)
5. **Tree-shakeable** — ¿Exporta ESM? ¿Soporta named imports?
6. **Tipos** — ¿Incluye TypeScript types o existe `@types/*`?
7. **Licencia** — ¿Compatible con el proyecto? (MIT, Apache 2.0 → OK)

```bash
# Verificar tamaño de bundle antes de instalar
npx import-cost   # VS Code extension alternativa
```

---

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

---

## 7. CI — Pipeline de Dependencias

```yaml
# .github/workflows/ci.yml (fragmento)
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

## Anti-patrones

```bash
# ❌ npm install en proyecto pnpm (genera package-lock.json conflictivo)
# ❌ No commitear pnpm-lock.yaml
# ❌ pnpm install sin --frozen-lockfile en CI
# ❌ Agregar dependencias sin evaluar tamaño/mantenimiento
# ❌ Dependencias de runtime en devDependencies (o viceversa)
# ❌ Ignorar pnpm audit warnings en producción
# ❌ node_modules en el repo (agregar a .gitignore)
# ❌ Versiones flotantes sin caret/tilde: "*" o "latest"
```
