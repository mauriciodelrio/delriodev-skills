---
name: component-patterns
description: >
  Patrones avanzados de composición de componentes React. Cubre Compound Components,
  Render Props, HOC, Slot pattern, Polymorphic components, y patrones de inversión
  de control para crear APIs de componentes flexibles y reutilizables.
---

# 🧩 Patrones de Composición de Componentes

## Principio Rector

> **Composición sobre configuración.** Prefiere componentes que se componen
> entre sí a componentes con 20 props de configuración.

---

## 1. Compound Components

Componentes que comparten estado implícito via Context. Ideal para UI con relación padre-hijo (Tabs, Accordion, Select).

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

// Asignar sub-componentes al padre
Tabs.Tab = Tab;
Tabs.Panel = Panel;

// USO:
// <Tabs defaultTab="general">
//   <Tabs.Tab value="general">General</Tabs.Tab>
//   <Tabs.Tab value="security">Seguridad</Tabs.Tab>
//   <Tabs.Panel value="general">Contenido general</Tabs.Panel>
//   <Tabs.Panel value="security">Contenido seguridad</Tabs.Panel>
// </Tabs>
```

---

## 2. Render Props / Children as Function

Cuando necesitas exponer lógica interna sin acoplar la UI.

```tsx
// ✅ Render Props — componente que expone estado de hover
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

// USO:
// <HoverTracker>
//   {(isHovered) => (
//     <Card className={isHovered ? 'shadow-lg' : 'shadow-sm'}>
//       {isHovered && <QuickActions />}
//     </Card>
//   )}
// </HoverTracker>
```

> **Nota:** En la mayoría de casos, un custom hook es más ergonómico que render props.
> Usa render props cuando necesitas **encapsular JSX wrapper** junto a la lógica.

---

## 3. Polymorphic Components (as prop)

Componentes que pueden renderizar como cualquier elemento HTML o componente.

```tsx
// ✅ Polymorphic component con tipado correcto
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

// USO — TypeScript infiere las props correctas del elemento:
// <Text>Span por defecto</Text>
// <Text as="p">Párrafo</Text>
// <Text as="label" htmlFor="email">Email</Text>  ← htmlFor solo disponible con "label"
// <Text as="a" href="/home">Link</Text>           ← href solo disponible con "a"
```

---

## 4. Slot Pattern

Para componentes con múltiples áreas de contenido nombradas.

```tsx
// ✅ Slot pattern — Card con áreas definidas
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

// USO:
// <Card
//   header={<h3>Título</h3>}
//   media={<img src={url} alt={alt} />}
//   footer={<><Button variant="ghost">Cancelar</Button><Button>Guardar</Button></>}
// >
//   <p>Contenido principal de la card.</p>
// </Card>
```

---

## 5. HOC (Higher-Order Component)

Usar **solo** cuando necesitas interceptar el ciclo de vida del componente que no controlas (ej: wrapping de librerías externas). En la mayoría de casos preferir hooks.

```tsx
// ✅ HOC — solo para casos justificados como auth wrappers
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

// ❌ EVITAR HOC para:
// - Inyectar datos (usar hooks)
// - Condicionar rendering (usar composición)
// - Agregar estilos (usar className/cn)
```

---

## 6. Controlled vs Uncontrolled Pattern

Para componentes que pueden funcionar en ambos modos.

```tsx
// ✅ Dual mode: controlled y uncontrolled
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

// USO uncontrolled: <Toggle defaultPressed={false}>Bold</Toggle>
// USO controlled:   <Toggle pressed={isBold} onPressedChange={setIsBold}>Bold</Toggle>
```

---

## Cuándo Usar Cada Patrón

| Patrón | Caso de Uso | Complejidad |
|--------|-------------|-------------|
| **Compound** | UI con relación padre-hijo (Tabs, Accordion, Menu) | Media |
| **Render Props** | Exponer lógica + wrapper JSX | Media |
| **Polymorphic** | Componentes de UI primitivos (`as` prop) | Alta (tipado) |
| **Slot** | Layouts con áreas nombradas (Card, Dialog, Page) | Baja |
| **HOC** | Wrapping de libs externas, auth guards legacy | Media |
| **Controlled/Uncontrolled** | Inputs, toggles, cualquier estado que el padre quiera controlar opcionalmente | Media |

---

## Anti-patrones

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
// ✅ Usar compound components o slots

// ❌ Prop drilling de callbacks
<Parent onSave={save} onCancel={cancel} onDelete={del} onEdit={edit} />
// ✅ Usar composición: pasar <Actions> como children o slot

// ❌ Componente con > 10 props
// Si tienes más de 10 props, necesitas descomponer en subcomponentes

// ❌ Render prop anidado (callback hell)
<Auth>{(user) => <Theme>{(theme) => <Data>{...}</Data>}</Theme>}</Auth>
// ✅ Usar hooks: const user = useAuth(); const theme = useTheme();
```
