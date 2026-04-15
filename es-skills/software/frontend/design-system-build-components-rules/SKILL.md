---
name: design-system-build-components-rules
description: >
  Usa esta skill cuando construyas componentes de Design System: átomos
  (Button, Input, Badge), moléculas (SearchBar, FormField), organismos
  (Header, DataTable). Cubre escala unificada de tokens de dimensión,
  variantes CVA/cn, accesibilidad WCAG 2.2 AA integrada, i18n sin strings
  hardcoded, estado interno con Signals, Storybook y testing visual.
---

# Design System — Construcción de Componentes

## Flujo de trabajo del agente

1. Clasificar componente como átomo, molécula u organismo.
2. Crear estructura de archivos (implementación + variants + stories + test + barrel).
3. Implementar variantes con CVA usando tokens de `sizeMap`/`radiusMap`/`shadowMap` (sección **Tokens de Dimensión**).
4. Usar `forwardRef` + `displayName` en átomos con elementos nativos.
5. Aplicar a11y WCAG 2.2 AA: roles, `aria-*`, focus, contraste — ver sección **Accesibilidad e i18n** y [`a11y-rules`](../a11y-rules/SKILL.md).
6. Asegurar que todo texto visible del usuario es prop — nunca hardcoded — ver sección **Accesibilidad e i18n** y [`i18n-react-rules`](../i18n-react-rules/SKILL.md).
7. Definir estado interno con Signals o Zustand — ver sección **Estado en el Design System**.
8. Verificar las 12 reglas obligatorias.

## Cross-referencias Obligatorias

| Skill | Cuándo activar |
|-------|----------------|
| [`a11y-rules`](../a11y-rules/SKILL.md) | Siempre — todo componente DS cumple WCAG 2.2 AA |
| [`css-rules`](../css-rules/SKILL.md) | Siempre — Tailwind, `cn()`, tokens, dark mode |
| [`i18n-react-rules`](../i18n-react-rules/SKILL.md) | Proyecto Vite/React — strings traducibles, RTL, `aria-label` i18n |
| [`i18n-nextjs-rules`](../i18n-nextjs-rules/SKILL.md) | Proyecto Next.js — igual que el anterior |
| [`component-patterns`](../component-patterns/SKILL.md) | Compound components, Render Props, Polymorphic |
| [`react-best-practices`](../react-best-practices/SKILL.md) | `forwardRef`, hooks rules, memoización estratégica |
| [`state-management-rules`](../state-management-rules/SKILL.md) | Estado interno DS: Signals, Zustand, árbol de decisión |
| [`testing-rules`](../testing-rules/SKILL.md) | Tests de rendering y a11y con axe-core |
| [`storybook`](../storybook/SKILL.md) | Stories de cada componente DS, play functions, addon-a11y |

## Jerarquía Atomic Design

```
Átomos       → Elementos indivisibles: Button, Input, Badge, Icon, Text, Avatar
Moléculas    → Combinación de átomos: SearchBar, FormField, NavItem, Card
Organismos   → Secciones completas: Header, DataTable, Sidebar, HeroSection
Templates    → Layouts de página (viven en app/, no en el design system)
Páginas      → Instancias concretas (viven en app/, no en el design system)
```

## Estructura de Componente

```
shared/components/ui/Button/
├── Button.tsx
├── Button.test.tsx
├── Button.stories.tsx
├── Button.variants.ts
└── index.ts
```

## Tokens de Dimensión — Escala Unificada

> **Regla de oro**: todos los componentes del DS usan la misma escala. Prohibido valores arbitrarios (`h-[37px]`, `rounded-[6px]`). Si el tamaño no existe en el mapa, se agrega al mapa — nunca se escribe inline.

### Mapa de Tokens (fuente única de verdad)

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

### CVA con Tokens — patrón estándar

Cada variante de `size`/`radius` referencia el mapa. Nunca clases sueltas con valores inventados.

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

## 1. Átomos — Ejemplo: Button

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
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { children: 'Guardar cambios', variant: 'primary' } };
export const Loading: Story = { args: { children: 'Guardando...', isLoading: true } };
export const Destructive: Story = { args: { children: 'Eliminar', variant: 'destructive' } };
```

## 2. Moléculas — Ejemplo: FormField

```tsx
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

      {/* El children (Input) debe recibir aria-describedby y aria-invalid */}
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

## 3. Organismos — Ejemplo: DataTable

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
  columns, data, isLoading, emptyMessage = 'No results', onRowClick,
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

## Accesibilidad e i18n por Componente

### Contrato de Accesibilidad (WCAG 2.2 AA)

Todo componente DS se aprueba solo si cumple el checklist de [`a11y-rules`](../a11y-rules/SKILL.md). Requisitos mínimos por tipo:

| Tipo | Requisito clave |
|------|-----------------|
| Button icon-only | `aria-label` como prop obligatoria |
| Input / Textarea | `id` + `<label htmlFor>`, `aria-required`, `aria-invalid`, `aria-describedby` |
| Modal / Dialog | `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap, Escape cierra |
| Toast / Alerta | `role="alert"` (errores) · `aria-live="polite"` (info) |
| Menú desplegable | `role="menu"`, `role="menuitem"`, flechas ↑↓ navegan, Escape cierra |
| DataTable | `<caption>`, `scope="col"` / `scope="row"` en headers |
| Tabs | `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, flechas ↑↓ |
| Badge / Estado | Nunca solo color — incluir texto o `aria-label` descriptivo |

