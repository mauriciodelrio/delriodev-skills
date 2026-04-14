---
name: state-management-rules
description: >
  Use this skill when managing state in React: tool selection
  (useState, useReducer, Context, Zustand, Jotai, Signals), store patterns,
  derived state, server vs client state, and common gotchas.
---

# State Management

## Agent workflow

1. Consult the decision tree to choose a tool based on scope and change frequency.
2. Simple local state → `useState` / `useReducer` (section 1-2).
3. Global UI state → Zustand with selectors (section 3). Split into slices as it grows.
4. Atomic/composable state → Jotai (section 4). Granular reactive → Signals (section 5).
5. Infrequent state (theme, locale) → Context (section 6).
6. Server state → TanStack Query (see `fetching-rules`), never in a global store.
7. Derive everything calculable. Only persist what cannot be derived (section 7).
8. Consult comparison table (section 8) when in doubt.

## Decision Tree

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
├── YES → TanStack Query / SWR (not in a global store)
│
Is it atomic reactive state (complex forms, real-time)?
├── YES → Jotai (atoms) or Signals (@preact/signals-react)
│
Is it complex state with many transitions?
├── YES → useReducer or Zustand with slices
```

## 1. useState — Simple Local State

```tsx
const [isOpen, setIsOpen] = useState(false);
const [query, setQuery] = useState('');

// Lazy initialization (expensive initial computation)
const [data, setData] = useState(() => parseExpensiveData(raw));

// Functional update to avoid stale closures
setCount((prev) => prev + 1);

// Group related values in an object or useReducer
const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
```

## 2. useReducer — Complex Transitions

```tsx
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

const [state, dispatch] = useReducer(todoReducer, { items: [], filter: 'all' });
dispatch({ type: 'ADD', payload: { text: 'New todo' } });
```

## 3. Zustand — Lightweight Global State

```tsx
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
      { name: 'ui-store' },
    ),
    { name: 'UIStore' },
  ),
);

// ALWAYS use selectors — avoid unnecessary re-renders
function Sidebar() {
  const isOpen = useUIStore((s) => s.sidebarOpen);
  const toggle = useUIStore((s) => s.toggleSidebar);
  return isOpen ? <nav>...</nav> : null;
}
```

**Gotcha:** Do not destructure the entire store (`const { ... } = useUIStore()`). It causes re-renders on any change.

### Zustand with Slices (large stores)

```tsx
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

## 4. Jotai — Atomic State

```tsx
import { atom, useAtom, useAtomValue } from 'jotai';

// Base atoms
const countAtom = atom(0);
const multiplierAtom = atom(2);

// Derived (read-only, automatically recalculated)
const multipliedAtom = atom((get) => get(countAtom) * get(multiplierAtom));

// Async
const userAtom = atom(async () => {
  const res = await fetch('/api/user');
  return res.json() as Promise<User>;
});

// Usage
function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const multiplied = useAtomValue(multipliedAtom);

  return (
    <div>
      <p>{count} × 2 = {multiplied}</p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  );
}
```

## 5. Signals — Granular Reactive State

```tsx
import { signal, computed, effect } from '@preact/signals-react';

const count = signal(0);
const doubled = computed(() => count.value * 2);

function Counter() {
  return (
    <div>
      <p>Count: {count}</p>
      <p>Doubled: {doubled}</p>
      <button onClick={() => count.value++}>+1</button>
    </div>
  );
}
```

Ideal for complex forms, real-time dashboards, and granular updates without memo/selector.

### Auth State with Signals

```tsx
import { signal, computed } from '@preact/signals-react';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
}

// Global signals — defined once, imported where needed
export const authSignal = signal<AuthState>({ token: null, user: null });
export const isAuthenticated = computed(() => authSignal.value.token !== null);
export const currentUser = computed(() => authSignal.value.user);

// Actions
export function login(token: string, user: User) {
  authSignal.value = { token, user };
}

export function logout() {
  authSignal.value = { token: null, user: null };
}
```

### UI State with Signals

```tsx
// Global UI state: sidebars, modals, toasts
export const sidebarOpen = signal(true);
export const activeModal = signal<string | null>(null);

// Direct usage in JSX — no hook or selector needed
function ToggleSidebar() {
  return (
    <button onClick={() => (sidebarOpen.value = !sidebarOpen.value)}>
      {sidebarOpen.value ? 'Close' : 'Open'}
    </button>
  );
}
```

### Effects and Cleanup

```tsx
import { effect } from '@preact/signals-react';

// effect() runs when signals read inside it change
const dispose = effect(() => {
  console.log('Token changed:', authSignal.value.token);
});

// Manual cleanup when needed
dispose();
```

### Signals Gotchas

- **`@preact/signals-react` ≥ 2.0** requires the Babel plugin (`@preact/signals-react-transform`) or the Vite plugin to work with React. Without the plugin, signals don't automatically integrate with rendering.
- Signals do NOT replace TanStack Query for server state — use signals for UI state and auth, TanStack Query for API data.
- When passing a signal as a prop, pass `.value` if the child is a regular React component, or pass the full signal if the child knows how to read signals.
- Signals are global by default (module scope). For signals local to a component, use `useSignal()` from `@preact/signals-react`.

```tsx
import { useSignal, useComputed } from '@preact/signals-react';

function EditPersonForm({ person }: { person: Person }) {
  // Signal local to the component
  const name = useSignal(person.name);
  const email = useSignal(person.email);
  const isValid = useComputed(() => name.value.length > 0 && email.value.includes('@'));

  return (
    <form>
      <input value={name.value} onChange={(e) => (name.value = e.target.value)} />
      <input value={email.value} onChange={(e) => (email.value = e.target.value)} />
      <button disabled={!isValid.value}>Save</button>
    </form>
  );
}
```

## 6. Context — Only for State That Changes Infrequently

```tsx
// Context for values that change infrequently: theme, locale, feature flags

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
```

**Gotcha:** Do not put frequently changing state in Context — every change re-renders all consumers. For frequent state use Zustand, Jotai, or Signals.

## 7. Derived State — The Golden Rule

If you can calculate it, don’t store it in state.

```tsx
function ProductList({ products, searchQuery }: Props) {
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Expensive derived → useMemo
  const sortedProducts = useMemo(
    () => [...filteredProducts].sort((a, b) => a.price - b.price),
    [filteredProducts],
  );
}
```

**Gotcha:** Do not sync derived state with `useState` + `useEffect`. Calculate directly in render.

## 8. Comparison Table

| Tool | Scope | Re-renders | Boilerplate | When |
|------|-------|------------|-------------|------|
| `useState` | Component | Normal | Minimal | Simple local state |
| `useReducer` | Component | Normal | Medium | Complex transitions |
| `Context` | Subtree | All consumers | Medium | Infrequent values |
| `Zustand` | Global | With selectors | Low | Global UI state |
| `Jotai` | Global (atomic) | Per atom | Low | Composable state |
| `Signals` | Global (granular) | Only DOM nodes | Minimal | Frequent updates |
| `TanStack Query` | Server | Per query key | Medium | API data |

## Related Skills

Consult [`frontend/SKILL.md`](../SKILL.md) for the full chain.

- `testing-rules` — tests for stores and selectors
- `fetching-rules` — TanStack Query for server state
