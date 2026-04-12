---
name: project-structure
description: >
  Reglas y convenciones para estructurar proyectos frontend con React/Next.js.
  Cubre organización de carpetas feature-based, barrel files, path aliases,
  separación de capas y convenciones de nombrado de archivos.
---

# 📁 Estructura de Proyecto Frontend

## Principio Rector

> **Feature-first, no layer-first.** Agrupa por dominio de negocio, no por tipo de archivo.

---

## Estructura Base — Next.js App Router

```
src/
├── app/                          # App Router (rutas y layouts)
│   ├── (auth)/                   # Route group: login, register
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/              # Route group: área autenticada
│   │   ├── layout.tsx
│   │   └── settings/page.tsx
│   ├── api/                      # Route handlers
│   │   └── webhooks/route.ts
│   ├── layout.tsx                # Root layout
│   ├── loading.tsx               # Root loading
│   ├── error.tsx                 # Root error boundary
│   ├── not-found.tsx             # 404 personalizado
│   └── globals.css
│
├── features/                     # 🎯 Módulos por dominio de negocio
│   ├── auth/
│   │   ├── components/           # Componentes internos del feature
│   │   │   ├── LoginForm.tsx
│   │   │   └── LoginForm.test.tsx
│   │   ├── hooks/                # Hooks específicos del feature
│   │   │   └── useAuth.ts
│   │   ├── services/             # Lógica de negocio / API calls
│   │   │   └── auth.service.ts
│   │   ├── types/                # Tipos del dominio
│   │   │   └── auth.types.ts
│   │   └── index.ts              # Barrel file: API pública del feature
│   │
│   └── products/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── types/
│       └── index.ts
│
├── shared/                       # Código compartido cross-feature
│   ├── components/               # Componentes genéricos reutilizables
│   │   ├── ui/                   # Primitivos: Button, Input, Modal
│   │   └── layout/               # Header, Sidebar, Footer
│   ├── hooks/                    # Hooks genéricos
│   │   ├── useDebounce.ts
│   │   └── useMediaQuery.ts
│   ├── lib/                      # Utilidades puras
│   │   ├── cn.ts                 # clsx + twMerge
│   │   ├── format.ts             # Formateo de fechas, moneda
│   │   └── validators.ts         # Schemas Zod compartidos
│   ├── types/                    # Tipos globales
│   │   └── global.d.ts
│   └── constants/                # Constantes de la app
│       └── routes.ts
│
├── config/                       # Configuración de la app
│   ├── env.ts                    # Variables de entorno validadas con Zod
│   └── site.ts                   # Metadata del sitio
│
└── styles/                       # Estilos globales (si aplica)
    └── tokens.css                # Design tokens CSS custom properties
```

---

## Reglas de Organización

### 1. Barrel Files — Exportaciones controladas

```typescript
// features/auth/index.ts — API pública del feature
// SOLO exporta lo que otros features necesitan consumir

export { LoginForm } from './components/LoginForm';
export { useAuth } from './hooks/useAuth';
export type { User, AuthSession } from './types/auth.types';

// ❌ NUNCA exportar componentes internos, helpers privados o servicios directos
// ❌ NUNCA hacer re-export masivo: export * from './components'
```

### 2. Path Aliases — Imports limpios

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
// ✅ CORRECTO
import { LoginForm } from '@features/auth';
import { Button } from '@shared/components/ui/Button';
import { env } from '@config/env';

// ❌ INCORRECTO — imports relativos cross-feature
import { LoginForm } from '../../../features/auth/components/LoginForm';
```

### 3. Regla de Dependencias entre Capas

```
app/ → puede importar de → features/, shared/, config/
features/ → puede importar de → shared/, config/
features/ → ❌ NO puede importar de → otro features/ directamente
shared/ → puede importar de → config/
shared/ → ❌ NO puede importar de → features/, app/
config/ → ❌ NO puede importar de → ninguna otra capa
```

```typescript
// ❌ PROHIBIDO — feature importando de otro feature
// features/products/components/ProductCard.tsx
import { useAuth } from '@features/auth'; // ❌ Acoplamiento directo

// ✅ CORRECTO — usar shared o inyección por props/context
// Si auth es necesario, exponerlo vía shared/hooks o Context en app/
import { useCurrentUser } from '@shared/hooks/useCurrentUser';
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
// ✅ PREFERIDO — test junto al archivo que testea
features/auth/
├── components/
│   ├── LoginForm.tsx
│   └── LoginForm.test.tsx      ← Junto al componente
├── hooks/
│   ├── useAuth.ts
│   └── useAuth.test.ts         ← Junto al hook

// Tests de integración / E2E van en carpeta separada raíz
e2e/
├── auth.spec.ts
└── products.spec.ts
```

### 6. Variables de Entorno Validadas

```typescript
// config/env.ts — SIEMPRE validar en runtime
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']),
  DATABASE_URL: z.string().min(1).optional(), // solo server-side
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
});

// Uso: import { env } from '@config/env';
// env.NEXT_PUBLIC_API_URL → tipado y validado
```

---

## Anti-patrones

```typescript
// ❌ Carpeta "utils" global gigante con todo mezclado
src/utils/
  helpers.ts          // 2000 líneas de funciones random
  index.ts            // re-exporta todo

// ❌ Carpetas por tipo de archivo (layer-first)
src/
  components/         // 150 componentes de todos los dominios
  hooks/              // 80 hooks mezclados
  services/           // todos los API calls juntos

// ❌ Archivos con múltiples componentes exportados
// UserCard.tsx exporta UserCard, UserAvatar, UserBadge, UserTooltip

// ❌ Barrel files que re-exportan todo
export * from './components';
export * from './hooks';
export * from './services';
// Esto rompe tree shaking y crea dependencias circulares
```

---

## Checklist de Estructura

- [ ] ¿Cada feature tiene su propia carpeta con barrel file?
- [ ] ¿Los imports cross-feature pasan por `shared/` o Context?
- [ ] ¿Los path aliases están configurados y se usan consistentemente?
- [ ] ¿Las variables de entorno están validadas con Zod?
- [ ] ¿Los tests están colocados junto al código que testean?
- [ ] ¿Los archivos siguen las convenciones de nombrado?
- [ ] ¿Ningún archivo tiene más de ~300 líneas?
