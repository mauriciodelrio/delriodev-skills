---
name: component-patterns
description: >
  Advanced React component composition patterns. Covers Compound Components,
  Render Props, HOC, Slot pattern, Polymorphic components, and inversion
  of control patterns for creating flexible and reusable component APIs.
---

# 🧩 Component Composition Patterns

## Guiding Principle

> **Composition over configuration.** Prefer components that compose
> with each other over components with 20 configuration props.

---

## 1. Compound Components

Components that share implicit state via Context. Ideal for UI with parent-child relationships (Tabs, Accordion, Select).

```tsx
// ✅ Compound Component — Tabs
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

// Assign sub-components to the parent
Tabs.Tab = Tab;
Tabs.Panel = Panel;

// USAGE:
// <Tabs defaultTab="general">
//   <Tabs.Tab value="general">General</Tabs.Tab>
//   <Tabs.Tab value="security">Security</Tabs.Tab>
//   <Tabs.Panel value="general">General content</Tabs.Panel>
//   <Tabs.Panel value="security">Security content</Tabs.Panel>
// </Tabs>
```

---

## 2. Render Props / Children as Function

When you need to expose internal logic without coupling the UI.

```tsx
// ✅ Render Props — component that exposes hover state
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

// USAGE:
// <HoverTracker>
//   {(isHovered) => (
//     <Card className={isHovered ? 'shadow-lg' : 'shadow-sm'}>
//       {isHovered && <QuickActions />}
//     </Card>
//   )}
// </HoverTracker>
```

> **Note:** In most cases, a custom hook is more ergonomic than render props.
> Use render props when you need to **encapsulate a JSX wrapper** alongside the logic.

---

## 3. Polymorphic Components (as prop)

Components that can render as any HTML element or component.

```tsx
// ✅ Polymorphic component with correct typing
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

// USAGE — TypeScript infers the correct element props:
// <Text>Default span</Text>
// <Text as="p">Paragraph</Text>
// <Text as="label" htmlFor="email">Email</Text>  ← htmlFor only available with "label"
// <Text as="a" href="/home">Link</Text>           ← href only available with "a"
```

---

## 4. Slot Pattern

For components with multiple named content areas.

```tsx
// ✅ Slot pattern — Card with defined areas
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

// USAGE:
// <Card
//   header={<h3>Title</h3>}
//   media={<img src={url} alt={alt} />}
//   footer={<><Button variant="ghost">Cancel</Button><Button>Save</Button></>}
// >
//   <p>Main card content.</p>
// </Card>
```

---

## 5. HOC (Higher-Order Component)

Use **only** when you need to intercept the lifecycle of a component you don't control (e.g., wrapping external libraries). In most cases prefer hooks.

```tsx
// ✅ HOC — only for justified cases like auth wrappers
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

// ❌ AVOID HOC for:
// - Injecting data (use hooks)
// - Conditional rendering (use composition)
// - Adding styles (use className/cn)
```

---

## 6. Controlled vs Uncontrolled Pattern

For components that can work in both modes.

```tsx
// ✅ Dual mode: controlled and uncontrolled
interface ToggleProps {
  defaultPressed?: boolean;      // Uncontrolled
  pressed?: boolean;             // Controlled
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

// Uncontrolled usage: <Toggle defaultPressed={false}>Bold</Toggle>
// Controlled usage:   <Toggle pressed={isBold} onPressedChange={setIsBold}>Bold</Toggle>
```

---

## When to Use Each Pattern

| Pattern | Use Case | Complexity |
|---------|----------|------------|
| **Compound** | UI with parent-child relationship (Tabs, Accordion, Menu) | Medium |
| **Render Props** | Expose logic + JSX wrapper | Medium |
| **Polymorphic** | Primitive UI components (`as` prop) | High (typing) |
| **Slot** | Layouts with named areas (Card, Dialog, Page) | Low |
| **HOC** | Wrapping external libs, legacy auth guards | Medium |
| **Controlled/Uncontrolled** | Inputs, toggles, any state the parent may optionally want to control | Medium |

---

## Anti-patterns

```tsx
// ❌ Boolean props explosion
<Modal
  showHeader={true}
  showFooter={true}
  showCloseButton={true}
  showOverlay={true}
  fullScreen={false}
  centered={true}
/>
// ✅ Use compound components or slots

// ❌ Callback prop drilling
<Parent onSave={save} onCancel={cancel} onDelete={del} onEdit={edit} />
// ✅ Use composition: pass <Actions> as children or slot

// ❌ Component with > 10 props
// If you have more than 10 props, you need to decompose into sub-components

// ❌ Nested render props (callback hell)
<Auth>{(user) => <Theme>{(theme) => <Data>{...}</Data>}</Theme>}</Auth>
// ✅ Use hooks: const user = useAuth(); const theme = useTheme();
```
