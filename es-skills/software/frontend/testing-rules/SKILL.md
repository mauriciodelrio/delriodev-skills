---
name: testing-rules
description: >
  Usa esta skill cuando escribas tests en React (Next.js o Vite SPA): Vitest
  configuración, React Testing Library (queries, userEvent), Playwright E2E,
  mocking con MSW, testing de hooks, coverage targets, y patrones de test.
---

# Testing — Reglas

## Flujo de trabajo del agente

1. Elegir nivel según pirámide: unitario (~30%), integración RTL (~60%), E2E Playwright (~10%).
2. Configurar Vitest con `jsdom`, setup file, y coverage 80% (sección 1).
3. Queries RTL por accesibilidad: `getByRole` > `getByLabelText` > `getByText` > `getByTestId` (sección 2).
4. Siempre `userEvent.setup()`, nunca `fireEvent` (sección 3).
5. Hooks con `renderHook` + `act`. Providers via `wrapper` (sección 4).
6. Mocking: `vi.mock` para módulos, MSW para fetch realista (sección 5).
7. E2E con Playwright para flujos críticos de negocio (sección 6).
8. Patrón AAA, test data builders, custom render con providers (sección 7).

## Pirámide de Tests

```
        ╱  E2E (Playwright)  ╲         ~10% — flujos críticos de negocio
       ╱   Integración (RTL)   ╲       ~60% — features completas
      ╱    Unitarios (Vitest)    ╲     ~30% — utils, hooks, lógica pura
```

## 1. Vitest — Configuración

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.d.ts',
        '**/*.test.*',
        '**/*.stories.*',
        '**/index.ts',
        '**/types/**',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

```typescript
// vitest.setup.ts — Setup base (compartido)
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;
```

### Setup adicional — Next.js

```typescript
// vitest.setup.ts — agregar al setup base
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
```

### Setup adicional — Vite SPA (React Router)

Elegir **una** de las dos estrategias (son mutuamente excluyentes):

#### Opción A — `MemoryRouter` en test utils (recomendado)

Envolver cada render con `MemoryRouter` en un helper `renderWithProviders`. Permite testear navegación real y `useNavigate`/`useLocation` sin mocks.

```typescript
// test-utils.tsx
import { MemoryRouter } from 'react-router-dom';

export function renderWithProviders(ui: React.ReactElement, { route = '/' } = {}) {
  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    ),
  });
}
```

#### Opción B — Mock global en `vitest.setup.ts`

Mockear hooks de router globalmente. Útil cuando los componentes usan hooks de router pero no se necesita testear navegación real.

```typescript
// vitest.setup.ts — agregar al setup base
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'default' }),
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});
```

## 2. React Testing Library — Queries

Prioridad de queries (accesibilidad primero): `getByRole` > `getByLabelText` > `getByPlaceholderText` > `getByText` > `getByDisplayValue` > `getByTestId` (último recurso).

```tsx
test('muestra productos y permite filtrar', async () => {
  const user = userEvent.setup();
  render(<ProductList />);

  // Buscar por rol
  expect(screen.getByRole('heading', { name: /productos/i })).toBeInTheDocument();

  // Buscar por label
  const searchInput = screen.getByRole('searchbox', { name: /buscar/i });
  await user.type(searchInput, 'zapatos');

  // Esperar resultado async
  const items = await screen.findAllByRole('listitem');
  expect(items).toHaveLength(3);

  // Verificar ausencia
  expect(screen.queryByText(/sin resultados/i)).not.toBeInTheDocument();
});
```

### Variantes de Query

```tsx
// getBy*    — Lanza error si no encuentra → asserts síncronos
// queryBy*  — Retorna null → verificar ausencia
// findBy*   — Retorna Promise → esperar elementos async

// Verificar ausencia
expect(screen.queryByRole('alert')).not.toBeInTheDocument();

// Esperar aparición async (usar findBy, no waitFor + getBy)
const alert = await screen.findByRole('alert');
expect(alert).toHaveTextContent(/error/i);
```

