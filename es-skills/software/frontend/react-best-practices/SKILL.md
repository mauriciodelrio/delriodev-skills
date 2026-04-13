---
name: react-best-practices
description: >
  Usa esta skill cuando desarrolles con React 19+: reglas de hooks,
  composición, memoización estratégica, refs, keys, children patterns,
  Server vs Client Components, y optimización de re-renders.
---

# React — Mejores Prácticas

## Flujo de trabajo del agente

1. Todo es Server Component por defecto. Añadir `'use client'` lo más abajo posible del árbol (sección 6).
2. Hooks siempre en top-level, custom hooks con prefijo `use` (sección 1).
3. `useEffect` solo para sincronizar con sistemas externos. Estado derivado = variable o `useMemo` (sección 2).
4. Memoizar solo cuando el profiler muestra problemas: `useMemo` para cómputo costoso, `useCallback` solo si el hijo es `memo` (sección 3).
5. Keys estables (`id`), nunca `index` en listas dinámicas. Key como reset para re-mount (sección 4).
6. Composición vía `children` sobre prop config (sección 5).
7. Actualizar estado directamente en event handlers, nunca vía `useEffect` (sección 8).

## 1. Reglas de Hooks

```tsx
function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
```

Reglas inviolables: (1) hooks solo en top-level, nunca dentro de `if`/`for`/callbacks, (2) solo desde componentes o custom hooks, (3) prefijo `use`.

## 2. useEffect — Reglas Estrictas

```tsx
// useEffect es para SINCRONIZAR con sistemas externos

// Suscripción a evento externo
useEffect(() => {
  const controller = new AbortController();

  window.addEventListener('resize', handleResize, { signal: controller.signal });

  return () => controller.abort();
}, [handleResize]);

// Sincronizar con API externa
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

// NUNCA usar useEffect para estado derivado:
useEffect(() => { setFullName(`${firstName} ${lastName}`) }, [firstName, lastName]);
// Correcto:
const fullName = `${firstName} ${lastName}`;

// NUNCA para transformar datos del render:
useEffect(() => { setFilteredItems(items.filter((i) => i.active)) }, [items]);
// Correcto:
const filteredItems = useMemo(() => items.filter((i) => i.active), [items]);

// NUNCA para comunicar con el padre vía useEffect — llamar onChange en el handler directamente
```

## 3. Memoización Estratégica

```tsx
const sortedItems = useMemo(
  () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
  [items],
);

// useCallback — solo cuando se pasa como prop a componente memoizado
const handleSearch = useCallback(
  (query: string) => {
    setFilter(query);
    trackEvent('search', { query });
  },
  [trackEvent],
);

// React.memo — para componentes que reciben las mismas props frecuentemente
const ExpensiveList = memo(function ExpensiveList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
});
```

Usar `memo()` cuando: (1) el componente renderiza frecuentemente con los mismos props, (2) es costoso de renderizar, (3) el padre re-renderiza por cambios que no afectan a este hijo.

## 4. Keys — Más Allá del Índice

```tsx
{users.map((user) => (
  <UserCard key={user.id} user={user} />
))}

// Key como reset — forzar re-mount de un componente
<ProfileEditor key={userId} userId={userId} />
```

## 5. Children Patterns

```tsx
// Composición vía children — preferir sobre prop config
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

// Primitiva children para condicionales
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

## 6. Server Components vs Client Components

`'use client'` solo cuando necesites: useState/useEffect/useRef, event handlers, browser APIs, o librerías con Context/hooks.

```tsx
async function UsersPage() {
  const users = await db.user.findMany();

  return (
    <div>
      <h1>Usuarios</h1>
      <UserList users={users} />
      <AddUserButton />
    </div>
  );
}

// Empujar 'use client' lo más abajo posible
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
```

## 7. Refs — Uso Correcto

```tsx
function AutoFocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} />;
}

// Ref para valores mutables que NO disparan re-render
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
```

## 8. Event Handlers — Patrones

```tsx
function SearchInput({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onSearch(newQuery);
  }

  return <input value={query} onChange={handleChange} />;
}

// Prevenir doble submit
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

## Gotchas

- `useEffect` para "sincronizar" estado con props es señal de estado redundante — derivar directamente.
- Prop drilling > 2 niveles — usar composición, Context o Zustand.
- Estado para valores derivables del render añade complejidad innecesaria.
- `any` en tipos de componentes — usar generics o `unknown`.
- Componentes > 200 líneas necesitan descomposición.
- Múltiples `useState` para estado relacionado — considerar `useReducer` o un objeto.
- Lógica de negocio dentro de componentes — extraer a hooks o services.
- `'use client'` en page.tsx o layout.tsx fuerza todo el subárbol a Client Component.
- Funciones como props de Server → Client no son serializables.
- `ref.current` leído/escrito durante el render causa bugs sutiles.
- `index` como key en listas dinámicas causa bugs de estado.

## Skills Relacionadas

`testing-rules` · `a11y-rules` · `state-management-rules` · `performance-rules`
