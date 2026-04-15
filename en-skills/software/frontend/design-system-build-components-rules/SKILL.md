---
name: design-system-build-components-rules
description: >
  Use this skill when building Design System components: atoms
  (Button, Input, Badge), molecules (SearchBar, FormField), organisms
  (Header, DataTable). Covers unified dimension token scale,
  CVA/cn variants, built-in WCAG 2.2 AA accessibility, i18n without
  hardcoded strings, internal state with Signals, Storybook and visual testing.
---

# Design System — Component Construction

## Agent workflow

1. Classify component as atom, molecule, or organism.
2. Create file structure (implementation + variants + stories + test + barrel).
3. Implement variants with CVA using tokens from `sizeMap`/`radiusMap`/`shadowMap` (section **Dimension Tokens**).
4. Use `forwardRef` + `displayName` on atoms with native elements.
5. Apply a11y WCAG 2.2 AA: roles, `aria-*`, focus, contrast — see section **Accessibility & i18n** and [`a11y-rules`](../a11y-rules/SKILL.md).
6. Ensure every user-visible string is a prop — never hardcoded — see section **Accessibility & i18n** and [`i18n-react-rules`](../i18n-react-rules/SKILL.md).
7. Define internal state with Signals or Zustand — see section **State in the Design System**.
8. Verify all 12 mandatory rules.

## Mandatory Cross-references

| Skill | When to activate |
|-------|------------------|
| [`a11y-rules`](../a11y-rules/SKILL.md) | Always — every DS component must comply with WCAG 2.2 AA |
| [`css-rules`](../css-rules/SKILL.md) | Always — Tailwind, `cn()`, tokens, dark mode |
| [`i18n-react-rules`](../i18n-react-rules/SKILL.md) | Vite/React project — translatable strings, RTL, `aria-label` i18n |
| [`i18n-nextjs-rules`](../i18n-nextjs-rules/SKILL.md) | Next.js project — same as above |
| [`component-patterns`](../component-patterns/SKILL.md) | Compound components, Render Props, Polymorphic |
| [`react-best-practices`](../react-best-practices/SKILL.md) | `forwardRef`, hooks rules, strategic memoization |
| [`state-management-rules`](../state-management-rules/SKILL.md) | DS internal state: Signals, Zustand, decision tree |
| [`testing-rules`](../testing-rules/SKILL.md) | Rendering and a11y tests with axe-core |
| [`storybook`](../storybook/SKILL.md) | Stories for each DS component, play functions, addon-a11y |

## Atomic Design Hierarchy

```
Atoms       → Indivisible elements: Button, Input, Badge, Icon, Text, Avatar
Molecules   → Atom combinations: SearchBar, FormField, NavItem, Card
Organisms   → Complete sections: Header, DataTable, Sidebar, HeroSection
Templates   → Page layouts (live in app/, not in the design system)
Pages       → Concrete instances (live in app/, not in the design system)
```

## Component Structure

```
shared/components/ui/Button/
├── Button.tsx
├── Button.test.tsx
├── Button.stories.tsx
├── Button.variants.ts
└── index.ts
```

## Dimension Tokens — Unified Scale

> **Golden rule**: all DS components use the same scale. Arbitrary values (`h-[37px]`, `rounded-[6px]`) are forbidden. If a size doesn’t exist in the map, add it to the map — never write it inline.

### Token Map (single source of truth)

```typescript
// shared/components/ui/tokens.ts
export const sizeMap = {
  xs: { height: 'h-7',  px: 'px-2', text: 'text-xs',   icon: 'h-3.5 w-3.5' },
  sm: { height: 'h-8',  px: 'px-3', text: 'text-sm',   icon: 'h-4 w-4'     },
  md: { height: 'h-10', px: 'px-4', text: 'text-sm',   icon: 'h-4 w-4'     },
  lg: { height: 'h-12', px: 'px-5', text: 'text-base', icon: 'h-5 w-5'     },
  xl: { height: 'h-14', px: 'px-6', text: 'text-lg',   icon: 'h-5 w-5'     },
} as const;

export const radiusMap = {
  none: 'rounded-none',
  sm:   'rounded-sm',   // 2px
  md:   'rounded-md',   // 6px
  lg:   'rounded-lg',   // 8px
  full: 'rounded-full',
} as const;

export const shadowMap = {
  none: '',
  sm:   'shadow-sm',
  md:   'shadow-md',
  lg:   'shadow-lg',
} as const;

export type SizeKey   = keyof typeof sizeMap;
export type RadiusKey = keyof typeof radiusMap;
export type ShadowKey = keyof typeof shadowMap;
```

### CVA with Tokens — standard pattern

Each `size`/`radius` variant references the map. Never loose classes with invented values.

