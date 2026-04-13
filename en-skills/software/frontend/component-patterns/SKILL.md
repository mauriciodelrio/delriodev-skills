---
name: component-patterns
description: >
  Use this skill when you need React component composition patterns:
  Compound Components, Render Props, HOC, Slot pattern, Polymorphic components,
  and controlled/uncontrolled patterns for flexible and reusable APIs.
---

# Component Composition Patterns

## Agent Workflow

1. Identify the appropriate pattern using the decision table (section 7).
2. Implement the pattern following the code templates (sections 1-6).
3. Prefer composition (children/slots) over configuration props.
4. Prefer hooks over render props and HOC when possible.

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

// Assign sub-components to the parent
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

Prefer custom hooks over render props unless you need to encapsulate a JSX wrapper alongside the logic.

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

// TypeScript infers the correct element props:
// <Text as="label" htmlFor="email">Email</Text>  ← htmlFor only with "label"
// <Text as="a" href="/home">Link</Text>           ← href only with "a"
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

Use ONLY to intercept components you don't control (wrapping external libs). Prefer hooks.

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

## 7. When to Use Each Pattern

| Pattern | Use Case | Complexity |
|---------|----------|------------|
| **Compound** | UI with parent-child relationship (Tabs, Accordion, Menu) | Medium |
| **Render Props** | Expose logic + JSX wrapper | Medium |
| **Polymorphic** | Primitive UI components (`as` prop) | High (typing) |
| **Slot** | Layouts with named areas (Card, Dialog, Page) | Low |
| **HOC** | Wrapping external libs, legacy auth guards | Medium |
| **Controlled/Uncontrolled** | Inputs, toggles, any state the parent may optionally want to control | Medium |

## Gotchas

- Component with > 10 props needs to be decomposed into sub-components or use compound/slot pattern.
- Boolean props explosion (`showHeader`, `showFooter`, `showClose`...) — replace with compound components or slots.
- Callback prop drilling (`onSave`, `onCancel`, `onDelete`) — pass `<Actions>` as children or slot.
- HOC for injecting data or styles is unnecessary — use hooks or `className`/`cn()`.
- Nested render props create callback hell — extract to hooks: `const user = useAuth()`.
- `controlledPressed !== undefined` is the correct way to detect controlled mode — don't use `controlledPressed != null` because it excludes `false`.

## Related Skills

| Skill | Why | When |
|-------|-----|------|
| `testing-rules` | Every new component requires tests | Always |
| `a11y-rules` | WCAG 2.2 AA on every interactive component | Always |
| `css-rules` | Styles with Tailwind + `cn()` | Always |
