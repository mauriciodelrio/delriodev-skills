---
name: react-best-practices
description: >
  Mejores prácticas de React 19+. Cubre reglas de hooks, composición sobre herencia,
  memoización estratégica, manejo de refs, keys, children patterns, Server Components
  vs Client Components, y optimización de re-renders.
---

# ⚛️ React — Mejores Prácticas

## Principio Rector

> **React es una librería de composición de UI.** Piensa en árboles de componentes,
> flujo de datos unidireccional y efectos mínimos.

---

## 1. Reglas de Hooks

```tsx
// ✅ REGLAS INVIOLABLES
// 1. Solo llamar hooks en el top level (no dentro de if/for/callbacks)
// 2. Solo llamar hooks desde componentes o custom hooks
// 3. Nombrar custom hooks con "use" prefix

// ✅ Custom hook bien estructurado
function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}

// ❌ NUNCA — hook condicional
function BadComponent({ isEnabled }: { isEnabled: boolean }) {
  if (isEnabled) {
    const [value, setValue] = useState(''); // ❌ Hook condicional
  }
}

// ✅ CORRECTO — lógica condicional DENTRO del hook
function GoodComponent({ isEnabled }: { isEnabled: boolean }) {
  const [value, setValue] = useState('');
  // Usar isEnabled en el render o en un early return del JSX
}
```

---

## 2. useEffect — Reglas Estrictas

```tsx
// ✅ useEffect es para SINCRONIZAR con sistemas externos
// Ejemplos válidos: APIs del navegador, subscripciones, timers, DOM manual

// ✅ Suscripción a evento externo
useEffect(() => {
  const controller = new AbortController();

  window.addEventListener('resize', handleResize, { signal: controller.signal });

  return () => controller.abort();
}, [handleResize]);

// ✅ Sincronizar con API externa
useEffect(() => {
  const controller = new AbortController();

  async function fetchData() {
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json();
    setData(data);
  }

  fetchData();

  return () => controller.abort();
}, [url]);

// ❌ NUNCA usar useEffect para:

// ❌ Estado derivado — usar variables o useMemo
// MAL:
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);
// BIEN:
const fullName = `${firstName} ${lastName}`;

// ❌ Transformar datos del render
// MAL:
useEffect(() => {
  setFilteredItems(items.filter((i) => i.active));
}, [items]);
// BIEN:
const filteredItems = useMemo(() => items.filter((i) => i.active), [items]);

// ❌ Comunicar con el padre
// MAL:
useEffect(() => {
  onChange(value);
}, [value]);
// BIEN: llamar onChange en el event handler directamente
```

---

## 3. Memoización Estratégica

```tsx
// ✅ useMemo — SOLO cuando el cómputo es costoso o para estabilizar referencias
const sortedItems = useMemo(
  () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
  [items],
);

// ✅ useCallback — SOLO cuando se pasa como prop a componente memoizado
// o como dependencia de un effect
const handleSearch = useCallback(
  (query: string) => {
    setFilter(query);
    trackEvent('search', { query });
  },
  [trackEvent],
);

// ❌ NO memoizar por defecto — memoización tiene costo
// MAL: memoizar todo "por si acaso"
const title = useMemo(() => `Hola ${name}`, [name]); // ❌ Innecesario
const onClick = useCallback(() => setOpen(true), []); // ❌ Si el hijo no es memo

// ✅ React.memo — para componentes que reciben las mismas props frecuentemente
const ExpensiveList = memo(function ExpensiveList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
});

// ✅ Cuándo usar memo():
// 1. El componente renderiza frecuentemente con los mismos props
// 2. El componente es costoso de renderizar (listas largas, gráficos)
// 3. El padre re-renderiza por cambios que no afectan a este hijo
```

---

## 4. Keys — Más Allá del Índice