```typescript
import { cn } from '@shared/lib/cn';
import { sizeMap, radiusMap, type SizeKey, type RadiusKey } from '@shared/components/ui/tokens';

export const inputVariants = cva(
  'w-full border bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        sm: cn(sizeMap.sm.height, sizeMap.sm.px, sizeMap.sm.text),
        md: cn(sizeMap.md.height, sizeMap.md.px, sizeMap.md.text),
        lg: cn(sizeMap.lg.height, sizeMap.lg.px, sizeMap.lg.text),
      },
      radius: {
        sm: radiusMap.sm,
        md: radiusMap.md,
        lg: radiusMap.lg,
      },
      state: {
        default: 'border-gray-300 focus-visible:ring-blue-500',
        error:   'border-red-500 focus-visible:ring-red-500',
      },
    },
    defaultVariants: { size: 'md', radius: 'md', state: 'default' },
  },
);
```

## 1. Atoms — Example: Button

```tsx
import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'rounded-md font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500',
        ghost: 'hover:bg-gray-100 text-gray-700 focus-visible:ring-gray-500',
        destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 focus-visible:ring-gray-500',
      },
      size: {
        sm: cn(sizeMap.sm.height, sizeMap.sm.px, sizeMap.sm.text),
        md: cn(sizeMap.md.height, sizeMap.md.px, sizeMap.md.text),
        lg: cn(sizeMap.lg.height, sizeMap.lg.px, sizeMap.lg.text),
        icon: cn(sizeMap.md.height, 'w-10'),
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
```

```tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@shared/lib/cn';
import { buttonVariants, type ButtonVariants } from './Button.variants';

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariants {
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading && (
          <svg className="h-4 w-4 animate-spin" aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75" />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
```

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta = { title: 'Atoms/Button', component: Button } satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story    = { args: { children: 'Save changes', variant: 'primary' } };
export const Loading: Story    = { args: { children: 'Saving...', isLoading: true } };
export const Destructive: Story = { args: { children: 'Delete', variant: 'destructive' } };
```

## 2. Molecules — Example: FormField

```tsx
import { type ReactNode } from 'react';
import { cn } from '@shared/lib/cn';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode; // The input/select/textarea
}

