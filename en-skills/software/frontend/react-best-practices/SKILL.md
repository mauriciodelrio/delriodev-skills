---
name: react-best-practices
description: >
  Use this skill when developing with React 19+: hook rules,
  composition, strategic memoization, refs, keys, children patterns,
  Server vs Client Components, and re-render optimization.
---

# React — Best Practices

## Agent workflow

1. Everything is a Server Component by default. Add `'use client'` as far down the tree as possible (section 6).
2. Hooks always at top-level, custom hooks with `use` prefix (section 1).
3. `useEffect` only for synchronizing with external systems. Derived state = variable or `useMemo` (section 2).
4. Memoize only when the profiler shows issues: `useMemo` for expensive computation, `useCallback` only if the child is `memo` (section 3).
5. Stable keys (`id`), never `index` in dynamic lists. Key as reset for re-mount (section 4).
6. Composition via `children` over prop config (section 5).
7. Update state directly in event handlers, never via `useEffect` (section 8).

## 1. Hook Rules

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

Inviolable rules: (1) hooks only at top-level, never inside `if`/`for`/callbacks, (2) only from components or custom hooks, (3) `use` prefix.

## 2. useEffect — Strict Rules

```tsx
// useEffect is for SYNCHRONIZING with external systems

// External event subscription
useEffect(() => {
  const controller = new AbortController();

  window.addEventListener('resize', handleResize, { signal: controller.signal });

  return () => controller.abort();
}, [handleResize]);

// Synchronize with an external API
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

// NEVER use useEffect for derived state:
useEffect(() => { setFullName(`${firstName} ${lastName}`) }, [firstName, lastName]);
// Correct:
const fullName = `${firstName} ${lastName}`;

// NEVER for transforming render data:
useEffect(() => { setFilteredItems(items.filter((i) => i.active)) }, [items]);
// Correct:
const filteredItems = useMemo(() => items.filter((i) => i.active), [items]);

// NEVER for communicating with parent via useEffect — call onChange in the handler directly
```

## 3. Strategic Memoization

```tsx
const sortedItems = useMemo(
  () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
  [items],
);

// useCallback — only when passed as a prop to a memoized component
const handleSearch = useCallback(
  (query: string) => {
    setFilter(query);
    trackEvent('search', { query });
  },
  [trackEvent],
);

// React.memo — for components that frequently receive the same props
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

Use `memo()` when: (1) the component renders frequently with the same props, (2) it's expensive to render, (3) the parent re-renders due to changes that don't affect this child.

## 4. Keys — Beyond the Index

```tsx
{users.map((user) => (
  <UserCard key={user.id} user={user} />
))}

// Key as reset — force re-mount of a component
<ProfileEditor key={userId} userId={userId} />
```

## 5. Children Patterns

```tsx
// Composition via children — prefer over prop config
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

// Children primitive for conditionals
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

`'use client'` only when you need: useState/useEffect/useRef, event handlers, browser APIs, or libraries with Context/hooks.

```tsx
async function UsersPage() {
  const users = await db.user.findMany();

  return (
    <div>
      <h1>Users</h1>
      <UserList users={users} />
      <AddUserButton />
    </div>
  );
}

// Push 'use client' as far down the tree as possible
'use client';

export function AddUserButton() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Add</Button>
      {isOpen && <AddUserDialog onClose={() => setIsOpen(false)} />}
    </>
  );
}
```

## 7. Refs — Correct Usage

```tsx
function AutoFocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} />;
}

// Ref for mutable values that do NOT trigger re-renders
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

## 8. Event Handlers — Patterns

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

// Prevent double submit
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
      Submit
    </Button>
  );
}
```

## Gotchas

- `useEffect` to "synchronize" state with props is a sign of redundant state — derive directly.
- Prop drilling > 2 levels — use composition, Context, or Zustand.
- State for values derivable from the render adds unnecessary complexity.
- `any` in component types — use generics or `unknown`.
- Components > 200 lines need decomposition.
- Multiple `useState` for related state — consider `useReducer` or an object.
- Business logic inside components — extract to hooks or services.
- `'use client'` on page.tsx or layout.tsx forces the entire subtree to Client Component.
- Functions as props from Server → Client are not serializable.
- `ref.current` read/written during render causes subtle bugs.
- `index` as key in dynamic lists causes state bugs.

## Related Skills

`testing-rules` · `a11y-rules` · `state-management-rules` · `performance-rules`
