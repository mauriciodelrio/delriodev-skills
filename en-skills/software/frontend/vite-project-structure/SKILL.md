---
name: vite-project-structure
description: >
  Use this skill when structuring frontend projects with Vite + React SPA:
  feature-based organization, centralized router, barrel files, path aliases
  with vite-tsconfig-paths, layer separation, and naming conventions.
---

# Project Structure — Vite + React SPA

## Agent workflow

1. Organize by business domain (feature-first), never by file type.
2. Centralized router in `src/router.tsx` with `createBrowserRouter`.
3. Each feature in `features/<name>/` with barrel file `index.ts` exposing only the public API.
4. Shared code in `shared/` (UI components, generic hooks, utils, global types).
5. Path aliases with `vite-tsconfig-paths` — configure once and it works in Vite + TS.
6. Respect the dependency rule: `features/` never imports from another `features/` directly.
7. Tests colocated with the file they test; E2E in root `e2e/`.
8. Environment variables validated with Zod in `config/env.ts`.

## Base Structure

```
src/
├── app/
│   ├── App.tsx
│   ├── providers.tsx
│   └── index.css
│
├── router.tsx
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
│   └── persons/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── types/
│       └── index.ts
│
├── shared/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx
│   │   │   └── AuthLayout.tsx
│   │   └── ProtectedRoute.tsx
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   └── useMediaQuery.ts
│   ├── lib/
│   │   ├── api-client.ts
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
│   └── query-client.ts
│
└── styles/
    └── tokens.css
```

## Path Aliases with vite-tsconfig-paths

```bash
pnpm add -D vite-tsconfig-paths
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
});
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@features/*": ["./src/features/*"],
      "@shared/*": ["./src/shared/*"],
      "@config/*": ["./src/config/*"],
      "@app/*": ["./src/app/*"]
    }
  }
}
```

```typescript
// With aliases — clean and clear
import { LoginForm } from '@features/auth';
import { Button } from '@shared/components/ui/Button';
import { apiClient } from '@shared/lib/api-client';
import { env } from '@config/env';
```

## Environment Variables

```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']),
});

export const env = envSchema.parse(import.meta.env);
```

**Note:** In Vite, only variables prefixed with `VITE_` are exposed to the client via `import.meta.env`. Never put secrets in `VITE_*` variables — everything is visible in the bundle.

## Organization Rules

### 1. Barrel Files — Controlled exports

```typescript
// features/auth/index.ts
export { LoginForm } from './components/LoginForm';
export { useAuth } from './hooks/useAuth';
export type { User, AuthSession } from './types/auth.types';
```

### 2. Layer Dependency Rule

```
router.tsx → can import from → features/, shared/, config/
features/ → can import from → shared/, config/
features/ → CANNOT import from → another features/ directly
shared/ → can import from → config/
shared/ → CANNOT import from → features/, router
config/ → CANNOT import from → any other layer
```

### 3. Naming Conventions

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

### 4. Test Colocation

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
└── persons.spec.ts
```

## Gotchas

- Giant global `utils` folder with everything mixed — split by domain into `features/` or `shared/lib/`.
- Layer-first organization (`components/`, `hooks/`, `services/` at root) doesn't scale — use feature-first.
- Files exporting multiple components hinder tree shaking and discovery.
- `export * from './components'` in barrel files breaks tree shaking and creates circular dependencies.
- Cross-feature relative imports (`../../../features/auth/...`) couple modules — use path aliases.
- Unvalidated environment variables cause hard-to-diagnose runtime errors.
- Files over ~300 lines signal a component needs extraction.
- Without `vite-tsconfig-paths`, `tsconfig.json` aliases don't work in Vite — the plugin is required.