export function FormField({ label, htmlFor, error, hint, required, children }: FormFieldProps) {
  const descriptionId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className={cn('text-sm font-medium', error ? 'text-red-700' : 'text-gray-700')}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
      </label>

      {children}

      {hint && !error && <p id={descriptionId} className="text-sm text-gray-500">{hint}</p>}
      {error && <p id={errorId} className="text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );
}
```

## 3. Organisms — Example: DataTable

```tsx
import { type ReactNode } from 'react';

interface Column<T> {
  key: keyof T & string;
  header: string;
  render?: (value: T[keyof T], row: T) => ReactNode;
}

interface DataTableProps<T extends { id: string | number }> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  loadingLabel?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends { id: string | number }>({
  columns, data, isLoading, emptyMessage = 'No results', loadingLabel = 'Loading', onRowClick,
}: DataTableProps<T>) {
  if (isLoading) return (
    <div className="space-y-3" role="status" aria-label={loadingLabel}>
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />)}
    </div>
  );

  if (data.length === 0) return <div className="py-12 text-center text-gray-500">{emptyMessage}</div>;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr>{columns.map((col) => <th key={col.key} className="px-4 py-3 font-medium text-gray-700" scope="col">{col.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {data.map((row) => (
            <tr key={row.id} className={cn('transition-colors', onRowClick && 'cursor-pointer hover:bg-gray-50')} onClick={() => onRowClick?.(row)}>
              {columns.map((col) => <td key={col.key} className="px-4 py-3">{col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Accessibility & i18n per Component

### Accessibility Contract (WCAG 2.2 AA)

A DS component is approved only if it passes the checklist from [`a11y-rules`](../a11y-rules/SKILL.md). Minimum requirements by type:

| Type | Key requirement |
|------|-----------------|
| Icon-only Button | `aria-label` as a required prop |
| Input / Textarea | `id` + `<label htmlFor>`, `aria-required`, `aria-invalid`, `aria-describedby` |
| Modal / Dialog | `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap, Escape closes |
| Toast / Alert | `role="alert"` (errors) · `aria-live="polite"` (info) |
| Dropdown Menu | `role="menu"`, `role="menuitem"`, ↑↓ arrows navigate, Escape closes |
| DataTable | `<caption>`, `scope="col"` / `scope="row"` on headers |
| Tabs | `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, ↑↓ arrows |
| Badge / Status | Never color-only — include text or descriptive `aria-label` |

### i18n Contract

A DS component **never** hardcodes user-visible strings. All text is injected as a prop, already translated by the consumer. See [`i18n-react-rules`](../i18n-react-rules/SKILL.md) for namespace setup.

**Required text props by type:**

| Component | Text props | Notes |
|-----------|------------|-------|
| Icon-only Button | `aria-label` (required) | Translated string from the consumer |
| Input | `placeholder?`, `aria-label?` | Only if there’s no external `<label>` |
| DataTable | `emptyMessage`, `loadingLabel` | English defaults only as dev fallback |
| Modal | `title` or via `aria-labelledby` | Text from the consumer |
| Toast | `message` | Always a prop, never hardcoded |
| Badge | `label` or `children` | Semantic color + text always |

## 4. Design Tokens

```css
:root {
  --color-primary: theme('colors.blue.600');
  --color-primary-hover: theme('colors.blue.700');
  --color-destructive: theme('colors.red.600');
  --color-muted: theme('colors.gray.500');
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px rgb(0 0 0 / 0.07);
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
}

[data-theme='dark'] {
  --color-primary: theme('colors.blue.400');
  --color-primary-hover: theme('colors.blue.300');
}
```

## State in the Design System

### Decision Tree

```
Is the state internal to a component (open/closed, active value)?
└── useSignal() or useState — local to the component

State shared in a Compound Component (Tabs, Accordion)?
├── Shallow nesting → useSignal() local + pass down as prop
└── Deep tree → module-scope signal at the compound root (avoids Context)

DS state crossing unrelated components (global config, visual theme)?
├── Module-scope signals → export signal; each component reads directly
└── Zustand → if devtools, persistence, or multiple slices are needed

Does the state come from an API or server?
└── NEVER in the DS — receive as prop. The DS is pure UI.
```

### Signals for Internal State (preferred)

`useSignal` / `useComputed` from `@preact/signals-react` for local state. No cascading re-renders and no Context needed.

```tsx
import { useSignal } from '@preact/signals-react';

export function Accordion({ items, defaultOpenId }: AccordionProps) {
  const openId = useSignal<string | null>(defaultOpenId ?? null);

  return (
    <div>
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          item={item}
          isOpen={openId.value === item.id}
          onToggle={() => { openId.value = openId.value === item.id ? null : item.id; }}
        />
      ))}
    </div>
  );
}
```

### Zustand for Global DS Config (when applicable)

Only when DS state needs to cross unrelated components:

```tsx
import { create } from 'zustand';
import type { SizeKey, RadiusKey } from '@shared/components/ui/tokens';

interface DSConfigStore {
  defaultSize: SizeKey;
  defaultRadius: RadiusKey;
  setDefaultSize: (size: SizeKey) => void;
  setDefaultRadius: (radius: RadiusKey) => void;
}

export const useDSConfig = create<DSConfigStore>((set) => ({
  defaultSize: 'md',
  defaultRadius: 'md',
  setDefaultSize: (size) => set({ defaultSize: size }),
  setDefaultRadius: (radius) => set({ defaultRadius: radius }),
}));
```

### Context — Last Resort Only

Context re-renders **the entire subtree**. Prefer Signals (granular) or Zustand with selectors. See [`state-management-rules`](../state-management-rules/SKILL.md) for a full comparison.

## 5. Mandatory Rules

1. **`forwardRef`** on every atom that renders a native element (`<button>`, `<input>`, etc.)
2. **`className` as a prop** — ALWAYS allow override via `cn(baseStyles, className)`
3. **`displayName`** mandatory on `forwardRef` components
4. **Variants with CVA** — no manual ternaries for conditional styles
5. **Unified dimension scale** — use `sizeMap`/`radiusMap`/`shadowMap` from `tokens.ts`; arbitrary values like `h-[37px]` or `rounded-[6px]` are forbidden
6. **Tailwind + `cn()` only** — no CSS-in-JS, no external component libraries, no `style={{}}` with magic values
7. **WCAG 2.2 AA accessibility** — correct ARIA roles, `aria-label`/`aria-labelledby`, focus management, contrast ≥ 4.5:1; pass [`a11y-rules`](../a11y-rules/SKILL.md) checklist before commit
8. **No hardcoded strings** — every user-visible text is received as a prop; `aria-label` on icon-only buttons is a required prop
9. **Storybook story** — at least 1 story per variant; cover loading, disabled, and error states where applicable
10. **Rendering + a11y test** — render without crash with minimal props + test with `axe-core`
11. **No server state** — no `fetch`, `useQuery`, or global store in the DS; data always comes through props
12. **Internal state with Signals** — `useSignal`/`useComputed` for local state; Zustand for shared DS config; Context only as a last resort

## Gotchas

- Hardcoded styles `bg-[#1a73e8]` or `h-[37px]` bypass tokens — always reference `sizeMap`/`radiusMap` from `tokens.ts`. If a size doesn’t exist, add it to the map.
- Variants with chained ternaries are unreadable and don’t scale — use CVA.
- Component without `forwardRef` that renders `<button>`/`<input>` prevents attaching refs — always wrap with `forwardRef`.
- DS component doing `useQuery` or any fetch mixes business logic with UI — receive data as props.
- Omitting `className` prop prevents consumer customization — always accept `className` and use `cn(base, className)`.
- `outline-none` without a `ring-*` replacement silently breaks keyboard navigation — never remove the focus indicator without providing an equivalent.
- Token map out of sync across components creates visual inconsistency — every `size` prop must reference the same `SizeKey` from `tokens.ts`.
