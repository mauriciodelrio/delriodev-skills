---
name: nextjs-project-structure
description: >
  Usa esta skill cuando estructures proyectos frontend con Next.js App Router:
  organización feature-based, carpeta app/ con route groups, barrel files,
  path aliases, separación de capas y convenciones de nombrado.
---

# Estructura de Proyecto — Next.js App Router

## Flujo de trabajo del agente

1. Organizar por dominio de negocio (feature-first), nunca por tipo de archivo.
2. Rutas en `app/` con route groups según layout compartido: `(auth)`, `(dashboard)`.
3. Cada feature en `features/<nombre>/` con barrel file `index.ts` que expone solo la API pública.
4. Código compartido en `shared/` (componentes UI, hooks genéricos, utils, tipos globales).
5. Path aliases (`@features/*`, `@shared/*`, `@config/*`) para imports limpios.
6. Respetar la regla de dependencias: `features/` nunca importa de otro `features/` directamente.
7. Tests colocados junto al archivo que testean; E2E en `e2e/` raíz.
8. Variables de entorno validadas con Zod en `config/env.ts`.

## Estructura Base

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

## Variables de Entorno

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

**Nota:** En Next.js, solo las variables con prefijo `NEXT_PUBLIC_` son accesibles en el cliente. Nunca poner secrets en variables `NEXT_PUBLIC_*`.

## Reglas de Organización

### 1. Barrel Files — Exportaciones controladas

```typescript
export { LoginForm } from './components/LoginForm';
export { useAuth } from './hooks/useAuth';
export type { User, AuthSession } from './types/auth.types';
```

### 2. Path Aliases — Imports limpios

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

### 3. Regla de Dependencias entre Capas

```
app/ → puede importar de → features/, shared/, config/
features/ → puede importar de → shared/, config/
features/ → NO puede importar de → otro features/ directamente
shared/ → puede importar de → config/
shared/ → NO puede importar de → features/, app/
config/ → NO puede importar de → ninguna otra capa
```

### 4. Convenciones de Nombrado

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

### 5. Colocación de Tests

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

- Carpeta `utils` global gigante con todo mezclado — dividir por dominio en `features/` o en `shared/lib/`.
- Organización layer-first (`components/`, `hooks/`, `services/` en raíz) no escala — usar feature-first.
- Archivos con múltiples componentes exportados dificultan tree shaking y búsqueda.
- `export * from './components'` en barrel files rompe tree shaking y crea dependencias circulares.
- Imports relativos cross-feature (`../../../features/auth/...`) acoplan módulos — usar path aliases.
- Variables de entorno sin validar causan errores en runtime difíciles de diagnosticar.
- Archivos de más de ~300 líneas son señal de que un componente necesita extracción.
