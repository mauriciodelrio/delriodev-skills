---
name: code-quality-rules
description: >
  Use this skill when configuring code quality in frontend projects:
  ESLint 9+ (flat config), Prettier, Biome, naming conventions,
  import ordering, complexity limits, and pre-commit hooks with lint-staged.
---

# Code Quality

## Agent Workflow

1. Configure linter: ESLint 9 flat config (section 1) or Biome (section 3).
2. Configure formatter: Prettier (section 2) or Biome.
3. Apply project naming conventions (section 4).
4. Set up pre-commit hooks with lint-staged (section 5).
5. Separate type imports from value imports (section 6).

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
      'react/jsx-no-leaked-render': 'error',
      'react/self-closing-comp': 'error',
      'react/jsx-curly-brace-presence': ['error', 'never'],
      'react/hook-use-state': 'error',
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
  // Complexity
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

## 3. Biome (Alternative to ESLint + Prettier)

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

## 4. Naming Conventions

```typescript
// Components: PascalCase
export function UserProfile() {}

// Hooks: camelCase with "use" prefix
export function useDebounce<T>(value: T, delay: number) {}

// Types/Interfaces: PascalCase, no "I" prefix
export interface UserProfile {}         // Correct
export interface IUserProfile {}        // Do not use "I" prefix
export type ButtonVariant = 'primary' | 'secondary';

// Props: ComponentNameProps
export interface ButtonProps {}
export interface DataTableProps<T> {}

// Constants: UPPER_SNAKE_CASE
export const MAX_RETRY_COUNT = 3;
export const API_ENDPOINTS = { users: '/api/users' } as const;

// Helper functions: verbose camelCase
export function formatCurrency(amount: number, locale: string) {}
export function isValidEmail(email: string): boolean {}

// Event handlers: handle + Event
function handleSubmit() {}
function handleSearchChange(query: string) {}

// Booleans: is/has/should/can prefix
const isLoading = true;
const hasPermission = false;
```

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

# .husky/pre-push (optional)
pnpm run type-check
```

## 6. Type-Only Imports

```typescript
import { useState, useEffect } from 'react';
import type { ReactNode, ComponentProps } from 'react';

import { Button } from '@shared/components/ui/Button';
import type { ButtonProps } from '@shared/components/ui/Button';
```

## Gotchas

- `eslint-disable` without a justification comment is hidden tech debt — always add `// reason: ...`.
- `any` silently propagates through the type system — use `unknown` + type guards.
- `console.log` in production exposes internal data — use a logger with levels (debug/info/warn/error).
- Commented-out code stays indefinitely — delete it, git preserves it.
- Functions with > 3 parameters become unreadable — use an options object.
- Nested ternaries are hard to parse — use early returns or intermediate variables.
