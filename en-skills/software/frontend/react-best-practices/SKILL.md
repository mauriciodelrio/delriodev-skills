---
name: react-best-practices
description: >
  React 19+ best practices. Covers hook rules, composition over inheritance,
  strategic memoization, ref handling, keys, children patterns, Server Components
  vs Client Components, and re-render optimization.
---

# ⚛️ React — Best Practices

## Guiding Principle

> **React is a UI composition library.** Think in component trees,
> unidirectional data flow, and minimal effects.

---

## 1. Hook Rules

```tsx
// ✅ INVIOLABLE RULES
// 1. Only call hooks at the top level (not inside if/for/callbacks)
// 2. Only call hooks from components or custom hooks
// 3. Name custom hooks with "use" prefix

// ✅ Well-structured custom hook
function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}

// ❌ NEVER — conditional hook
function BadComponent({ isEnabled }: { isEnabled: boolean }) {
  if (isEnabled) {
    const [value, setValue] = useState(''); // ❌ Conditional hook
  }
}

// ✅ CORRECT — conditional logic INSIDE the hook
function GoodComponent({ isEnabled }: { isEnabled: boolean }) {
  const [value, setValue] = useState('');
  // Use isEnabled in the render or in an early return of the JSX
}
```

---

## 2. useEffect — Strict Rules

```tsx
// ✅ useEffect is for SYNCHRONIZING with external systems
// Valid examples: browser APIs, subscriptions, timers, manual DOM

// ✅ External event subscription
useEffect(() => {
  const controller = new AbortController();

  window.addEventListener('resize', handleResize, { signal: controller.signal });

  return () => controller.abort();
}, [handleResize]);

// ✅ Synchronize with an external API
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

// ❌ NEVER use useEffect for:

// ❌ Derived state — use variables or useMemo
// BAD:
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);
// GOOD:
const fullName = `${firstName} ${lastName}`;

// ❌ Transforming render data
// BAD:
useEffect(() => {
  setFilteredItems(items.filter((i) => i.active));
}, [items]);
// GOOD:
const filteredItems = useMemo(() => items.filter((i) => i.active), [items]);

// ❌ Communicating with the parent
// BAD:
useEffect(() => {
  onChange(value);
}, [value]);
// GOOD: call onChange in the event handler directly
```

---

## 3. Strategic Memoization

```tsx
// ✅ useMemo — ONLY when the computation is expensive or to stabilize references
const sortedItems = useMemo(
  () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
  [items],
);

// ✅ useCallback — ONLY when passed as a prop to a memoized component
// or as a dependency of an effect
const handleSearch = useCallback(
  (query: string) => {
    setFilter(query);
    trackEvent('search', { query });
  },
  [trackEvent],
);

// ❌ DO NOT memoize by default — memoization has a cost
// BAD: memoize everything "just in case"
const title = useMemo(() => `Hello ${name}`, [name]); // ❌ Unnecessary
const onClick = useCallback(() => setOpen(true), []); // ❌ If the child is not memo

// ✅ React.memo — for components that frequently receive the same props
const ExpensiveList = memo(function ExpensiveList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
});

// ✅ When to use memo():
// 1. The component renders frequently with the same props
// 2. The component is expensive to render (long lists, charts)
// 3. The parent re-renders due to changes that don't affect this child
```

---

## 4. Keys — Beyond the Index

```tsx
// ✅ Key MUST be a stable and unique identifier
{users.map((user) => (
  <UserCard key={user.id} user={user} />
))}

// ❌ NEVER use index as key if the list changes (reorder, filter, add, delete)
{items.map((item, index) => (
  <Item key={index} item={item} /> // ❌ Causes state bugs
))}

// ✅ Key as reset — force re-mount of a component
<ProfileEditor key={userId} userId={userId} />
// When userId changes, React destroys and recreates ProfileEditor
// This resets all internal state without useEffect
```

---

## 5. Children Patterns

```tsx
// ✅ Composition via children — prefer over prop config
// BAD:
<Layout headerTitle="Dashboard" sidebarItems={items} showFooter />

// GOOD:
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

// ✅ Children primitive for conditionals
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
// ✅ By default everything is a Server Component in App Router
// Only add 'use client' when you NEED:
// - useState, useEffect, useRef, or other state/effect hooks
// - Event handlers (onClick, onChange, etc.)
// - Browser APIs (window, document, localStorage)
// - Libraries that use Context or hooks internally

// ✅ Server Component — does fetch directly, no "use client"
// app/users/page.tsx
async function UsersPage() {
  const users = await db.user.findMany(); // Direct DB access

  return (
    <div>
      <h1>Users</h1>
      <UserList users={users} />         {/* Server Component */}
      <AddUserButton />                   {/* Client Component */}
    </div>
  );
}

// ✅ Push "use client" as far down the tree as possible
// features/users/components/AddUserButton.tsx
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

// ❌ DO NOT put 'use client' on page.tsx or layout.tsx
// ❌ DO NOT pass functions as props from Server → Client (they are not serializable)
```

---

## 7. Refs — Correct Usage

```tsx
// ✅ Ref to access the DOM
function AutoFocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} />;
}

// ✅ Ref for mutable values that do NOT trigger re-renders
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

// ❌ NEVER read/write ref.current during render
// ❌ NEVER use refs to avoid re-renders as a general pattern (code smell)
```

---

## 8. Event Handlers — Patterns

```tsx
// ✅ Update state DIRECTLY in the handler, not via useEffect
function SearchInput({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onSearch(newQuery); // ✅ Call directly, NOT in useEffect
  }

  return <input value={query} onChange={handleChange} />;
}

// ✅ Prevent double submit
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

---

## React Anti-patterns

```tsx
// ❌ useEffect to "synchronize" state with props (sign of redundant state)
// ❌ Prop drilling > 2 levels (use composition, Context, or Zustand)
// ❌ State for things derivable from the render
// ❌ any in component types (use generics or unknown)
// ❌ Components > 200 lines (decompose)
// ❌ Multiple useState for related state (use useReducer or an object)
// ❌ Business logic inside components (extract to hooks or services)
// ❌ index.tsx as component name (use ComponentName.tsx)
```
