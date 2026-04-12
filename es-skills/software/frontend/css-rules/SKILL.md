---
name: css-rules
description: >
  Reglas de estilos para aplicaciones React/Next.js. Cubre Tailwind CSS 4+,
  CSS Modules, custom properties (design tokens), responsive design, dark mode,
  theming con Material UI, utilidad cn() (clsx + twMerge), y convenciones
  de organización de estilos.
---

# 🎨 CSS — Reglas de Estilos

## Principio Rector

> **Utility-first con escape hatches.** Tailwind para el 90% de los estilos,
> CSS Modules para animaciones complejas, custom properties para tokens de diseño.

---

## 1. Tailwind CSS — Convenciones

### Utilidad cn() — Obligatoria

```typescript
// shared/lib/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ✅ USO: merge seguro de clases Tailwind
<div className={cn(
  'rounded-lg p-4',                    // Base
  variant === 'error' && 'border-red-500 bg-red-50',  // Condicional
  className                             // Override del padre
)} />

// ❌ NUNCA interpolación de strings para clases condicionales
<div className={`p-4 ${isActive ? 'bg-blue-500' : 'bg-gray-500'}`} />
// twMerge no puede resolver conflictos en strings interpolados
```

### Orden de Clases Tailwind

```tsx
// ✅ Orden recomendado (Prettier plugin lo hace automático)
<div
  className={cn(
    // 1. Layout (display, position, overflow)
    'flex items-center justify-between',
    // 2. Tamaño (width, height, padding, margin)
    'h-12 w-full px-4 py-2',
    // 3. Visual (bg, border, shadow, rounded)
    'rounded-lg border border-gray-200 bg-white shadow-sm',
    // 4. Tipografía (font, text, leading)
    'text-sm font-medium text-gray-900',
    // 5. Interacción (hover, focus, transition)
    'transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500',
    // 6. Responsive
    'md:h-14 md:px-6 lg:text-base',
  )}
/>

// Instalar plugin de orden automático:
// pnpm add -D prettier-plugin-tailwindcss
```

### Clases Dinámicas — Sin Template Literals

```tsx
// ❌ NUNCA clases dinámicas con template literals
<div className={`bg-${color}-500`} />  // Tailwind NO puede detectar esto en build

// ✅ Mapeo explícito
const colorMap = {
  blue: 'bg-blue-500 text-blue-900',
  red: 'bg-red-500 text-red-900',
  green: 'bg-green-500 text-green-900',
} as const;

<div className={cn(colorMap[color])} />
```

---

## 2. Responsive Design

```tsx
// ✅ Mobile-first (Tailwind default)
// Diseñar para móvil primero, añadir breakpoints para pantallas más grandes

<div className={cn(
  // Mobile (default)
  'flex flex-col gap-4 p-4',
  // Tablet (md: 768px+)
  'md:flex-row md:gap-6 md:p-6',
  // Desktop (lg: 1024px+)
  'lg:gap-8 lg:p-8',
  // Wide (xl: 1280px+)
  'xl:max-w-7xl xl:mx-auto',
)}>
  <aside className="w-full md:w-64 lg:w-80">Sidebar</aside>
  <main className="flex-1">Content</main>
</div>

// ✅ Container queries para layouts de componentes
<div className="@container">
  <div className="flex flex-col @md:flex-row @lg:grid @lg:grid-cols-3">
    {/* Responde al tamaño del CONTENEDOR, no del viewport */}
  </div>
</div>
```

---

## 3. Dark Mode

```tsx
// ✅ Tailwind dark mode con clase (controlado por JS)
// tailwind.config.ts
export default {
  darkMode: 'class', // o 'selector' en v4
};

// ✅ Componente con dark mode
<div className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
  <h1 className="text-gray-800 dark:text-gray-200">Título</h1>
</div>

// ✅ Toggle de tema con persistencia
'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    root.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return { theme, setTheme };
}

// ✅ Evitar flash: script inline en layout.tsx antes del body
// <script dangerouslySetInnerHTML={{ __html: `...` }} />
// que lee localStorage y aplica la clase 'dark' inmediatamente
```

