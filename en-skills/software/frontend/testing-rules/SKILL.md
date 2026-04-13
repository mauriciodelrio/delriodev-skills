---
name: testing-rules
description: >
  Use this skill when writing tests in React/Next.js: Vitest configuration,
  React Testing Library (queries, userEvent), Playwright E2E, mocking with MSW,
  hook testing, coverage targets, and test patterns.
---

# Testing — Rules

## Agent workflow

1. Choose level per pyramid: unit (~30%), integration RTL (~60%), E2E Playwright (~10%).
2. Configure Vitest with `jsdom`, setup file, and 80% coverage (section 1).
3. RTL queries by accessibility: `getByRole` > `getByLabelText` > `getByText` > `getByTestId` (section 2).
4. Always `userEvent.setup()`, never `fireEvent` (section 3).
5. Hooks with `renderHook` + `act`. Providers via `wrapper` (section 4).
6. Mocking: `vi.mock` for modules, MSW for realistic fetch (section 5).
7. E2E with Playwright for critical business flows (section 6).
8. AAA pattern, test data builders, custom render with providers (section 7).

## Test Pyramid

```
        ╱  E2E (Playwright)  ╲         ~10% — critical business flows
       ╱   Integration (RTL)   ╲       ~60% — complete features
      ╱    Unit (Vitest)         ╲     ~30% — utils, hooks, pure logic
```

## 1. Vitest — Configuration

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

## 2. React Testing Library — Queries

Query priority (accessibility first): `getByRole` > `getByLabelText` > `getByPlaceholderText` > `getByText` > `getByDisplayValue` > `getByTestId` (last resort).

```tsx
test('displays products and allows filtering', async () => {
  const user = userEvent.setup();
  render(<ProductList />);

  // Search by role
  expect(screen.getByRole('heading', { name: /products/i })).toBeInTheDocument();

  // Search by label
  const searchInput = screen.getByRole('searchbox', { name: /search/i });
  await user.type(searchInput, 'shoes');

  // Wait for async result
  const items = await screen.findAllByRole('listitem');
  expect(items).toHaveLength(3);

  // Verify absence
  expect(screen.queryByText(/no results/i)).not.toBeInTheDocument();
});
```

### Query Variants

```tsx
// getBy*    — Throws if not found → synchronous asserts
// queryBy*  — Returns null → verify absence
// findBy*   — Returns Promise → wait for async elements

// Verify absence
expect(screen.queryByRole('alert')).not.toBeInTheDocument();

// Wait for appearance (use findBy, not waitFor + getBy)
const alert = await screen.findByRole('alert');
expect(alert).toHaveTextContent(/error/i);
```

## 3. userEvent (Not fireEvent)

```tsx
import userEvent from '@testing-library/user-event';

test('login form', async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();

  render(<LoginForm onSubmit={handleSubmit} />);

  // user.type simulates real typing (keyboard + input events)
  await user.type(screen.getByLabelText(/email/i), 'user@example.com');
  await user.type(screen.getByLabelText(/password/i), 'P@ssw0rd!');

  await user.click(screen.getByRole('button', { name: /sign in/i }));

  expect(handleSubmit).toHaveBeenCalledWith({
    email: 'user@example.com',
    password: 'P@ssw0rd!',
  });
});
```

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

## 5. Mocking

```tsx
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

// MSW for fetch mocking (more realistic)
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

## 7. Test Patterns

```tsx
// AAA pattern (Arrange, Act, Assert)
test('adds product to cart', async () => {
  // Arrange
  const user = userEvent.setup();
  render(<ProductPage product={mockProduct} />);

  // Act
  await user.click(screen.getByRole('button', { name: /add to cart/i }));

  // Assert
  expect(screen.getByRole('status')).toHaveTextContent('Product added');
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

// Custom render with providers
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

- Do not test implementation details (accessing `state` directly). Verify visible output.
- Do not use massive snapshot tests — they break with any markup change.
- Prefer queries by role/label over `getByTestId`.
- Do not create tests dependent on execution order.
- Do not use hardcoded sleeps/delays — use `findBy` or `waitFor`.
- Do not mock everything — a test that mocks everything tests nothing.
- Do not create a single giant test per feature — split into atomic tests.

## Related Skills

Consult [`frontend/SKILL.md`](../SKILL.md) for the full chain.

- `a11y-rules` — queries by role verify accessibility
- `component-patterns` — understand the component API to test it correctly
