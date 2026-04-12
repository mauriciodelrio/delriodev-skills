---
name: design-system-build-components-rules
description: >
  Reglas para construir componentes de Design System siguiendo Atomic Design.
  Cubre átomos (Button, Input, Badge), moléculas (SearchBar, FormField),
  organismos (Header, DataTable), design tokens, variantes con CVA/cn,
  documentación con Storybook y testing visual.
---

# 🎨 Design System — Construcción de Componentes

## Principio Rector

> **Atomic Design + Composition API.** Cada componente es un átomo, molécula u organismo
> con API predecible, tokens de diseño consistentes y documentación Storybook.

---

## Jerarquía Atomic Design

```
🔵 Átomos       → Elementos indivisibles: Button, Input, Badge, Icon, Text, Avatar
🟢 Moléculas    → Combinación de átomos: SearchBar, FormField, NavItem, Card
🟠 Organismos   → Secciones completas: Header, DataTable, Sidebar, HeroSection
🔴 Templates    → Layouts de página (viven en app/, no en el design system)
⚫ Páginas       → Instancias concretas (viven en app/, no en el design system)
```

---

## Estructura de un Componente del Design System

```
shared/components/ui/Button/
├── Button.tsx              # Implementación
├── Button.test.tsx         # Tests unitarios
├── Button.stories.tsx      # Storybook stories
├── Button.variants.ts      # Variantes CVA (si es complejo)
└── index.ts                # Barrel: export { Button } from './Button'
```

---

## 1. Átomos — Ejemplo Completo: Button

```tsx
// Button.variants.ts — Variantes con class-variance-authority
import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  // Base styles — aplicados siempre
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
// Button.tsx
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
// Button.stories.tsx — Storybook
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
  args: { children: 'Guardar cambios', variant: 'primary' },
};

export const Loading: Story = {
  args: { children: 'Guardando...', isLoading: true },
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

---

## 2. Moléculas — Ejemplo: FormField

Combina átomos (Label + Input + Error message) en una unidad reutilizable.

```tsx
// FormField.tsx — Molécula
import { type ReactNode } from 'react';
import { cn } from '@shared/lib/cn';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode; // El input/select/textarea
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

      {/* El children (Input) debe recibir aria-describedby y aria-invalid externamente */}
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

---

## 3. Organismos — Ejemplo: DataTable

```tsx
// DataTable.tsx — Organismo con composición de moléculas y átomos
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
  emptyMessage = 'No se encontraron resultados',
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label="Cargando datos">
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

---

## Design Tokens

```css
/* styles/tokens.css — Custom properties como fuente de verdad */
:root {
  /* Colores semánticos */
  --color-primary: theme('colors.blue.600');
  --color-primary-hover: theme('colors.blue.700');
  --color-destructive: theme('colors.red.600');
  --color-muted: theme('colors.gray.500');

  /* Espaciado consistente */
  --space-xs: 0.25rem;   /* 4px */
  --space-sm: 0.5rem;    /* 8px */
  --space-md: 1rem;      /* 16px */
  --space-lg: 1.5rem;    /* 24px */
  --space-xl: 2rem;      /* 32px */

  /* Radio de bordes */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-full: 9999px;

  /* Sombras */
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px rgb(0 0 0 / 0.07);

  /* Transiciones */
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
}

/* Dark mode */
[data-theme='dark'] {
  --color-primary: theme('colors.blue.400');
  --color-primary-hover: theme('colors.blue.300');
}
```

---

## Reglas Obligatorias para Todo Componente del DS

1. **`forwardRef`** en todo átomo que renderiza un elemento nativo
2. **`className` como prop** — SIEMPRE permitir override via `cn(baseStyles, className)`
3. **`displayName`** obligatorio en `forwardRef` components
4. **Variantes con CVA** — no ternarios manuales para estilos condicionales
5. **Accessibility built-in** — roles ARIA, `aria-label`, focus management
6. **Story en Storybook** — cada componente DEBE tener al menos 1 story
7. **Test de rendering** — verificar que renderiza sin crash con props mínimas
8. **No lógica de negocio** — los componentes del DS son UI pura, sin fetch ni estado global

---

## Anti-patrones

```tsx
// ❌ Estilos hardcoded sin tokens
<button className="bg-[#1a73e8] rounded-[6px]">

// ❌ Variantes con ternarios encadenados
className={`${variant === 'primary' ? 'bg-blue-600' : variant === 'secondary' ? 'bg-gray-100' : ''}`}

// ❌ Componente sin forwardRef que renderiza <button>/<input>
export function Input(props: InputProps) { ... } // No se puede adjuntar ref

// ❌ Componente del DS que hace fetch de datos
export function UserCard() {
  const { data } = useQuery(...); // ❌ Lógica de negocio en el DS
}

// ❌ Omitir className prop — impide customización
export function Badge({ label }: { label: string }) { ... } // No acepta className
```
