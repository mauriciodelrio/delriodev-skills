---
name: nextjs-project-structure
description: >
  Use this skill when structuring frontend projects with Next.js App Router:
  feature-based organization, app/ folder with route groups, barrel files,
  path aliases, layer separation, and naming conventions.
---

# Project Structure — Next.js App Router

## Agent workflow

1. Organize by business domain (feature-first), never by file type.
2. Routes in `app/` with route groups by shared layout: `(auth)`, `(dashboard)`.
3. Each feature in `features/<name>/` with barrel file `index.ts` exposing only the public API.
4. Shared code in `shared/` (UI components, generic hooks, utils, global types).
5. Path aliases (`@features/*`, `@shared/*`, `@config/*`) for clean imports.
6. Respect the dependency rule: `features/` never imports from another `features/` directly.
7. Tests colocated with the file they test; E2E in root `e2e/`.
8. Environment variables validated with Zod in `config/env.ts`.

## Base Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   └── webhooks/route.ts
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── error.tsx
│   ├── not-found.tsx
│   └── globals.css
│
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   └── LoginForm.test.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── services/
│   │   │   └── auth.service.ts
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   └── index.ts
│   └── products/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── types/
│       └── index.ts
│
├── shared/
│   ├── components/
│   │   ├── ui/
│   │   └── layout/
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   └── useMediaQuery.ts
│   ├── lib/
│   │   ├── cn.ts
│   │   ├── format.ts
│   │   └── validators.ts
│   ├── types/
│   │   └── global.d.ts
│   └── constants/
│       └── routes.ts
│
├── config/
│   ├── env.ts
│   └── site.ts
│
└── styles/
    └── tokens.css
```

## Environment Variables

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']),
  DATABASE_URL: z.string().min(1).optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
});
```

**Note:** In Next.js, only variables prefixed with `NEXT_PUBLIC_` are accessible on the client. Never put secrets in `NEXT_PUBLIC_*` variables.

## Organization Rules

### 1. Barrel Files — Controlled exports

```typescript
export { LoginForm } from './components/LoginForm';
export { useAuth } from './hooks/useAuth';
export type { User, AuthSession } from './types/auth.types';
```

### 2. Path Aliases — Clean imports

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@features/*": ["./src/features/*"],
      "@shared/*": ["./src/shared/*"],
      "@config/*": ["./src/config/*"]
    }
  }
}
```

```typescript
import { LoginForm } from '@features/auth';
import { Button } from '@shared/components/ui/Button';
import { env } from '@config/env';
```

### 3. Layer Dependency Rule

```
app/ → can import from → features/, shared/, config/
features/ → can import from → shared/, config/
features/ → CANNOT import from → another features/ directly
shared/ → can import from → config/
shared/ → CANNOT import from → features/, app/
config/ → CANNOT import from → any other layer
```

### 4. Naming Conventions

```
Component files:   PascalCase.tsx        → LoginForm.tsx
Hook files:        camelCase.ts          → useAuth.ts
Service files:     kebab-case.service.ts → auth.service.ts
Type files:        kebab-case.types.ts   → auth.types.ts
Test files:        Component.test.tsx    → LoginForm.test.tsx
Utility files:     camelCase.ts          → formatDate.ts
Folders:           kebab-case            → user-profile/
Constants:         UPPER_SNAKE_CASE      → API_BASE_URL
```

### 5. Test Colocation

```
features/auth/
├── components/
│   ├── LoginForm.tsx
│   └── LoginForm.test.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useAuth.test.ts

e2e/
├── auth.spec.ts
└── products.spec.ts
```

## Gotchas

- Giant global `utils` folder with everything mixed — split by domain into `features/` or `shared/lib/`.
- Layer-first organization (`components/`, `hooks/`, `services/` at root) doesn't scale — use feature-first.
- Files exporting multiple components hinder tree shaking and discovery.
- `export * from './components'` in barrel files breaks tree shaking and creates circular dependencies.
- Cross-feature relative imports (`../../../features/auth/...`) couple modules — use path aliases.
- Unvalidated environment variables cause hard-to-diagnose runtime errors.
- Files over ~300 lines signal a component needs extraction.
