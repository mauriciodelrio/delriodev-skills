---
name: monorepo-and-tooling
description: >
  Usa esta skill cuando configures o trabajes con monorepos:
  Turborepo + pnpm workspaces, estructura de workspaces, configs
  compartidas, pipelines de build, dependencias internas, y deploy.
---

# Monorepo y Tooling

## Flujo de trabajo del agente

1. Estructura: `apps/` para aplicaciones, `packages/` para código compartido (sección 1).
2. pnpm workspaces con `workspace:*` para dependencias internas (sección 2).
3. Turborepo pipeline: `dependsOn: ["^build"]`, outputs cacheables (sección 3).
4. Configs compartidas en `packages/config-*`: TypeScript, ESLint, Tailwind (sección 4).
5. Comandos filtrados: `pnpm --filter @scope/web dev` (sección 5).
6. Deploy por app en Vercel con `--filter` en build command (sección 6).

## 1. Estructura del Monorepo

```
my-monorepo/
├── apps/
│   ├── web/                    # Next.js app principal
│   │   ├── app/
│   │   ├── package.json        # { "name": "@scope/web" }
│   │   └── next.config.mjs
│   ├── admin/                  # Next.js app admin
│   │   └── package.json        # { "name": "@scope/admin" }
│   └── docs/                   # Documentación
│       └── package.json
├── packages/
│   ├── ui/                     # Design System compartido
│   │   ├── src/
│   │   │   ├── components/
│   │   │   └── index.ts        # Barrel export
│   │   ├── package.json        # { "name": "@scope/ui" }
│   │   └── tsconfig.json
│   ├── shared/                 # Utils, types, constants
│   │   └── package.json        # { "name": "@scope/shared" }
│   ├── config-eslint/          # ESLint config compartida
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

`dependsOn: ["^build"]` ejecuta primero las dependencias internas. `outputs` define qué cachear. `inputs` qué archivos invalidan el cache. `persistent: true` para dev servers.

## 4. Configs Compartidas

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

## 5. Comandos Filtrados

```bash
pnpm --filter @scope/web dev
pnpm --filter @scope/ui build
pnpm --filter '!@scope/docs' build
pnpm --filter '...@scope/ui' build
pnpm --filter @scope/web add zod
```

## 6. Estrategia de Deploy

```
apps/web     → Vercel (detecta Next.js automáticamente)
apps/admin   → Vercel (proyecto separado, mismo repo)
packages/*   → No se deploy (solo se consumen internamente)

Vercel config (por app):
  Root Directory: apps/web
  Build Command: cd ../.. && pnpm turbo build --filter=@scope/web
  Install Command: pnpm install --frozen-lockfile
```

## Gotchas

- Importar con rutas relativas entre apps (`../../../packages/ui/src/Button`) rompe el contrato de workspaces — usar `@scope/ui`.
- Misma dependencia con versiones diferentes en cada workspace causa conflictos de tipos y bundles duplicados — alinear versiones.
- Scripts que no pasan por Turborepo pierden cache y paralelismo — siempre `turbo <task>`.
- Configs duplicadas en cada app son difíciles de mantener — extraer a `packages/config-*`.
- Dependencias circulares entre packages causan builds infinitos — revisar grafo con `turbo ls --affected`.
- `"version": "1.0.0"` en packages internos no publicados confunde — usar `"0.0.0"`.
