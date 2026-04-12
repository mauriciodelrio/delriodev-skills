---
name: code-quality-rules
description: >
  Reglas de calidad de código para proyectos frontend. Cubre configuración de
  ESLint 9+ (flat config), Prettier, Biome, convenciones de nombrado,
  orden de imports, límites de complejidad, y pre-commit hooks con lint-staged.
---

# ✅ Calidad de Código — Reglas

## Principio Rector

> **Automatizar todo lo automatizable.** El formatter y el linter deciden el estilo.
> Los humanos deciden la arquitectura.

---

## 1. ESLint 9+ — Flat Config

```typescript
// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import tailwindcss from 'eslint-plugin-tailwindcss';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // React
  {
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-leaked-render': 'error',          // {count && <div>} → bug si count=0
      'react/self-closing-comp': 'error',              // <div></div> → <div />
      'react/jsx-curly-brace-presence': ['error', 'never'], // No {"text"} → "text"
      'react/hook-use-state': 'error',                 // [value, setValue] naming
    },
  },
  // Accessibility
  {
    plugins: { 'jsx-a11y': jsxA11y },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/no-autofocus': 'warn',
    },
  },
  // Imports
  {
    plugins: { import: importPlugin },
    rules: {
      'import/order': ['error', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        pathGroups: [
          { pattern: '@/**', group: 'internal' },
          { pattern: 'react', group: 'external', position: 'before' },
        ],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      }],
      'import/no-duplicates': 'error',
      'import/no-cycle': ['error', { maxDepth: 3 }],
    },
  },
  // TypeScript strict
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
    },
  },
  // Complejidad
  {
    rules: {
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 3],
      complexity: ['warn', 15],
    },
  },
  // Ignores
  {
    ignores: ['node_modules/', '.next/', 'dist/', 'coverage/', '*.config.*'],
  },
);
```

---

## 2. Prettier

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

```
// .prettierignore
node_modules/
.next/
dist/
coverage/
pnpm-lock.yaml
```

---

## 3. Biome (Alternativa a ESLint + Prettier)

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExcessiveCognitiveComplexity": { "level": "warn", "options": { "maxAllowedComplexity": 15 } }
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noArrayIndexKey": "error"
      },
      "correctness": {
        "useExhaustiveDependencies": "error",
        "noUnusedImports": "error",
        "noUnusedVariables": "error"
      }
    }
  }
}
```

---

## 4. Convenciones de Nombrado

```typescript
// ✅ Componentes: PascalCase
export function UserProfile() {}
export function DataTable<T>() {}

// ✅ Hooks: camelCase con "use" prefix
export function useAuth() {}
export function useDebounce<T>(value: T, delay: number) {}

// ✅ Tipos/Interfaces: PascalCase, sin prefijo "I"
export interface UserProfile {}                // ✅
export interface IUserProfile {}               // ❌ Prefijo "I" innecesario
export type ButtonVariant = 'primary' | 'secondary';

// ✅ Props: NombreComponenteProps
export interface ButtonProps {}
export interface DataTableProps<T> {}

// ✅ Constantes: UPPER_SNAKE_CASE
export const MAX_RETRY_COUNT = 3;
export const API_ENDPOINTS = { users: '/api/users' } as const;

// ✅ Funciones helper: camelCase verbosa
export function formatCurrency(amount: number, locale: string) {}
export function isValidEmail(email: string): boolean {}

// ✅ Event handlers: handle + Event
function handleClick() {}
function handleSubmit() {}
function handleSearchChange(query: string) {}

// ✅ Boolean naming: is/has/should/can prefix
const isLoading = true;
const hasPermission = false;
const shouldShowBanner = true;
const canEdit = false;
```

---

## 5. Pre-commit Hooks

```json
// package.json
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

```bash
# Setup
pnpm add -D husky lint-staged
pnpm exec husky init

# .husky/pre-commit
pnpm exec lint-staged

# .husky/pre-push (opcional)
pnpm run type-check
```

---

## 6. Type-Only Imports

```typescript
// ✅ SIEMPRE separar type imports (tree shaking + claridad)
import { useState, useEffect } from 'react';
import type { ReactNode, ComponentProps } from 'react';

import { Button } from '@shared/components/ui/Button';
import type { ButtonProps } from '@shared/components/ui/Button';

// ESLint rule: @typescript-eslint/consistent-type-imports
```

---

## Anti-patrones

```typescript
// ❌ Deshabilitar ESLint rules sin justificación
// eslint-disable-next-line @typescript-eslint/no-explicit-any  ← ¿Por qué?

// ❌ Archivos > 300 líneas — dividir en componentes/hooks
// ❌ any — usar unknown + type guards
// ❌ console.log en producción — usar logger
// ❌ Commented-out code — eliminarlo (git lo tiene)
// ❌ Abreviaturas crípticas: usr, btn, val (excepto i, j, e, _)
// ❌ Funciones con > 3 parámetros (usar objeto de opciones)
// ❌ Nested ternaries — usar early returns o variables
```
