---
name: css-rules
description: >
  Use this skill when applying styles in React/Next.js: Tailwind CSS 4+,
  CSS Modules, custom properties (design tokens), responsive design, dark mode,
  theming with Material UI, and cn() utility (clsx + twMerge).
---

# CSS — Style Rules

## Agent Workflow

1. Use `cn()` for all Tailwind class composition (section 1).
2. Apply mobile-first + container queries for responsive (section 2).
3. Implement dark mode with class + persistence (section 3).
4. CSS Modules only for complex animations not expressible in Tailwind (section 4).
5. Design tokens with custom properties for theming (section 5).

## 1. Tailwind CSS

### cn() Utility

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

### Tailwind Class Order

Use `prettier-plugin-tailwindcss` for auto-ordering. Logical order: layout → size → visual → typography → interaction → responsive.

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

### Dynamic Classes

```tsx
// Template literals are undetectable by Tailwind at build time — use explicit mapping
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

// Container queries: respond to container size, not viewport
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

// Avoid flash: inline script in layout.tsx that reads localStorage and applies 'dark' before paint
```

## 4. CSS Modules

```tsx
// Component.module.css
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

// Component.tsx
import styles from './Component.module.css';

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
// Use in Tailwind: bg-[var(--color-surface)] or extend config with semantic names
<div className="bg-[var(--color-surface)] text-[var(--color-on-surface)]" />
```

## 6. Material UI + Tailwind

```tsx
// sx for MUI overrides, Tailwind for layout
import { Button, ThemeProvider, createTheme } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: { main: '#2563eb' }, // Sync with Tailwind blue-600
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

- String interpolation (`bg-${color}-500`) is undetectable by Tailwind at build time — use explicit mapping with `as const`.
- `!important` in Tailwind is a symptom of specificity conflicts — investigate the root cause.
- Global CSS without scope (`.card { }` in globals.css) causes collisions — use CSS Modules or Tailwind.
- `z-[9999]` creates z-index wars — use a predefined scale: z-10, z-20, z-30, z-40, z-50.
- Magic values like `w-[327px]` indicate missing tokens — use spacing scale or design tokens.
- DO NOT mix `sx={{ margin: 2 }}` with `className="m-2"` in MUI — choose one per component.
- Incorrect theme flash in dark mode — add inline script in `<head>` that applies the `dark` class before paint.

## Related Skills

| Skill | Why |
|-------|-----|
| `a11y-rules` | Contrast 4.5:1, focus visible |
| `design-system-build-components-rules` | Tokens, variants |
| `performance-rules` | Critical CSS, purge |