---

## 4. CSS Modules — Para Animaciones y Estilos Complejos

```tsx
// Componente.module.css — cuando Tailwind no alcanza
.shimmer {
  background: linear-gradient(
    90deg,
    transparent 25%,
    rgba(255, 255, 255, 0.5) 50%,
    transparent 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

// Componente.tsx
import styles from './Componente.module.css';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn(styles.shimmer, 'rounded-md bg-gray-200', className)} />;
}
```

---

## 5. Design Tokens con Custom Properties

```css
/* styles/tokens.css */
:root {
  /* Colores primitivos */
  --color-blue-50: oklch(0.97 0.02 240);
  --color-blue-500: oklch(0.55 0.22 260);
  --color-blue-600: oklch(0.49 0.22 260);

  /* Colores semánticos */
  --color-primary: var(--color-blue-600);
  --color-surface: white;
  --color-on-surface: var(--color-gray-900);
  --color-border: var(--color-gray-200);

  /* Spacing scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
}

[data-theme='dark'] {
  --color-primary: var(--color-blue-400);
  --color-surface: var(--color-gray-900);
  --color-on-surface: var(--color-gray-100);
  --color-border: var(--color-gray-700);
}
```

```tsx
// Usar en Tailwind v4 con theme()
<div className="bg-[var(--color-surface)] text-[var(--color-on-surface)]" />

// O extender tailwind.config.ts
// colors: { primary: 'var(--color-primary)', surface: 'var(--color-surface)' }
// Y usar: <div className="bg-surface text-on-surface" />
```

---

## 6. Material UI — Convenciones con Tailwind

```tsx
// ✅ MUI + Tailwind: usar sx solo para overrides de MUI, Tailwind para layout
import { Button, ThemeProvider, createTheme } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: { main: '#2563eb' }, // Sincronizar con Tailwind blue-600
  },
  typography: {
    fontFamily: 'var(--font-sans)',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',    // Sin UPPERCASE forzado
          borderRadius: '0.375rem', // Sincronizar con Tailwind rounded-md
        },
      },
    },
  },
});

// ✅ Layout con Tailwind, componentes con MUI
<div className="flex items-center gap-4 p-6">
  <Button variant="contained" size="large">
    Guardar
  </Button>
</div>

// ❌ NO mezclar sx={{ margin: 2 }} con className="m-2"
// Elegir uno por componente. Tailwind para layout, MUI sx para theming específico.
```

---

## Anti-patrones CSS

```tsx
// ❌ Inline styles para todo
<div style={{ display: 'flex', gap: '16px', padding: '24px' }} />

// ❌ !important
<div className="text-red-500 !important" />  // Code smell

// ❌ CSS global sin scope
/* globals.css */
.card { ... }  // Colisión de nombres. Usar CSS Modules o Tailwind

// ❌ z-index random
<div className="z-[9999]" />  // Usar escala definida: z-10, z-20, z-30, z-40, z-50

// ❌ Valores mágicos hardcoded
<div className="w-[327px] h-[53px]" />  // Usar tokens del spacing scale

// ❌ Tailwind purge bypass
<div className={`bg-${dynamicColor}-500`} />  // No se purga correctamente
```

---

## Skills Relacionadas

> **Consultar el índice maestro [`frontend/SKILL.md`](../SKILL.md) → "Skills Obligatorias por Acción"** para estilos.

| Skill | Por qué |
|-------|--------|
| `a11y-rules` | Contraste mínimo 4.5:1, focus visible, prefers-reduced-motion |
| `design-system-build-components-rules` | Tokens, variants, Atomic Design |
| `performance-rules` | CSS crítico, purge, bundle size |