### Contrato de i18n

Un componente DS **nunca** hardcodea strings visibles por el usuario. Todo texto se inyecta como prop, ya traducido por el consumidor. Ver [`i18n-react-rules`](../i18n-react-rules/SKILL.md) para setup de namespaces.

**Props de texto obligatorias por tipo:**

| Componente | Props de texto | Notas |
|------------|----------------|-------|
| Button icon-only | `aria-label` (required) | String traducido por el consumidor |
| Input | `placeholder?`, `aria-label?` | Solo si no hay `<label>` externo |
| DataTable | `emptyMessage`, `loadingLabel` | Defaults en inglés solo como fallback de desarrollo |
| Modal | `title` o via `aria-labelledby` | Texto del consumidor |
| Toast | `message` | Siempre prop, nunca hardcoded |
| Badge | `label` o `children` | Color semántico + texto siempre |

Ver [`i18n-react-rules`](../i18n-react-rules/SKILL.md) para setup de react-i18next, namespaces y traducciones de `aria-label`.

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

## Estado en el Design System

### Árbol de Decisión

```
¿El estado es interno a un componente (abierto/cerrado, valor activo)?
└── useSignal() o useState — local al componente

¿Estado compartido en un Compound Component (Tabs, Accordion)?
├── Poco anidamiento → useSignal() local + pass down como prop
└── Árbol profundo → signal de módulo en el compound root (evita Context)

¿Estado DS que cruza componentes no relacionados (config global, tema visual)?
├── Signals module-scope → exportar signal; cada componente lee directamente
└── Zustand → si necesita devtools, persistencia o múltiples slices

¿El estado viene de API o servidor?
└── NUNCA en el DS — recibir como prop. El DS es UI pura.
```

### Signals para Estado Interno (preferido)

`useSignal` / `useComputed` de `@preact/signals-react` para estado local. No genera re-renders en cascada y no requiere Context.

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
          onToggle={() => {
            openId.value = openId.value === item.id ? null : item.id;
          }}
        />
      ))}
    </div>
  );
}
```

### Zustand para Config DS Global (cuando aplique)

Solo cuando el estado DS necesita cruzar componentes no relacionados:

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

### Context — Solo Como Último Recurso

Context re-renderiza **todo** su subárbol. Preferir Signals (granular) o Zustand con selectores. Ver [`state-management-rules`](../state-management-rules/SKILL.md) para comparativa completa.

## 5. Reglas Obligatorias

1. **`forwardRef`** en todo átomo que renderiza un elemento nativo (`<button>`, `<input>`, etc.)
2. **`className` como prop** — SIEMPRE permitir override via `cn(baseStyles, className)`
3. **`displayName`** obligatorio en `forwardRef` components
4. **Variantes con CVA** — no ternarios manuales para estilos condicionales
5. **Escala unificada de dimensiones** — usar `sizeMap`/`radiusMap`/`shadowMap` de `tokens.ts`; prohibido valores arbitrarios como `h-[37px]` o `rounded-[6px]`
6. **Solo Tailwind + `cn()`** — sin CSS-in-JS, sin librerías de componentes externas, sin `style={{}}` con valores mágicos
7. **Accesibilidad WCAG 2.2 AA** — roles ARIA correctos, `aria-label`/`aria-labelledby`, focus management, contraste ≥ 4.5:1; pasar checklist de [`a11y-rules`](../a11y-rules/SKILL.md) antes de commit
8. **Sin strings hardcoded** — todo texto visible para el usuario se recibe como prop; `aria-label` en botones icon-only es prop obligatoria
9. **Story en Storybook** — al menos 1 story por variante; cubrir estados loading, disabled y error cuando aplique
10. **Test de rendering + a11y** — render sin crash con props mínimas + test con `axe-core`
11. **Sin estado de servidor** — ningún `fetch`, `useQuery` ni store global en el DS; los datos siempre vienen por props
12. **Estado interno con Signals** — `useSignal`/`useComputed` para estado local; Zustand para config DS compartida; Context solo como último recurso

## Gotchas

- Estilos hardcoded `bg-[#1a73e8]` o `h-[37px]` se saltan los tokens — referenciar siempre `sizeMap`/`radiusMap` de `tokens.ts`. Si el tamaño no existe, agregarlo al mapa.
- Variantes con ternarios encadenados son ilegibles y no escalan — usar CVA.
- Componente sin `forwardRef` que renderiza `<button>`/`<input>` no permite adjuntar refs — siempre wrappear con `forwardRef`.
- Componente del DS que hace `useQuery` o cualquier fetch mezcla lógica de negocio con UI — recibir datos como props.
- Omitir `className` prop impide customización por el consumidor — siempre aceptar `className` y usar `cn(base, className)`.
- `outline-none` sin `ring-*` de reemplazo rompe la navegación por teclado silenciosamente — nunca eliminar el focus indicator sin proveer uno equivalente.
- Mapa de tokens desincronizado entre componentes crea inconsistencia visual — toda prop `size` debe referenciar el mismo `SizeKey` de `tokens.ts`.
