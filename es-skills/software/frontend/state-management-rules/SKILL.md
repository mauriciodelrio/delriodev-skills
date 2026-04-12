---
name: state-management-rules
description: >
  Reglas para gestión de estado en aplicaciones React. Cubre selección de herramienta
  (useState, useReducer, Context, Zustand, Jotai, Signals), patrones de stores,
  estado derivado, estado de servidor vs cliente, y anti-patrones comunes.
---

# 🗃️ Gestión de Estado

## Principio Rector

> **El mejor estado es el que no existe.** Deriva todo lo que puedas del render.
> Solo persiste en estado lo que no se puede calcular.

---

## Árbol de Decisión — ¿Qué Herramienta Usar?

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
├── SÍ → TanStack Query / SWR (NUNCA en un store global)
│
¿Es estado atómico reactivo (formularios complejos, real-time)?
├── SÍ → Jotai (átomos) o Signals (@preact/signals-react)
│
¿Es estado complejo con muchas transiciones?
├── SÍ → useReducer o Zustand con slices
```

---

## 1. useState — Estado Local Simple

```tsx
// ✅ Un solo valor, transiciones simples
const [isOpen, setIsOpen] = useState(false);
const [query, setQuery] = useState('');

// ✅ Inicialización lazy (cuando el cálculo inicial es costoso)
const [data, setData] = useState(() => parseExpensiveData(raw));

// ✅ Actualización funcional para evitar stale closures
setCount((prev) => prev + 1);

// ❌ NUNCA múltiples useState relacionados
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [email, setEmail] = useState('');
// ✅ Usar un objeto o useReducer
const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
```

---

## 2. useReducer — Transiciones Complejas

```tsx
// ✅ Cuando hay múltiples acciones que modifican el mismo estado
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

// Uso en componente
const [state, dispatch] = useReducer(todoReducer, { items: [], filter: 'all' });
dispatch({ type: 'ADD', payload: { text: 'Nuevo todo' } });
```

---

## 3. Zustand — Estado Global Ligero

```tsx
// ✅ Store Zustand — simple, sin boilerplate
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
      { name: 'ui-store' }, // Key en localStorage
    ),
    { name: 'UIStore' }, // Nombre en DevTools
  ),
);

// ✅ SIEMPRE usar selectores — evitar re-renders innecesarios
function Sidebar() {
  // ✅ Solo re-renderiza cuando sidebarOpen cambia
  const isOpen = useUIStore((s) => s.sidebarOpen);
  const toggle = useUIStore((s) => s.toggleSidebar);

  return isOpen ? <nav>...</nav> : null;
}

// ❌ NUNCA desestructurar todo el store
function BadComponent() {
  const { sidebarOpen, theme, toggleSidebar } = useUIStore(); // ❌ Re-render en CUALQUIER cambio
}
```

### Zustand con Slices (stores grandes)

```tsx
// ✅ Dividir stores grandes en slices
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

## 4. Jotai — Estado Atómico

```tsx
// ✅ Átomos independientes que se componen
import { atom, useAtom, useAtomValue } from 'jotai';

// Átomos base
const countAtom = atom(0);
const multiplierAtom = atom(2);

// Átomo derivado (read-only, se recalcula automáticamente)
const multipliedAtom = atom((get) => get(countAtom) * get(multiplierAtom));

// Átomo async (fetch)
const userAtom = atom(async () => {
  const res = await fetch('/api/user');
  return res.json() as Promise<User>;
});

// Uso
function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const multiplied = useAtomValue(multipliedAtom); // Solo lectura

  return (
    <div>
      <p>{count} × 2 = {multiplied}</p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  );
}
```

---

## 5. Signals — Estado Reactivo Granular

```tsx
// ✅ Signals con @preact/signals-react
import { signal, computed, effect } from '@preact/signals-react';

// Signals globales — reactivos sin re-render del componente completo
const count = signal(0);
const doubled = computed(() => count.value * 2);

// El componente NO re-renderiza cuando count cambia,
// solo el texto donde se usa .value se actualiza
function Counter() {
  return (
    <div>
      <p>Count: {count}</p>          {/* Auto-subscribe */}
      <p>Doubled: {doubled}</p>
      <button onClick={() => count.value++}>+1</button>
    </div>
  );
}

// ✅ Cuándo usar Signals:
// - Formularios complejos con muchos campos
// - Dashboards real-time con actualizaciones frecuentes
// - Cuando necesitas actualizaciones granulares sin memo/selector
```

---

## 6. Context — Solo Para Estado Que Cambia Poco

```tsx
// ✅ Context para valores que cambian INFRECUENTEMENTE
// Temas, locale, feature flags, current user

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

// ❌ NUNCA poner estado que cambia frecuentemente en Context
// Cada cambio re-renderiza TODOS los consumers
// Para estado frecuente → Zustand, Jotai o Signals
```

---

## Estado Derivado — La Regla de Oro

```tsx
// ✅ Si puedes calcularlo, NO lo guardes en estado
function ProductList({ products, searchQuery }: Props) {
  // ✅ Derivado — se recalcula en cada render (barato)
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // ✅ Derivado costoso — useMemo
  const sortedProducts = useMemo(
    () => [...filteredProducts].sort((a, b) => a.price - b.price),
    [filteredProducts],
  );

  // ❌ NUNCA:
  // const [filteredProducts, setFiltered] = useState(products);
  // useEffect(() => setFiltered(products.filter(...)), [products, query]);
}
```

---

## Tabla Comparativa

| Herramienta | Scope | Re-renders | Boilerplate | Cuándo |
|-------------|-------|------------|-------------|--------|
| `useState` | Componente | Normal | Mínimo | Estado local simple |
| `useReducer` | Componente | Normal | Medio | Transiciones complejas |
| `Context` | Subárbol | Todos los consumers | Medio | Valores infrecuentes |
| `Zustand` | Global | Con selectores | Bajo | Estado global de UI |
| `Jotai` | Global (atómico) | Por átomo | Bajo | Estado composable |
| `Signals` | Global (granular) | Solo nodos DOM | Mínimo | Actualizaciones frecuentes |
| `TanStack Query` | Servidor | Por query key | Medio | Datos de API |

---

## Skills Relacionadas

> **Consultar el índice maestro [`frontend/SKILL.md`](../SKILL.md) → "Skills Obligatorias por Acción"** para la cadena completa.

| Skill | Por qué |
|-------|--------|
| `testing-rules` | Tests unitarios para stores, selectors, hooks de estado |
| `clean-code-principles` | Selectors atómicos, named exports, JSDoc |
| `fetching-rules` | TanStack Query para estado de servidor |
