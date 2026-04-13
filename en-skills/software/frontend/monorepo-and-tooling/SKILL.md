---
name: monorepo-and-tooling
description: >
  Use this skill when configuring or working with monorepos:
  Turborepo + pnpm workspaces, workspace structure, shared configs,
  build pipelines, internal dependencies, and deployment.
---

# Monorepo and Tooling

## Agent workflow

1. Structure: `apps/` for applications, `packages/` for shared code (section 1).
2. pnpm workspaces with `workspace:*` for internal dependencies (section 2).
3. Turborepo pipeline: `dependsOn: ["^build"]`, cacheable outputs (section 3).
4. Shared configs in `packages/config-*`: TypeScript, ESLint, Tailwind (section 4).
5. Filtered commands: `pnpm --filter @scope/web dev` (section 5).
6. Per-app deploy on Vercel with `--filter` in build command (section 6).

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

## 2. pnpm Workspaces

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
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
{
  "name": "@scope/web",
  "dependencies": {
    "@scope/ui": "workspace:*",
    "@scope/shared": "workspace:*"
  }
}
```

## 3. Turborepo — Pipeline

```json
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

`dependsOn: ["^build"]` builds internal dependencies first. `outputs` defines what to cache. `inputs` which files invalidate the cache. `persistent: true` for dev servers.

## 4. Shared Configs

### TypeScript

```json
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

// nextjs.json
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
import baseConfig from './base.mjs';
import nextPlugin from '@next/eslint-plugin-next';

export default [
  ...baseConfig,
  {
    plugins: { '@next/next': nextPlugin },
    rules: { ...nextPlugin.configs.recommended.rules },
  },
];

import nextConfig from '@scope/config-eslint/next.mjs';
export default [...nextConfig];
```

## 5. Filtered Commands

```bash
pnpm --filter @scope/web dev
pnpm --filter @scope/ui build
pnpm --filter '!@scope/docs' build
pnpm --filter '...@scope/ui' build
pnpm --filter @scope/web add zod
```

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

## Gotchas

- Importing with relative paths between apps (`../../../packages/ui/src/Button`) breaks the workspace contract — use `@scope/ui`.
- Same dependency with different versions in each workspace causes type conflicts and duplicate bundles — align versions.
- Scripts that don't go through Turborepo lose cache and parallelism — always `turbo <task>`.
- Duplicated configs in each app are hard to maintain — extract to `packages/config-*`.
- Circular dependencies between packages cause infinite builds — check graph with `turbo ls --affected`.
- `"version": "1.0.0"` in unpublished internal packages is confusing — use `"0.0.0"`.
