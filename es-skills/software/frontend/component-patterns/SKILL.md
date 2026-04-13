---
name: component-patterns
description: >
  Usa esta skill cuando necesites patrones de composición de componentes React:
  Compound Components, Render Props, HOC, Slot pattern, Polymorphic components,
  y patrones controlled/uncontrolled para APIs flexibles y reutilizables.
---

# Patrones de Composición de Componentes

## Flujo de trabajo del agente

1. Identificar el patrón adecuado según la tabla de decisión (sección 7).
2. Implementar el patrón siguiendo los templates de código (secciones 1-6).
3. Preferir composición (children/slots) sobre props de configuración.
4. Preferir hooks sobre render props y HOC cuando sea posible.

## 1. Compound Components

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tab components must be used within <Tabs>');
  return context;
}

interface TabsProps {
  defaultTab: string;
  children: ReactNode;
}

export function Tabs({ defaultTab, children }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div role="tablist">{children}</div>
    </TabsContext.Provider>
  );
}

interface TabProps {
  value: string;
  children: ReactNode;
}

function Tab({ value, children }: TabProps) {
  const { activeTab, setActiveTab } = useTabsContext();

  return (
    <button
      role="tab"
      aria-selected={activeTab === value}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

function Panel({ value, children }: TabProps) {
  const { activeTab } = useTabsContext();
  if (activeTab !== value) return null;

  return <div role="tabpanel">{children}</div>;
}

// Asignar sub-componentes al padre
Tabs.Tab = Tab;
Tabs.Panel = Panel;
```

## 2. Render Props

```tsx
interface HoverTrackerProps {
  children: (isHovered: boolean) => ReactNode;
}

export function HoverTracker({ children }: HoverTrackerProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children(isHovered)}
    </div>
  );
}
```

Preferir custom hook sobre render props excepto cuando se necesita encapsular un JSX wrapper junto a la lógica.

## 3. Polymorphic Components (as prop)

```tsx
import { type ElementType, type ComponentPropsWithoutRef } from 'react';

type TextProps<T extends ElementType = 'span'> = {
  as?: T;
  variant?: 'body' | 'caption' | 'label';
} & ComponentPropsWithoutRef<T>;

export function Text<T extends ElementType = 'span'>({
  as,
  variant = 'body',
  className,
  ...props
}: TextProps<T>) {
  const Component = as ?? 'span';
  const variantStyles = {
    body: 'text-base text-gray-900',
    caption: 'text-sm text-gray-500',
    label: 'text-sm font-medium text-gray-700',
  };

  return (
    <Component
      className={cn(variantStyles[variant], className)}
      {...props}
    />
  );
}

// TypeScript infiere las props correctas del elemento:
// <Text as="label" htmlFor="email">Email</Text>  ← htmlFor solo con "label"
// <Text as="a" href="/home">Link</Text>           ← href solo con "a"
```

## 4. Slot Pattern

```tsx
interface CardSlots {
  header?: ReactNode;
  media?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function Card({ header, media, children, footer }: CardSlots) {
  return (
    <article className="rounded-lg border bg-white shadow-sm">
      {header && (
        <div className="border-b px-4 py-3 font-semibold">{header}</div>
      )}
      {media && <div className="aspect-video overflow-hidden">{media}</div>}
      <div className="p-4">{children}</div>
      {footer && (
        <div className="border-t px-4 py-3 flex justify-end gap-2">
          {footer}
        </div>
      )}
    </article>
  );
}
```

## 5. HOC (Higher-Order Component)

Usar SOLO para interceptar componentes que no controlas (wrapping de libs externas). Preferir hooks.

```tsx
import { type ComponentType } from 'react';
import { redirect } from 'next/navigation';

export function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>,
) {
  function AuthenticatedComponent(props: P) {
    const { user, isLoading } = useAuth();

    if (isLoading) return <LoadingSkeleton />;
    if (!user) redirect('/login');

    return <WrappedComponent {...props} />;
  }

  AuthenticatedComponent.displayName =
    `withAuth(${WrappedComponent.displayName ?? WrappedComponent.name})`;

  return AuthenticatedComponent;
}
```

## 6. Controlled vs Uncontrolled

```tsx
interface ToggleProps {
  defaultPressed?: boolean;   // Uncontrolled
  pressed?: boolean;          // Controlled
  onPressedChange?: (pressed: boolean) => void;
  children: ReactNode;
}

export function Toggle({
  defaultPressed = false,
  pressed: controlledPressed,
  onPressedChange,
  children,
}: ToggleProps) {
  const [uncontrolledPressed, setUncontrolledPressed] = useState(defaultPressed);
  const isControlled = controlledPressed !== undefined;
  const isPressed = isControlled ? controlledPressed : uncontrolledPressed;

  function handleToggle() {
    const next = !isPressed;
    if (!isControlled) setUncontrolledPressed(next);
    onPressedChange?.(next);
  }

  return (
    <button
      aria-pressed={isPressed}
      onClick={handleToggle}
      data-state={isPressed ? 'on' : 'off'}
    >
      {children}
    </button>
  );
}
```

## 7. Cuándo Usar Cada Patrón

| Patrón | Caso de Uso | Complejidad |
|--------|-------------|-------------|
| **Compound** | UI con relación padre-hijo (Tabs, Accordion, Menu) | Media |
| **Render Props** | Exponer lógica + wrapper JSX | Media |
| **Polymorphic** | Componentes de UI primitivos (`as` prop) | Alta (tipado) |
| **Slot** | Layouts con áreas nombradas (Card, Dialog, Page) | Baja |
| **HOC** | Wrapping de libs externas, auth guards legacy | Media |
| **Controlled/Uncontrolled** | Inputs, toggles, estado que el padre quiera controlar opcionalmente | Media |

## Gotchas

- Componente con > 10 props indica que necesita descomponerse en sub-componentes o usar compound/slot pattern.
- Explosión de boolean props (`showHeader`, `showFooter`, `showClose`...) — reemplazar con compound components o slots.
- Prop drilling de callbacks (`onSave`, `onCancel`, `onDelete`) — pasar `<Actions>` como children o slot.
- HOC para inyectar datos o estilos es innecesario — usar hooks o `className`/`cn()`.
- Render props anidados crean callback hell — extraer a hooks: `const user = useAuth()`.
- `controlledPressed !== undefined` es la forma correcta de detectar modo controlled — no usar `controlledPressed != null` porque excluye `false`.

## Skills Relacionadas

| Skill | Por qué | Cuándo |
|-------|---------|--------|
| `testing-rules` | Todo componente nuevo requiere tests | Siempre |
| `a11y-rules` | WCAG 2.2 AA en cada componente interactivo | Siempre |
| `css-rules` | Estilos con Tailwind + `cn()` | Siempre |
