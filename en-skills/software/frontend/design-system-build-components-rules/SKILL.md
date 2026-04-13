---
name: design-system-build-components-rules
description: >
  Use this skill when building Design System components: atoms
  (Button, Input, Badge), molecules (SearchBar, FormField), organisms
  (Header, DataTable), design tokens, variants with CVA/cn, Storybook
  and visual testing.
---

# Design System — Component Construction

## Agent workflow

1. Classify component as atom, molecule, or organism.
2. Create file structure (implementation + variants + stories + test + barrel).
3. Implement variants with CVA, ALWAYS accept `className` prop.
4. Use `forwardRef` + `displayName` on atoms with native elements.
5. Verify all 8 mandatory rules (section 5).

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
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
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
          <svg
            className="h-4 w-4 animate-spin"
            aria-hidden="true"
            viewBox="0 0 24 24"
          >
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

const meta = {
  title: 'Atoms/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'destructive', 'outline'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'icon'] },
    isLoading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { children: 'Save changes', variant: 'primary' },
};

export const Loading: Story = {
  args: { children: 'Saving...', isLoading: true },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
    </div>
  ),
};
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

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: FormFieldProps) {
  const descriptionId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className={cn(
          'text-sm font-medium',
          error ? 'text-red-700' : 'text-gray-700',
        )}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
      </label>

      {/* The children (Input) should receive aria-describedby and aria-invalid */}
      {children}

      {hint && !error && (
        <p id={descriptionId} className="text-sm text-gray-500">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
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
  sortable?: boolean;
}

interface DataTableProps<T extends { id: string | number }> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  isLoading,
  emptyMessage = 'No results found',
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading data">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">{emptyMessage}</div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-medium text-gray-700">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((row) => (
            <tr
              key={row.id}
              className={cn(
                'transition-colors',
                onRowClick && 'cursor-pointer hover:bg-gray-50',
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3">
                  {col.render
                    ? col.render(row[col.key], row)
                    : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

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

## 5. Mandatory Rules

1. **`forwardRef`** on every atom that renders a native element
2. **`className` as a prop** — ALWAYS allow override via `cn(baseStyles, className)`
3. **`displayName`** mandatory on `forwardRef` components
4. **Variants with CVA** — no manual ternaries for conditional styles
5. **Built-in accessibility** — ARIA roles, `aria-label`, focus management
6. **Storybook story** — every component MUST have at least 1 story
7. **Render test** — verify it renders without crashing with minimal props
8. **No business logic** — DS components are pure UI, no fetching or global state

## Gotchas

- Hardcoded styles like `bg-[#1a73e8]` or `rounded-[6px]` bypass tokens — always use tokens or semantic Tailwind classes.
- Variants with chained ternaries are unreadable and don't scale — use CVA.
- Component without `forwardRef` that renders `<button>`/`<input>` prevents attaching refs — always wrap with `forwardRef`.
- DS component doing `useQuery` or any fetch mixes business logic with UI — receive data as props.
- Omitting `className` prop prevents consumer customization — always accept `className` and use `cn(base, className)`.