```tsx
// ✅ Key DEBE ser un identificador estable y único
{users.map((user) => (
  <UserCard key={user.id} user={user} />
))}

// ❌ NUNCA index como key si la lista cambia (reorder, filter, add, delete)
{items.map((item, index) => (
  <Item key={index} item={item} /> // ❌ Causa bugs de estado
))}

// ✅ Key como reset — forzar re-mount de un componente
<ProfileEditor key={userId} userId={userId} />
// Cuando userId cambia, React destruye y recrea ProfileEditor
// Esto resetea todo el estado interno sin useEffect
```

---

## 5. Children Patterns

```tsx
// ✅ Composición vía children — preferir sobre prop config
// MAL:
<Layout headerTitle="Dashboard" sidebarItems={items} showFooter />

// BIEN:
<Layout>
  <Layout.Header>
    <h1>Dashboard</h1>
  </Layout.Header>
  <Layout.Sidebar>
    <Navigation items={items} />
  </Layout.Sidebar>
  <Layout.Content>
    {children}
  </Layout.Content>
</Layout>

// ✅ Primitiva children para condicionales
interface ShowProps {
  when: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

function Show({ when, fallback = null, children }: ShowProps) {
  return when ? <>{children}</> : <>{fallback}</>;
}

// <Show when={isLoggedIn} fallback={<LoginPrompt />}>
//   <Dashboard />
// </Show>
```

---

## 6. Server Components vs Client Components

```tsx
// ✅ Por defecto todo es Server Component en App Router
// Solo añadir 'use client' cuando NECESITAS:
// - useState, useEffect, useRef, u otros hooks de estado/efecto
// - Event handlers (onClick, onChange, etc.)
// - Browser APIs (window, document, localStorage)
// - Librerías que usan Context o hooks internamente

// ✅ Server Component — hace fetch directo, sin "use client"
// app/users/page.tsx
async function UsersPage() {
  const users = await db.user.findMany(); // Acceso directo a DB

  return (
    <div>
      <h1>Usuarios</h1>
      <UserList users={users} />         {/* Server Component */}
      <AddUserButton />                   {/* Client Component */}
    </div>
  );
}

// ✅ Empujar "use client" lo más abajo posible del árbol
// features/users/components/AddUserButton.tsx
'use client';

export function AddUserButton() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Agregar</Button>
      {isOpen && <AddUserDialog onClose={() => setIsOpen(false)} />}
    </>
  );
}

// ❌ NO poner 'use client' en el page.tsx o layout.tsx
// ❌ NO pasar funciones como props de Server → Client (no son serializables)
```

---

## 7. Refs — Uso Correcto

```tsx
// ✅ Ref para acceder al DOM
function AutoFocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} />;
}

// ✅ Ref para valores mutables que NO disparan re-render
function Timer() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function start() {
    intervalRef.current = setInterval(() => console.log('tick'), 1000);
  }

  function stop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  return (
    <>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
    </>
  );
}

// ❌ NUNCA leer/escribir ref.current durante el render
// ❌ NUNCA usar refs para evitar re-renders de forma general (code smell)
```

---

## 8. Event Handlers — Patrones

```tsx
// ✅ Actualizar estado DIRECTAMENTE en el handler, no via useEffect
function SearchInput({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onSearch(newQuery); // ✅ Llamar directamente, NO en useEffect
  }

  return <input value={query} onChange={handleChange} />;
}

// ✅ Prevenir doble submit
function SubmitButton({ onSubmit }: { onSubmit: () => Promise<void> }) {
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    if (isPending) return;
    setIsPending(true);
    try {
      await onSubmit();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button onClick={handleClick} isLoading={isPending} disabled={isPending}>
      Enviar
    </Button>
  );
}
```

---

## Anti-patrones React

```tsx
// ❌ useEffect para "sincronizar" estado con props (señal de estado redundante)
// ❌ Prop drilling > 2 niveles (usar composición, Context o Zustand)
// ❌ Estado para cosas derivables del render
// ❌ any en tipos de componentes (usar generics o unknown)
// ❌ Componentes > 200 líneas (descomponer)
// ❌ Múltiples useState para estado relacionado (usar useReducer o un objeto)
// ❌ Lógica de negocio dentro de componentes (extraer a hooks o services)
// ❌ index.tsx como nombre de componente (usar NombreComponente.tsx)
```
