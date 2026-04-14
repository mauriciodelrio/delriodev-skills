---
name: vite-project-structure
description: >
  Usa esta skill cuando estructures proyectos frontend con Vite + React SPA:
  organización feature-based, router centralizado, barrel files, path aliases
  con vite-tsconfig-paths, separación de capas y convenciones de nombrado.
---

# Estructura de Proyecto — Vite + React SPA

## Flujo de trabajo del agente

1. Organizar por dominio de negocio (feature-first), nunca por tipo de archivo.
2. Router centralizado en `src/router.tsx` con `createBrowserRouter`.
3. Cada feature en `features/<nombre>/` con barrel file `index.ts` que expone solo la API pública.
4. Código compartido en `shared/` (componentes UI, hooks genéricos, utils, tipos globales).
5. Path aliases con `vite-tsconfig-paths` — configurar una vez y funciona en Vite + TS.
6. Respetar la regla de dependencias: `features/` nunca importa de otro `features/` directamente.
7. Tests colocados junto al archivo que testean; E2E en `e2e/` raíz.
8. Variables de entorno validadas con Zod en `config/env.ts`.

## Estructura Base

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

## Path Aliases con vite-tsconfig-paths

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
// Con aliases — limpio y claro
import { LoginForm } from '@features/auth';
import { Button } from '@shared/components/ui/Button';
import { apiClient } from '@shared/lib/api-client';
import { env } from '@config/env';
```

## Variables de Entorno

```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']),
});

export const env = envSchema.parse(import.meta.env);
```

**Nota:** En Vite, solo las variables con prefijo `VITE_` son expuestas al cliente via `import.meta.env`. Nunca poner secrets en variables `VITE_*` — todo es visible en el bundle.

## Reglas de Organización

### 1. Barrel Files — Exportaciones controladas

```typescript
// features/auth/index.ts
export { LoginForm } from './components/LoginForm';
export { useAuth } from './hooks/useAuth';
export type { User, AuthSession } from './types/auth.types';
```

### 2. Regla de Dependencias entre Capas

```
router.tsx → puede importar de → features/, shared/, config/
features/ → puede importar de → shared/, config/
features/ → NO puede importar de → otro features/ directamente
shared/ → puede importar de → config/
shared/ → NO puede importar de → features/, router
config/ → NO puede importar de → ninguna otra capa
```

### 3. Convenciones de Nombrado

```
Archivos de componente:   PascalCase.tsx        → LoginForm.tsx
Archivos de hook:         camelCase.ts          → useAuth.ts
Archivos de servicio:     kebab-case.service.ts → auth.service.ts
Archivos de tipos:        kebab-case.types.ts   → auth.types.ts
Archivos de test:         Componente.test.tsx    → LoginForm.test.tsx
Archivos de utilidad:     camelCase.ts           → formatDate.ts
Carpetas:                 kebab-case             → user-profile/
Constantes:               UPPER_SNAKE_CASE       → API_BASE_URL
```

### 4. Colocación de Tests

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

- Carpeta `utils` global gigante con todo mezclado — dividir por dominio en `features/` o en `shared/lib/`.
- Organización layer-first (`components/`, `hooks/`, `services/` en raíz) no escala — usar feature-first.
- Archivos con múltiples componentes exportados dificultan tree shaking y búsqueda.
- `export * from './components'` en barrel files rompe tree shaking y crea dependencias circulares.
- Imports relativos cross-feature (`../../../features/auth/...`) acoplan módulos — usar path aliases.
- Variables de entorno sin validar causan errores en runtime difíciles de diagnosticar.
- Archivos de más de ~300 líneas son señal de que un componente necesita extracción.
- Sin `vite-tsconfig-paths`, los aliases de `tsconfig.json` no funcionan en Vite — requiere el plugin.
