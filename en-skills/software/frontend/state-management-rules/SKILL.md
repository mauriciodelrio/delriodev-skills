---
name: state-management-rules
description: >
  State management rules for React applications. Covers tool selection
  (useState, useReducer, Context, Zustand, Jotai, Signals), store patterns,
  derived state, server vs client state, and common anti-patterns.
---

# 🗃️ State Management

## Guiding Principle

> **The best state is the state that doesn't exist.** Derive everything you can from the render.
> Only persist in state what cannot be calculated.

---

## Decision Tree — Which Tool to Use?

```
Is the state for a single component?
├── YES → useState (simple) or useReducer (complex transitions)
│
Do 2-3 nearby components need it?
├── YES → Lift state up to the common parent (lifting state up)
│
Is it global UI state (theme, sidebar, modal)?
├── YES → Zustand (lightweight) or Context (if it changes infrequently)
│
Is it server state (API data)?
├── YES → TanStack Query / SWR (NEVER in a global store)
│
Is it atomic reactive state (complex forms, real-time)?
├── YES → Jotai (atoms) or Signals (@preact/signals-react)
│
Is it complex state with many transitions?
├── YES → useReducer or Zustand with slices
```

---

## 1. useState — Simple Local State

```tsx
// ✅ A single value, simple transitions
const [isOpen, setIsOpen] = useState(false);
const [query, setQuery] = useState('');

// ✅ Lazy initialization (when the initial computation is expensive)
const [data, setData] = useState(() => parseExpensiveData(raw));

// ✅ Functional update to avoid stale closures
setCount((prev) => prev + 1);

// ❌ NEVER multiple related useState
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [email, setEmail] = useState('');
// ✅ Use an object or useReducer
const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
```

---

## 2. useReducer — Complex Transitions

```tsx
// ✅ When there are multiple actions modifying the same state
interface TodoState {
  items: Todo[];
  filter: 'all' | 'active' | 'completed';
}

type TodoAction =
  | { type: 'ADD'; payload: { text: string } }
  | { type: 'TOGGLE'; payload: { id: string } }
  | { type: 'DELETE'; payload: { id: string } }
  | { type: 'SET_FILTER'; payload: { filter: TodoState['filter'] } };

function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'ADD':
      return {
        ...state,
        items: [...state.items, { id: crypto.randomUUID(), text: action.payload.text, done: false }],
      };
    case 'TOGGLE':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id ? { ...item, done: !item.done } : item,
        ),
      };
    case 'DELETE':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload.id),
      };
    case 'SET_FILTER':
      return { ...state, filter: action.payload.filter };
    default:
      return state;
  }
}

// Usage in component
const [state, dispatch] = useReducer(todoReducer, { items: [], filter: 'all' });
dispatch({ type: 'ADD', payload: { text: 'New todo' } });
```

---

## 3. Zustand — Lightweight Global State

```tsx
// ✅ Zustand Store — simple, no boilerplate
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UIStore {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        theme: 'light',
        toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
        setTheme: (theme) => set({ theme }),
      }),
      { name: 'ui-store' }, // localStorage key
    ),
    { name: 'UIStore' }, // DevTools name
  ),
);

// ✅ ALWAYS use selectors — avoid unnecessary re-renders
function Sidebar() {
  // ✅ Only re-renders when sidebarOpen changes
  const isOpen = useUIStore((s) => s.sidebarOpen);
  const toggle = useUIStore((s) => s.toggleSidebar);

  return isOpen ? <nav>...</nav> : null;
}

// ❌ NEVER destructure the entire store
function BadComponent() {
  const { sidebarOpen, theme, toggleSidebar } = useUIStore(); // ❌ Re-renders on ANY change
}
```

### Zustand with Slices (large stores)

```tsx
// ✅ Split large stores into slices
interface AuthSlice {
  user: User | null;
  setUser: (user: User | null) => void;
}

interface NotificationSlice {
  notifications: Notification[];
  addNotification: (n: Notification) => void;
  clearAll: () => void;
}

const createAuthSlice: StateCreator<AuthSlice & NotificationSlice, [], [], AuthSlice> = (set) => ({
  user: null,
  setUser: (user) => set({ user }),
});

const createNotificationSlice: StateCreator<AuthSlice & NotificationSlice, [], [], NotificationSlice> = (set) => ({
  notifications: [],
  addNotification: (n) => set((s) => ({ notifications: [...s.notifications, n] })),
  clearAll: () => set({ notifications: [] }),
});

export const useAppStore = create<AuthSlice & NotificationSlice>()((...a) => ({
  ...createAuthSlice(...a),
  ...createNotificationSlice(...a),
}));
```

---

## 4. Jotai — Atomic State

```tsx
// ✅ Independent atoms that compose together
import { atom, useAtom, useAtomValue } from 'jotai';

// Base atoms
const countAtom = atom(0);
const multiplierAtom = atom(2);

// Derived atom (read-only, automatically recalculated)
const multipliedAtom = atom((get) => get(countAtom) * get(multiplierAtom));

// Async atom (fetch)
const userAtom = atom(async () => {
  const res = await fetch('/api/user');
  return res.json() as Promise<User>;
});

// Usage
function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const multiplied = useAtomValue(multipliedAtom); // Read-only

  return (
    <div>
      <p>{count} × 2 = {multiplied}</p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  );
}
```

---

## 5. Signals — Granular Reactive State

```tsx
// ✅ Signals with @preact/signals-react
import { signal, computed, effect } from '@preact/signals-react';

// Global signals — reactive without re-rendering the entire component
const count = signal(0);
const doubled = computed(() => count.value * 2);

// The component does NOT re-render when count changes,
// only the text where .value is used updates
function Counter() {
  return (
    <div>
      <p>Count: {count}</p>          {/* Auto-subscribe */}
      <p>Doubled: {doubled}</p>
      <button onClick={() => count.value++}>+1</button>
    </div>
  );
}

// ✅ When to use Signals:
// - Complex forms with many fields
// - Real-time dashboards with frequent updates
// - When you need granular updates without memo/selector
```

---

## 6. Context — Only for State That Changes Infrequently

```tsx
// ✅ Context for values that change INFREQUENTLY
// Themes, locale, feature flags, current user

interface AppContextValue {
  locale: string;
  featureFlags: Record<string, boolean>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

// ❌ NEVER put frequently changing state in Context
// Every change re-renders ALL consumers
// For frequent state → Zustand, Jotai, or Signals
```

---

## Derived State — The Golden Rule

```tsx
// ✅ If you can calculate it, DON'T store it in state
function ProductList({ products, searchQuery }: Props) {
  // ✅ Derived — recalculated on every render (cheap)
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // ✅ Expensive derived — useMemo
  const sortedProducts = useMemo(
    () => [...filteredProducts].sort((a, b) => a.price - b.price),
    [filteredProducts],
  );

  // ❌ NEVER:
  // const [filteredProducts, setFiltered] = useState(products);
  // useEffect(() => setFiltered(products.filter(...)), [products, query]);
}
```

---

## Comparison Table

| Tool | Scope | Re-renders | Boilerplate | When |
|------|-------|------------|-------------|------|
| `useState` | Component | Normal | Minimal | Simple local state |
| `useReducer` | Component | Normal | Medium | Complex transitions |
| `Context` | Subtree | All consumers | Medium | Infrequent values |
| `Zustand` | Global | With selectors | Low | Global UI state |
| `Jotai` | Global (atomic) | Per atom | Low | Composable state |
| `Signals` | Global (granular) | Only DOM nodes | Minimal | Frequent updates |
| `TanStack Query` | Server | Per query key | Medium | API data |
