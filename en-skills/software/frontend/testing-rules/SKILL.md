---
name: testing-rules
description: >
  Testing rules for React/Next.js projects. Covers Vitest/Jest configuration,
  React Testing Library (queries, userEvent), Playwright E2E, mocking strategies,
  hook and Server Component testing, coverage targets, and test patterns.
---

# 🧪 Testing — Rules

## Guiding Principle

> **Test behavior, not implementation.**
> If a refactor breaks tests without changing functionality, the tests are poorly written.

---

## Test Pyramid

```
        ╱  E2E (Playwright)  ╲         ~10% — critical business flows
       ╱   Integration (RTL)   ╲       ~60% — complete features
      ╱    Unit (Vitest)         ╲     ~30% — utils, hooks, pure logic
```

---

## 1. Vitest — Configuration

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
// ✅ Query priority (accessibility first)
// 1. getByRole          — ALWAYS prefer
// 2. getByLabelText     — forms
// 3. getByPlaceholderText — only if no label
// 4. getByText          — visible content
// 5. getByDisplayValue  — inputs with value
// 6. getByTestId        — LAST resort

// ✅ Correct example
test('displays products and allows filtering', async () => {
  const user = userEvent.setup();
  render(<ProductList />);

  // Search by role (accessible)
  expect(screen.getByRole('heading', { name: /products/i })).toBeInTheDocument();

  // Search by label (accessible)
  const searchInput = screen.getByRole('searchbox', { name: /search/i });
  await user.type(searchInput, 'shoes');

  // Wait for async result
  const items = await screen.findAllByRole('listitem');
  expect(items).toHaveLength(3);

  // Verify it's NOT present
  expect(screen.queryByText(/no results/i)).not.toBeInTheDocument();
});
```

### Query Variants

```tsx
// getBy*    — Throws if not found or multiple found → synchronous asserts
// queryBy*  — Returns null if not found → verify absence
// findBy*   — Returns Promise → wait for async elements (combined with waitFor)

// ✅ Verify something does NOT exist
expect(screen.queryByRole('alert')).not.toBeInTheDocument();

// ✅ Wait for something to appear (async)
const alert = await screen.findByRole('alert');
expect(alert).toHaveTextContent(/error/i);

// ❌ NEVER: use waitFor + getBy — use findBy
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument(); // ❌
});
const loaded = await screen.findByText('Loaded'); // ✅
```

---

## 3. userEvent (Not fireEvent)

```tsx
// ✅ ALWAYS userEvent over fireEvent
import userEvent from '@testing-library/user-event';

test('login form', async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();

  render(<LoginForm onSubmit={handleSubmit} />);

  // user.type simulates real typing (keyboard events + input events)
  await user.type(screen.getByLabelText(/email/i), 'user@example.com');
  await user.type(screen.getByLabelText(/password/i), 'P@ssw0rd!');

  await user.click(screen.getByRole('button', { name: /sign in/i }));

  expect(handleSubmit).toHaveBeenCalledWith({
    email: 'user@example.com',
    password: 'P@ssw0rd!',
  });
});

// ❌ NEVER: fireEvent (doesn't simulate real behavior)
fireEvent.change(input, { target: { value: 'test' } });  // ❌
await user.type(input, 'test');                            // ✅
```

---

## 4. Testing Hooks

```tsx
import { renderHook, act } from '@testing-library/react';

test('useCounter increments correctly', () => {
  const { result } = renderHook(() => useCounter(0));

  expect(result.current.count).toBe(0);

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});

// Hook that needs providers
test('useAuth returns user', () => {
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
// ✅ Module mocking
vi.mock('@/services/api', () => ({
  fetchProducts: vi.fn(),
}));

import { fetchProducts } from '@/services/api';
const mockFetchProducts = vi.mocked(fetchProducts);

beforeEach(() => {
  mockFetchProducts.mockResolvedValue([
    { id: '1', name: 'Product A', price: 100 },
  ]);
});

// ✅ Fetch mocking (MSW preferred for more realism)
// msw/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/products', () => {
    return HttpResponse.json([
      { id: '1', name: 'Product A', price: 100 },
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

test.describe('Products', () => {
  test('user can search and view detail', async ({ page }) => {
    await page.goto('/products');

    // Search
    await page.getByRole('searchbox', { name: /search/i }).fill('shoes');
    await page.getByRole('button', { name: /search/i }).click();

    // Verify results
    await expect(page.getByRole('listitem')).toHaveCount(3);

    // Navigate to detail
    await page.getByRole('link', { name: /premium shoes/i }).click();
    await expect(page).toHaveURL(/\/products\/\w+/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Premium Shoes');
  });
});
```

---

## 7. Test Patterns

```tsx
// ✅ AAA pattern (Arrange, Act, Assert)
test('adds product to cart', async () => {
  // Arrange
  const user = userEvent.setup();
  render(<ProductPage product={mockProduct} />);

  // Act
  await user.click(screen.getByRole('button', { name: /add to cart/i }));

  // Assert
  expect(screen.getByRole('status')).toHaveTextContent('Product added');
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

// ✅ Custom render with providers
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

## Anti-patterns

```tsx
// ❌ Testing implementation details
expect(component.state.counter).toBe(1);           // ❌ Accessing state directly
expect(screen.getByText('1')).toBeInTheDocument();  // ✅ Verify visible output

// ❌ Massive snapshot tests
expect(component).toMatchSnapshot(); // ❌ Breaks with any markup change

// ❌ test-ids as first choice
screen.getByTestId('submit-btn');                            // ❌
screen.getByRole('button', { name: /submit/i });             // ✅

// ❌ Tests that depend on execution order
// ❌ Tests with hardcoded sleeps/delays
// ❌ Tests that don't clean up side effects
// ❌ Tests that mock everything (meaningless test)
// ❌ A single giant test per feature (hard to debug)
```
