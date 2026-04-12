---
name: testing-rules
description: >
  Reglas de testing para proyectos React/Next.js. Cubre Vitest/Jest configuración,
  React Testing Library (queries, userEvent), Playwright E2E, mocking strategies,
  testing de hooks y Server Components, coverage targets, y patrones de test.
---

# 🧪 Testing — Reglas

## Principio Rector

> **Testear comportamiento, no implementación.**
> Si un refactor rompe tests sin cambiar funcionalidad, los tests están mal escritos.

---

## Pirámide de Tests

```
        ╱  E2E (Playwright)  ╲         ~10% — flujos críticos de negocio
       ╱   Integración (RTL)   ╲       ~60% — features completas
      ╱    Unitarios (Vitest)    ╲     ~30% — utils, hooks, lógica pura
```

---

## 1. Vitest — Configuración

```typescript
// vitest.config.ts
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
// vitest.setup.ts
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

// Mock Next.js router
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

---

## 2. React Testing Library — Queries

```tsx
// ✅ Prioridad de queries (accesibilidad primero)
// 1. getByRole          — SIEMPRE preferir
// 2. getByLabelText     — formularios
// 3. getByPlaceholderText — solo si no hay label
// 4. getByText          — contenido visible
// 5. getByDisplayValue  — inputs con valor
// 6. getByTestId        — ÚLTIMO recurso

// ✅ Ejemplo correcto
test('muestra productos y permite filtrar', async () => {
  const user = userEvent.setup();
  render(<ProductList />);

  // Buscar por rol (accesible)
  expect(screen.getByRole('heading', { name: /productos/i })).toBeInTheDocument();

  // Buscar por label (accesible)
  const searchInput = screen.getByRole('searchbox', { name: /buscar/i });
  await user.type(searchInput, 'zapatos');

  // Esperar resultado async
  const items = await screen.findAllByRole('listitem');
  expect(items).toHaveLength(3);

  // Verificar que NO está presente
  expect(screen.queryByText(/sin resultados/i)).not.toBeInTheDocument();
});
```

### Variantes de Query

```tsx
// getBy*    — Lanza error si no encuentra o encuentra múltiples → asserts síncronos
// queryBy*  — Retorna null si no encuentra → verificar ausencia
// findBy*   — Retorna Promise → esperar elementos async (combinado con waitFor)

// ✅ Verificar que algo NO existe
expect(screen.queryByRole('alert')).not.toBeInTheDocument();

// ✅ Esperar que algo aparezca (async)
const alert = await screen.findByRole('alert');
expect(alert).toHaveTextContent(/error/i);

// ❌ NUNCA: usar waitFor + getBy — usar findBy
await waitFor(() => {
  expect(screen.getByText('Cargado')).toBeInTheDocument(); // ❌
});
const loaded = await screen.findByText('Cargado'); // ✅
```

---

## 3. userEvent (No fireEvent)

```tsx
// ✅ SIEMPRE userEvent sobre fireEvent
import userEvent from '@testing-library/user-event';

test('formulario de login', async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();

  render(<LoginForm onSubmit={handleSubmit} />);

  // user.type simula tecleo real (keyboard events + input events)
  await user.type(screen.getByLabelText(/email/i), 'user@example.com');
  await user.type(screen.getByLabelText(/contraseña/i), 'P@ssw0rd!');

  await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

  expect(handleSubmit).toHaveBeenCalledWith({
    email: 'user@example.com',
    password: 'P@ssw0rd!',
  });
});

// ❌ NUNCA: fireEvent (no simula comportamiento real)
fireEvent.change(input, { target: { value: 'test' } });  // ❌
await user.type(input, 'test');                            // ✅
```

---

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

---

## 5. Mocking

```tsx
// ✅ Mock de módulos
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

// ✅ Mock de fetch (MSW preferido para más realismo)
// msw/handlers.ts
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

---

## 6. Playwright — E2E

```typescript
// playwright.config.ts
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

---

## 7. Patrones de Test

```tsx
// ✅ Patrón AAA (Arrange, Act, Assert)
test('agrega producto al carrito', async () => {
  // Arrange
  const user = userEvent.setup();
  render(<ProductPage product={mockProduct} />);

  // Act
  await user.click(screen.getByRole('button', { name: /agregar al carrito/i }));

  // Assert
  expect(screen.getByRole('status')).toHaveTextContent('Producto agregado');
});

// ✅ Test data builders
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

// ✅ Custom render con providers
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

---

## Anti-patrones

```tsx
// ❌ Testear detalles de implementación
expect(component.state.counter).toBe(1);           // ❌ Acceder a state directamente
expect(screen.getByText('1')).toBeInTheDocument();  // ✅ Verificar output visible

// ❌ snapshot tests masivos
expect(component).toMatchSnapshot(); // ❌ Se rompe con cualquier cambio de markup

// ❌ test-ids como primera opción
screen.getByTestId('submit-btn');                            // ❌
screen.getByRole('button', { name: /enviar/i });             // ✅

// ❌ Tests que dependen del orden de ejecución
// ❌ Tests con sleeps/delays hardcodeados
// ❌ Tests que no limpian side effects
// ❌ Tests que mockean todo (test sin sentido)
// ❌ Un único test gigante por feature (difícil de debuggear)
```
