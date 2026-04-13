---
name: state-management-rules
description: >
  Usa esta skill cuando gestiones estado en React: selección de herramienta
  (useState, useReducer, Context, Zustand, Jotai, Signals), patrones de stores,
  estado derivado, servidor vs cliente, y gotchas comunes.
---

# Gestión de Estado

## Flujo de trabajo del agente

1. Consultar árbol de decisión para elegir herramienta según scope y frecuencia de cambio.
2. Estado local simple → `useState` / `useReducer` (sección 1-2).
3. Estado global de UI → Zustand con selectores (sección 3). Dividir en slices si crece.
4. Estado atómico/composable → Jotai (sección 4). Reactivo granular → Signals (sección 5).
5. Estado infrecuente (theme, locale) → Context (sección 6).
6. Estado de servidor → TanStack Query (ver `fetching-rules`), nunca en store global.
7. Derivar todo lo calculable. Solo persistir lo no derivable (sección 7).
8. Consultar tabla comparativa (sección 8) ante dudas.

## Árbol de Decisión

```
¿El estado es de un solo componente?
├── SÍ → useState (simple) o useReducer (transiciones complejas)
│
¿Lo necesitan 2-3 componentes cercanos?
├── SÍ → Elevar estado al padre común (lifting state up)
│
¿Es estado global de UI (theme, sidebar, modal)?
├── SÍ → Zustand (ligero) o Context (si cambia poco)
│
¿Es estado de servidor (datos de API)?
├── SÍ → TanStack Query / SWR (no en store global)
│
¿Es estado atómico reactivo (formularios complejos, real-time)?
├── SÍ → Jotai (átomos) o Signals (@preact/signals-react)
│
¿Es estado complejo con muchas transiciones?
├── SÍ → useReducer o Zustand con slices
```

## 1. useState — Estado Local Simple

```tsx
const [isOpen, setIsOpen] = useState(false);
const [query, setQuery] = useState('');

// Inicialización lazy (cálculo inicial costoso)
const [data, setData] = useState(() => parseExpensiveData(raw));

// Actualización funcional para evitar stale closures
setCount((prev) => prev + 1);

// Agrupar valores relacionados en un objeto o useReducer
const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
```

## 2. useReducer — Transiciones Complejas

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
dispatch({ type: 'ADD', payload: { text: 'Nuevo todo' } });
```

## 3. Zustand — Estado Global Ligero

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

// SIEMPRE usar selectores — evitar re-renders innecesarios
function Sidebar() {
  const isOpen = useUIStore((s) => s.sidebarOpen);
  const toggle = useUIStore((s) => s.toggleSidebar);
  return isOpen ? <nav>...</nav> : null;
}
```

**Gotcha:** No desestructurar todo el store (`const { ... } = useUIStore()`). Causa re-render en cualquier cambio.

### Zustand con Slices (stores grandes)

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

## 4. Jotai — Estado Atómico

```tsx
import { atom, useAtom, useAtomValue } from 'jotai';

// Átomos base
const countAtom = atom(0);
const multiplierAtom = atom(2);

// Derivado (read-only, recálculo automático)
const multipliedAtom = atom((get) => get(countAtom) * get(multiplierAtom));

// Async
const userAtom = atom(async () => {
  const res = await fetch('/api/user');
  return res.json() as Promise<User>;
});

// Uso
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

## 5. Signals — Estado Reactivo Granular

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

Ideal para formularios complejos, dashboards real-time, y actualizaciones granulares sin memo/selector.

## 6. Context — Solo Para Estado Que Cambia Poco

```tsx
// Context para valores que cambian infrecuentemente: theme, locale, feature flags

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

**Gotcha:** No poner estado frecuente en Context — cada cambio re-renderiza todos los consumers. Para estado frecuente usar Zustand, Jotai o Signals.

## 7. Estado Derivado — La Regla de Oro

Si puedes calcularlo, no lo guardes en estado.

```tsx
function ProductList({ products, searchQuery }: Props) {
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Derivado costoso → useMemo
  const sortedProducts = useMemo(
    () => [...filteredProducts].sort((a, b) => a.price - b.price),
    [filteredProducts],
  );
}
```

**Gotcha:** No sincronizar estado derivado con `useState` + `useEffect`. Calcular directamente en render.

## 8. Tabla Comparativa

| Herramienta | Scope | Re-renders | Boilerplate | Cuándo |
|-------------|-------|------------|-------------|--------|
| `useState` | Componente | Normal | Mínimo | Estado local simple |
| `useReducer` | Componente | Normal | Medio | Transiciones complejas |
| `Context` | Subárbol | Todos los consumers | Medio | Valores infrecuentes |
| `Zustand` | Global | Con selectores | Bajo | Estado global de UI |
| `Jotai` | Global (atómico) | Por átomo | Bajo | Estado composable |
| `Signals` | Global (granular) | Solo nodos DOM | Mínimo | Actualizaciones frecuentes |
| `TanStack Query` | Servidor | Por query key | Medio | Datos de API |

## Skills Relacionadas

Consultar [`frontend/SKILL.md`](../SKILL.md) para la cadena completa.

- `testing-rules` — tests para stores y selectors
- `fetching-rules` — TanStack Query para estado de servidor
