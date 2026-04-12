---
name: project-structure
description: >
  Rules and conventions for structuring frontend projects with React/Next.js.
  Covers feature-based folder organization, barrel files, path aliases,
  layer separation, and file naming conventions.
---

# 📁 Frontend Project Structure

## Guiding Principle

> **Feature-first, not layer-first.** Group by business domain, not by file type.

---

## Base Structure — Next.js App Router

```
src/
├── app/                          # App Router (routes and layouts)
│   ├── (auth)/                   # Route group: login, register
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/              # Route group: authenticated area
│   │   ├── layout.tsx
│   │   └── settings/page.tsx
│   ├── api/                      # Route handlers
│   │   └── webhooks/route.ts
│   ├── layout.tsx                # Root layout
│   ├── loading.tsx               # Root loading
│   ├── error.tsx                 # Root error boundary
│   ├── not-found.tsx             # Custom 404
│   └── globals.css
│
├── features/                     # 🎯 Modules by business domain
│   ├── auth/
│   │   ├── components/           # Feature-internal components
│   │   │   ├── LoginForm.tsx
│   │   │   └── LoginForm.test.tsx
│   │   ├── hooks/                # Feature-specific hooks
│   │   │   └── useAuth.ts
│   │   ├── services/             # Business logic / API calls
│   │   │   └── auth.service.ts
│   │   ├── types/                # Domain types
│   │   │   └── auth.types.ts
│   │   └── index.ts              # Barrel file: feature public API
│   │
│   └── products/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── types/
│       └── index.ts
│
├── shared/                       # Cross-feature shared code
│   ├── components/               # Generic reusable components
│   │   ├── ui/                   # Primitives: Button, Input, Modal
│   │   └── layout/               # Header, Sidebar, Footer
│   ├── hooks/                    # Generic hooks
│   │   ├── useDebounce.ts
│   │   └── useMediaQuery.ts
│   ├── lib/                      # Pure utilities
│   │   ├── cn.ts                 # clsx + twMerge
│   │   ├── format.ts             # Date, currency formatting
│   │   └── validators.ts         # Shared Zod schemas
│   ├── types/                    # Global types
│   │   └── global.d.ts
│   └── constants/                # App constants
│       └── routes.ts
│
├── config/                       # App configuration
│   ├── env.ts                    # Environment variables validated with Zod
│   └── site.ts                   # Site metadata
│
└── styles/                       # Global styles (if applicable)
    └── tokens.css                # Design tokens CSS custom properties
```

---

## Organization Rules

### 1. Barrel Files — Controlled Exports

```typescript
// features/auth/index.ts — Feature public API
// ONLY export what other features need to consume

export { LoginForm } from './components/LoginForm';
export { useAuth } from './hooks/useAuth';
export type { User, AuthSession } from './types/auth.types';

// ❌ NEVER export internal components, private helpers, or direct services
// ❌ NEVER do mass re-exports: export * from './components'
```

### 2. Path Aliases — Clean Imports

```json
// tsconfig.json
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
// ✅ CORRECT
import { LoginForm } from '@features/auth';
import { Button } from '@shared/components/ui/Button';
import { env } from '@config/env';

// ❌ INCORRECT — cross-feature relative imports
import { LoginForm } from '../../../features/auth/components/LoginForm';
```

### 3. Layer Dependency Rule

```
app/ → can import from → features/, shared/, config/
features/ → can import from → shared/, config/
features/ → ❌ CANNOT import from → another features/ directly
shared/ → can import from → config/
shared/ → ❌ CANNOT import from → features/, app/
config/ → ❌ CANNOT import from → any other layer
```

```typescript
// ❌ FORBIDDEN — feature importing from another feature
// features/products/components/ProductCard.tsx
import { useAuth } from '@features/auth'; // ❌ Direct coupling

// ✅ CORRECT — use shared or inject via props/context
// If auth is needed, expose it via shared/hooks or Context in app/
import { useCurrentUser } from '@shared/hooks/useCurrentUser';
```

### 4. Naming Conventions

```
Component files:     PascalCase.tsx        → LoginForm.tsx
Hook files:          camelCase.ts          → useAuth.ts
Service files:       kebab-case.service.ts → auth.service.ts
Type files:          kebab-case.types.ts   → auth.types.ts
Test files:          Component.test.tsx     → LoginForm.test.tsx
Utility files:       camelCase.ts           → formatDate.ts
Folders:             kebab-case             → user-profile/
Constants:           UPPER_SNAKE_CASE       → API_BASE_URL
```

### 5. Test Colocation

```
// ✅ PREFERRED — test next to the file it tests
features/auth/
├── components/
│   ├── LoginForm.tsx
│   └── LoginForm.test.tsx      ← Next to the component
├── hooks/
│   ├── useAuth.ts
│   └── useAuth.test.ts         ← Next to the hook

// Integration / E2E tests go in a separate root folder
e2e/
├── auth.spec.ts
└── products.spec.ts
```

### 6. Validated Environment Variables

```typescript
// config/env.ts — ALWAYS validate at runtime
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']),
  DATABASE_URL: z.string().min(1).optional(), // server-side only
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
});

// Usage: import { env } from '@config/env';
// env.NEXT_PUBLIC_API_URL → typed and validated
```

---

## Anti-patterns

```typescript
// ❌ Giant global "utils" folder with everything mixed together
src/utils/
  helpers.ts          // 2000 lines of random functions
  index.ts            // re-exports everything

// ❌ Folders by file type (layer-first)
src/
  components/         // 150 components from all domains
  hooks/              // 80 mixed hooks
  services/           // all API calls together

// ❌ Files with multiple exported components
// UserCard.tsx exports UserCard, UserAvatar, UserBadge, UserTooltip

// ❌ Barrel files that re-export everything
export * from './components';
export * from './hooks';
export * from './services';
// This breaks tree shaking and creates circular dependencies
```

---

## Structure Checklist

- [ ] Does each feature have its own folder with a barrel file?
- [ ] Do cross-feature imports go through `shared/` or Context?
- [ ] Are path aliases configured and used consistently?
- [ ] Are environment variables validated with Zod?
- [ ] Are tests colocated next to the code they test?
- [ ] Do files follow the naming conventions?
- [ ] Is no file longer than ~300 lines?
