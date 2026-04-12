---
name: monorepo-and-tooling
description: >
  Monorepo management rules with Turborepo and pnpm workspaces. Covers
  workspace structure, shared configuration, build pipelines,
  internal dependencies, and deployment strategies.
---

# 🏗️ Monorepo and Tooling

## Guiding Principle

> **Shared code as internal packages.** Turborepo for build orchestration.
> pnpm workspaces for dependencies. One config, N applications.

---

## 1. Monorepo Structure

```
my-monorepo/
├── apps/
│   ├── web/                    # Main Next.js app
│   │   ├── app/
│   │   ├── package.json        # { "name": "@scope/web" }
│   │   └── next.config.mjs
│   ├── admin/                  # Admin Next.js app
│   │   └── package.json        # { "name": "@scope/admin" }
│   └── docs/                   # Documentation
│       └── package.json
├── packages/
│   ├── ui/                     # Shared Design System
│   │   ├── src/
│   │   │   ├── components/
│   │   │   └── index.ts        # Barrel export
│   │   ├── package.json        # { "name": "@scope/ui" }
│   │   └── tsconfig.json
│   ├── shared/                 # Utils, types, constants
│   │   └── package.json        # { "name": "@scope/shared" }
│   ├── config-eslint/          # Shared ESLint config
│   │   └── package.json        # { "name": "@scope/config-eslint" }
│   ├── config-typescript/      # TSConfig bases
│   │   ├── base.json
│   │   ├── nextjs.json
│   │   ├── react-library.json
│   │   └── package.json        # { "name": "@scope/config-typescript" }
│   └── config-tailwind/        # Tailwind config + theme
│       └── package.json        # { "name": "@scope/config-tailwind" }
├── turbo.json
├── pnpm-workspace.yaml
├── package.json                # Root scripts
└── .npmrc
```

---

## 2. pnpm Workspaces

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// Root package.json
{
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "type-check": "turbo type-check",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "prettier": "^3.4.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

```json
// packages/ui/package.json
{
  "name": "@scope/ui",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts",
    "./button": "./src/components/Button.tsx",
    "./globals.css": "./src/globals.css"
  },
  "dependencies": {
    "react": "^19.0.0"
  },
  "devDependencies": {
    "@scope/config-typescript": "workspace:*",
    "typescript": "^5.7.0"
  }
}
```

```json
// apps/web/package.json — consume internal package
{
  "name": "@scope/web",
  "dependencies": {
    "@scope/ui": "workspace:*",
    "@scope/shared": "workspace:*"
  }
}
```

---

## 3. Turborepo — Pipeline

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "tests/**"]
    },
    "type-check": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  },
  "globalDependencies": ["tsconfig.json"],
  "globalEnv": ["NODE_ENV", "VERCEL_URL"]
}
```

### Key Concepts:

- `dependsOn: ["^build"]` — Build internal dependencies first
- `outputs` — What to cache (avoids unnecessary re-builds)
- `inputs` — Which files invalidate the cache
- `persistent: true` — For processes that don't terminate (dev servers)

---

## 4. Shared Configs

### TypeScript

```json
// packages/config-typescript/base.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": ["node_modules", "dist", ".next"]
}

// packages/config-typescript/nextjs.json
{
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "module": "ESNext",
    "allowJs": true,
    "noEmit": true
  }
}

// apps/web/tsconfig.json
{
  "extends": "@scope/config-typescript/nextjs.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "next-env.d.ts", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### ESLint

```javascript
// packages/config-eslint/next.mjs
import baseConfig from './base.mjs';
import nextPlugin from '@next/eslint-plugin-next';

export default [
  ...baseConfig,
  {
    plugins: { '@next/next': nextPlugin },
    rules: { ...nextPlugin.configs.recommended.rules },
  },
];

// apps/web/eslint.config.mjs
import nextConfig from '@scope/config-eslint/next.mjs';
export default [...nextConfig];
```

---

## 5. Filtered Commands

```bash
# Run in a specific workspace
pnpm --filter @scope/web dev
pnpm --filter @scope/ui build

# Run in all except one
pnpm --filter '!@scope/docs' build

# Run in dependents of a package
pnpm --filter '...@scope/ui' build   # @scope/ui + all that use it

# Add dependency to a workspace
pnpm --filter @scope/web add zod
```

---

## 6. Deployment Strategy

```
apps/web     → Vercel (detects Next.js automatically)
apps/admin   → Vercel (separate project, same repo)
packages/*   → Not deployed (only consumed internally)

Vercel config (per app):
  Root Directory: apps/web
  Build Command: cd ../.. && pnpm turbo build --filter=@scope/web
  Install Command: pnpm install --frozen-lockfile
```

---

## Anti-patterns

```bash
# ❌ Importing directly from relative paths between apps
# import { Button } from '../../../packages/ui/src/Button'  ← NEVER
# import { Button } from '@scope/ui'                        ← ALWAYS

# ❌ Installing the same dependency with different versions in each workspace
# ❌ Scripts that don't use Turborepo (lose cache + parallelism)
# ❌ Duplicated configs in each app (extract to packages/config-*)
# ❌ Circular dependencies between packages
# ❌ packages/* with "version": "1.0.0" if not published (use "0.0.0")
```
