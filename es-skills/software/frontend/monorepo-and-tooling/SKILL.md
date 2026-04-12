---
name: monorepo-and-tooling
description: >
  Reglas para gestión de monorepos con Turborepo y pnpm workspaces. Cubre
  estructura de workspaces, configuración compartida, pipelines de build,
  dependencias internas, y estrategias de deploy.
---

# 🏗️ Monorepo y Tooling

## Principio Rector

> **Código compartido como paquetes internos.** Turborepo para orquestar builds.
> pnpm workspaces para dependencias. Una config, N aplicaciones.

---

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
// apps/web/package.json — consumir paquete interno
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

### Conceptos clave:

- `dependsOn: ["^build"]` — Primero build de dependencias internas
- `outputs` — Qué cachear (evita re-builds innecesarios)
- `inputs` — Qué archivos invalidan el cache
- `persistent: true` — Para procesos que no terminan (dev servers)

---

## 4. Configs Compartidas

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

## 5. Comandos Filtrados

```bash
# Ejecutar en un workspace específico
pnpm --filter @scope/web dev
pnpm --filter @scope/ui build

# Ejecutar en todos excepto uno
pnpm --filter '!@scope/docs' build

# Ejecutar en dependientes de un paquete
pnpm --filter '...@scope/ui' build   # @scope/ui + todos los que lo usan

# Agregar dependencia a un workspace
pnpm --filter @scope/web add zod
```

---

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

---

## Anti-patrones

```bash
# ❌ Importar directamente de rutas relativas entre apps
# import { Button } from '../../../packages/ui/src/Button'  ← NUNCA
# import { Button } from '@scope/ui'                        ← SIEMPRE

# ❌ Instalar misma dependencia con versiones diferentes en cada workspace
# ❌ Scripts que no usan Turborepo (pierden cache + paralelismo)
# ❌ Configs duplicadas en cada app (extraer a packages/config-*)
# ❌ Circular dependencies entre packages
# ❌ packages/* con "version": "1.0.0" si no se publican (usar "0.0.0")
```