## 3. userEvent (No fireEvent)

```tsx
import userEvent from '@testing-library/user-event';

test('formulario de login', async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();

  render(<LoginForm onSubmit={handleSubmit} />);

  // user.type simula tecleo real (keyboard + input events)
  await user.type(screen.getByLabelText(/email/i), 'user@example.com');
  await user.type(screen.getByLabelText(/contraseña/i), 'P@ssw0rd!');

  await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

  expect(handleSubmit).toHaveBeenCalledWith({
    email: 'user@example.com',
    password: 'P@ssw0rd!',
  });
});
```

## 4. Testing de Hooks

```tsx
import { renderHook, act } from '@testing-library/react';

test('useCounter incrementa correctamente', () => {
  const { result } = renderHook(() => useCounter(0));

  expect(result.current.count).toBe(0);

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});

// Hook que necesita providers
test('useAuth retorna usuario', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );

  const { result } = renderHook(() => useAuth(), { wrapper });
  expect(result.current.user).toBeDefined();
});
```

## 5. Mocking

```tsx
vi.mock('@/services/api', () => ({
  fetchProducts: vi.fn(),
}));

import { fetchProducts } from '@/services/api';
const mockFetchProducts = vi.mocked(fetchProducts);

beforeEach(() => {
  mockFetchProducts.mockResolvedValue([
    { id: '1', name: 'Producto A', price: 100 },
  ]);
});

// MSW para mock de fetch (más realista)
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/products', () => {
    return HttpResponse.json([
      { id: '1', name: 'Producto A', price: 100 },
    ]);
  }),

  http.post('/api/products', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: '2', ...body }, { status: 201 });
  }),
];
```

## 6. Playwright — E2E

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});

// e2e/products.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Productos', () => {
  test('usuario puede buscar y ver detalle', async ({ page }) => {
    await page.goto('/products');

    // Buscar
    await page.getByRole('searchbox', { name: /buscar/i }).fill('zapatos');
    await page.getByRole('button', { name: /buscar/i }).click();

    // Verificar resultados
    await expect(page.getByRole('listitem')).toHaveCount(3);

    // Navegar a detalle
    await page.getByRole('link', { name: /zapatos premium/i }).click();
    await expect(page).toHaveURL(/\/products\/\w+/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Zapatos Premium');
  });
});
```

## 7. Patrones de Test

```tsx
// Patrón AAA (Arrange, Act, Assert)
test('agrega producto al carrito', async () => {
  // Arrange
  const user = userEvent.setup();
  render(<ProductPage product={mockProduct} />);

  // Act
  await user.click(screen.getByRole('button', { name: /agregar al carrito/i }));

  // Assert
  expect(screen.getByRole('status')).toHaveTextContent('Producto agregado');
});

// Test data builders
function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: crypto.randomUUID(),
    name: 'Test Product',
    price: 99.99,
    description: 'A test product',
    category: 'electronics',
    ...overrides,
  };
}

// Custom render con providers
function renderWithProviders(
  ui: ReactElement,
  options?: RenderOptions & { initialRoute?: string },
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryProvider>
    );
  }
  return render(ui, { wrapper: Wrapper, ...options });
}
```

## Gotchas

- No testear detalles de implementación (acceder a `state` directo). Verificar output visible.
- No usar snapshot tests masivos — se rompen con cualquier cambio de markup.
- Preferir queries por role/label antes que `getByTestId`.
- No crear tests dependientes del orden de ejecución.
- No usar sleeps/delays hardcodeados — usar `findBy` o `waitFor`.
- No mockear todo — un test que mockea todo no testea nada.
- No crear un único test gigante por feature — dividir en tests atómicos.

## Skills Relacionadas

Consultar [`frontend/SKILL.md`](../SKILL.md) para la cadena completa.

- [`a11y-rules`](../a11y-rules/SKILL.md) — queries por role verifican accesibilidad
- [`component-patterns`](../component-patterns/SKILL.md) — entender la API del componente para testearlo
