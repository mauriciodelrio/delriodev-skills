---
name: css-rules
description: >
  Usa esta skill cuando apliques estilos en React/Next.js: Tailwind CSS 4+,
  CSS Modules, custom properties (design tokens), responsive design, dark mode,
  theming con Material UI, y utilidad cn() (clsx + twMerge).
---

# CSS — Reglas de Estilos

## Flujo de trabajo del agente

1. Usar `cn()` para toda composición de clases Tailwind (sección 1).
2. Aplicar mobile-first + container queries para responsive (sección 2).
3. Implementar dark mode con clase + persistencia (sección 3).
4. CSS Modules solo para animaciones complejas no expresables en Tailwind (sección 4).
5. Design tokens con custom properties para theming (sección 5).

## 1. Tailwind CSS

### Utilidad cn()

```typescript
// shared/lib/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

<div className={cn(
  'rounded-lg p-4',
  variant === 'error' && 'border-red-500 bg-red-50',
  className,
)} />
```

### Orden de Clases Tailwind

Usar `prettier-plugin-tailwindcss` para orden automático. Orden lógico: layout → tamaño → visual → tipografía → interacción → responsive.

```tsx
<div
  className={cn(
    'flex items-center justify-between',
    'h-12 w-full px-4 py-2',
    'rounded-lg border border-gray-200 bg-white shadow-sm',
    'text-sm font-medium text-gray-900',
    'transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500',
    'md:h-14 md:px-6 lg:text-base',
  )}
/>

### Clases Dinámicas

```tsx
// Template literals no son detectables por Tailwind en build — usar mapeo explícito
const colorMap = {
  blue: 'bg-blue-500 text-blue-900',
  red: 'bg-red-500 text-red-900',
  green: 'bg-green-500 text-green-900',
} as const;

<div className={cn(colorMap[color])} />
```

## 2. Responsive Design

```tsx
<div className={cn(
  'flex flex-col gap-4 p-4',
  'md:flex-row md:gap-6 md:p-6',
  'lg:gap-8 lg:p-8',
  'xl:max-w-7xl xl:mx-auto',
)}>
  <aside className="w-full md:w-64 lg:w-80">Sidebar</aside>
  <main className="flex-1">Content</main>
</div>

// Container queries: responden al tamaño del contenedor, no del viewport
<div className="@container">
  <div className="flex flex-col @md:flex-row @lg:grid @lg:grid-cols-3" />
</div>
```

## 3. Dark Mode

```tsx
// tailwind.config.ts
export default {
  darkMode: 'class',
};

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

// Evitar flash: script inline en layout.tsx que lee localStorage y aplica 'dark' antes del paint
```

## 4. CSS Modules

```tsx
// Componente.module.css
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

## 5. Design Tokens

```css
:root {
  --color-blue-500: oklch(0.55 0.22 260);
  --color-blue-600: oklch(0.49 0.22 260);
  --color-primary: var(--color-blue-600);
  --color-surface: white;
  --color-on-surface: var(--color-gray-900);
  --color-border: var(--color-gray-200);
}

[data-theme='dark'] {
  --color-primary: var(--color-blue-400);
  --color-surface: var(--color-gray-900);
  --color-on-surface: var(--color-gray-100);
  --color-border: var(--color-gray-700);
}
```

```tsx
// Usar en Tailwind: bg-[var(--color-surface)] o extender config con semantic names
<div className="bg-[var(--color-surface)] text-[var(--color-on-surface)]" />
```

## 6. Material UI + Tailwind

```tsx
// sx para overrides de MUI, Tailwind para layout
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
          textTransform: 'none',
          borderRadius: '0.375rem',
        },
      },
    },
  },
});

```

## Gotchas

- Interpolación de strings (`bg-${color}-500`) no es detectable por Tailwind en build — usar mapeo explícito con `as const`.
- `!important` en Tailwind es síntoma de conflicto de especificidad — investigar la causa raíz.
- CSS global sin scope (`.card { }` en globals.css) causa colisiones — usar CSS Modules o Tailwind.
- `z-[9999]` crea z-index wars — usar escala predefinida: z-10, z-20, z-30, z-40, z-50.
- Valores mágicos como `w-[327px]` indican tokens faltantes — usar spacing scale o design tokens.
- NO mezclar `sx={{ margin: 2 }}` con `className="m-2"` en MUI — elegir uno por componente.
- Flash de tema incorrecto en dark mode — agregar script inline en `<head>` que aplique clase `dark` antes del paint.

## Skills Relacionadas

| Skill | Por qué |
|-------|--------|
| `a11y-rules` | Contraste 4.5:1, focus visible |
| `design-system-build-components-rules` | Tokens, variants |
| `performance-rules` | CSS crítico, purge |
