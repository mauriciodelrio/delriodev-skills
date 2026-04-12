---
name: css-rules
description: >
  Style rules for React/Next.js applications. Covers Tailwind CSS 4+,
  CSS Modules, custom properties (design tokens), responsive design, dark mode,
  theming with Material UI, cn() utility (clsx + twMerge), and style
  organization conventions.
---

# 🎨 CSS — Style Rules

## Guiding Principle

> **Utility-first with escape hatches.** Tailwind for 90% of styles,
> CSS Modules for complex animations, custom properties for design tokens.

---

## 1. Tailwind CSS — Conventions

### cn() Utility — Mandatory

```typescript
// shared/lib/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ✅ USAGE: safe Tailwind class merging
<div className={cn(
  'rounded-lg p-4',                    // Base
  variant === 'error' && 'border-red-500 bg-red-50',  // Conditional
  className                             // Parent override
)} />

// ❌ NEVER string interpolation for conditional classes
<div className={`p-4 ${isActive ? 'bg-blue-500' : 'bg-gray-500'}`} />
// twMerge cannot resolve conflicts in interpolated strings
```

### Tailwind Class Order

```tsx
// ✅ Recommended order (Prettier plugin does it automatically)
<div
  className={cn(
    // 1. Layout (display, position, overflow)
    'flex items-center justify-between',
    // 2. Size (width, height, padding, margin)
    'h-12 w-full px-4 py-2',
    // 3. Visual (bg, border, shadow, rounded)
    'rounded-lg border border-gray-200 bg-white shadow-sm',
    // 4. Typography (font, text, leading)
    'text-sm font-medium text-gray-900',
    // 5. Interaction (hover, focus, transition)
    'transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500',
    // 6. Responsive
    'md:h-14 md:px-6 lg:text-base',
  )}
/>

// Install auto-ordering plugin:
// pnpm add -D prettier-plugin-tailwindcss
```

### Dynamic Classes — No Template Literals

```tsx
// ❌ NEVER dynamic classes with template literals
<div className={`bg-${color}-500`} />  // Tailwind CANNOT detect this at build time

// ✅ Explicit mapping
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
// Design for mobile first, add breakpoints for larger screens

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

// ✅ Container queries for component layouts
<div className="@container">
  <div className="flex flex-col @md:flex-row @lg:grid @lg:grid-cols-3">
    {/* Responds to the CONTAINER size, not the viewport */}
  </div>
</div>
```

---

## 3. Dark Mode

```tsx
// ✅ Tailwind dark mode with class (JS-controlled)
// tailwind.config.ts
export default {
  darkMode: 'class', // or 'selector' in v4
};

// ✅ Component with dark mode
<div className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
  <h1 className="text-gray-800 dark:text-gray-200">Title</h1>
</div>

// ✅ Theme toggle with persistence
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

// ✅ Avoid flash: inline script in layout.tsx before body
// <script dangerouslySetInnerHTML={{ __html: `...` }} />
// that reads localStorage and applies the 'dark' class immediately
```

---

## 4. CSS Modules — For Animations and Complex Styles

```tsx
// Component.module.css — when Tailwind isn't enough
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

---

## 5. Design Tokens with Custom Properties

```css
/* styles/tokens.css */
:root {
  /* Primitive colors */
  --color-blue-50: oklch(0.97 0.02 240);
  --color-blue-500: oklch(0.55 0.22 260);
  --color-blue-600: oklch(0.49 0.22 260);

  /* Semantic colors */
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
// Use in Tailwind v4 with theme()
<div className="bg-[var(--color-surface)] text-[var(--color-on-surface)]" />

// Or extend tailwind.config.ts
// colors: { primary: 'var(--color-primary)', surface: 'var(--color-surface)' }
// And use: <div className="bg-surface text-on-surface" />
```

---

## 6. Material UI — Conventions with Tailwind

```tsx
// ✅ MUI + Tailwind: use sx only for MUI overrides, Tailwind for layout
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
          textTransform: 'none',    // No forced UPPERCASE
          borderRadius: '0.375rem', // Sync with Tailwind rounded-md
        },
      },
    },
  },
});

// ✅ Layout with Tailwind, components with MUI
<div className="flex items-center gap-4 p-6">
  <Button variant="contained" size="large">
    Save
  </Button>
</div>

// ❌ DO NOT mix sx={{ margin: 2 }} with className="m-2"
// Choose one per component. Tailwind for layout, MUI sx for specific theming.
```

---

## CSS Anti-patterns

```tsx
// ❌ Inline styles for everything
<div style={{ display: 'flex', gap: '16px', padding: '24px' }} />

// ❌ !important
<div className="text-red-500 !important" />  // Code smell

// ❌ Global CSS without scope
/* globals.css */
.card { ... }  // Name collision. Use CSS Modules or Tailwind

// ❌ Random z-index
<div className="z-[9999]" />  // Use a defined scale: z-10, z-20, z-30, z-40, z-50

// ❌ Hardcoded magic values
<div className="w-[327px] h-[53px]" />  // Use spacing scale tokens

// ❌ Tailwind purge bypass
<div className={`bg-${dynamicColor}-500`} />  // Won't be purged correctly
```
