---
name: error-handling-rules
description: >
  Use this skill when implementing error handling in React:
  Error Boundaries (Next.js error.tsx / React Router errorElement),
  typed errors (Result pattern), Sentry integration, retries with
  exponential backoff, and toast notifications.
---

# Error Handling

## Agent workflow

1. Detect project type:
   - **Next.js** → `error.tsx` and `global-error.tsx` in App Router (section 1A).
   - **Vite SPA** → `errorElement` in React Router (section 1B).
2. Create Not Found pages: **Next.js** `not-found.tsx` / **Vite SPA** catch-all route (section 2).
3. Wrap risky sections with customizable ErrorBoundary (section 3).
4. Implement Result pattern + typed AppError for fallible functions (section 4).
5. Configure Sentry with filters and context (section 5).
6. Choose mechanism: toast for recoverable, boundary for render, page for routes (section 6).
7. **Vite SPA**: Handle `useMutation` errors with toast + `setError` for 422 (section 6B).

## 1A. Error Boundaries (Next.js App Router)

```tsx
'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-gray-600">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Retry
      </button>
    </div>
  );
}

// app/global-error.tsx
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Critical error</h1>
            <p className="mt-2 text-gray-600">
              The application encountered an error. {error.digest && `(${error.digest})`}
            </p>
            <button onClick={reset} className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white">
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
```

## 1B. Error Boundaries (Vite SPA — React Router)

In React Router v6, each route can define an `errorElement` that catches errors from its loader/action/component:

```tsx
// router.tsx
import { createBrowserRouter } from 'react-router-dom';
import { RootError } from '@shared/components/RootError';
import { RouteError } from '@shared/components/RouteError';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RootError />,   // Global error (layout crash)
    children: [
      {
        path: 'persons',
        element: <PersonsPage />,
        errorElement: <RouteError />, // Route-level error
      },
    ],
  },
]);
```

```tsx
// shared/components/RouteError.tsx
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';

export function RouteError() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-semibold">{error.status} — {error.statusText}</h2>
        <p className="text-gray-600">{error.data?.message ?? 'An error occurred.'}</p>
        <Link to="/" className="rounded-md bg-blue-600 px-4 py-2 text-white">Go home</Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-gray-600">
        {error instanceof Error ? error.message : 'Unexpected error.'}
      </p>
      <button onClick={() => window.location.reload()} className="rounded-md bg-blue-600 px-4 py-2 text-white">
        Reload
      </button>
    </div>
  );
}
```

```tsx
// shared/components/RootError.tsx — for when the entire layout crashes
import { useRouteError, Link } from 'react-router-dom';

export function RootError() {
  const error = useRouteError();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Critical error</h1>
        <p className="mt-2 text-gray-600">
          {error instanceof Error ? error.message : 'The application encountered an error.'}
        </p>
        <Link to="/" className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-white">
          Restart
        </Link>
      </div>
    </div>
  );
}
```

## 2. Not Found

```tsx
export default function NotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold text-gray-300">404</h1>
      <h2 className="text-xl font-semibold">Page not found</h2>
      <p className="text-gray-600">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Go to home
      </Link>
    </div>
  );
}

import { notFound } from 'next/navigation';

async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({ where: { id: params.id } });

  if (!product) notFound();

  return <ProductDetail product={product} />;
}
```

## 3. Customizable Error Boundary

```tsx
'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error, this.reset);
      }
      return this.props.fallback ?? <DefaultErrorFallback onReset={this.reset} />;
    }
    return this.props.children;
  }
}

<ErrorBoundary
  fallback={(error, reset) => (
    <Alert variant="error">
      <p>{error.message}</p>
      <Button onClick={reset}>Retry</Button>
    </Alert>
  )}
  onError={(error) => Sentry.captureException(error)}
>
  <RiskyComponent />
</ErrorBoundary>
```

## 4. Typed Errors (Result Pattern)

```typescript
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function fetchProduct(id: string): Promise<Result<Product, AppError>> {
  try {
    const response = await fetch(`/api/products/${id}`);

    if (!response.ok) {
      return {
        success: false,
        error: new AppError(
          response.status === 404 ? 'NOT_FOUND' : 'API_ERROR',
          `Error ${response.status}: ${response.statusText}`,
        ),
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: new AppError('NETWORK_ERROR', 'Connection error'),
    };
  }
}

const result = await fetchProduct(id);
if (!result.success) {
  showToast({ type: 'error', message: result.error.message });
  return;
}
```

### Typed Error Classes

```typescript
export type ErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  get isRetryable(): boolean {
    return ['API_ERROR', 'NETWORK_ERROR'].includes(this.code);
  }

  get userMessage(): string {
    const messages: Record<ErrorCode, string> = {
      NOT_FOUND: 'The requested resource was not found.',
      VALIDATION_ERROR: 'The entered data is not valid.',
      UNAUTHORIZED: 'Your session has expired. Please sign in again.',
      FORBIDDEN: 'You do not have permission to perform this action.',
      API_ERROR: 'There was a server error. Please try again.',
      NETWORK_ERROR: 'Connection error. Check your internet.',
      UNKNOWN: 'An unexpected error occurred.',
    };
    return messages[this.code];
  }
}
```

## 5. Sentry

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1,

  beforeSend(event) {
    if (process.env.NODE_ENV === 'development') return null;
    if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) return null;
    return event;
  },
});

export function setSentryUser(user: { id: string; email: string }) {
  Sentry.setUser({ id: user.id, email: user.email });
}

Sentry.captureException(error, {
  tags: { feature: 'checkout', step: 'payment' },
  extra: { orderId, cartTotal },
});
```

## 6. Toast / Notifications

To build a custom toast system (without `sonner`), see [`component-patterns`](../component-patterns/SKILL.md) for the composition pattern and [`design-system-build-components-rules`](../design-system-build-components-rules/SKILL.md) for component structure (variants with CVA, a11y, tests).

```tsx
import { toast } from 'sonner';

async function handleDelete(id: string) {
  const result = await deleteProduct(id);

  if (result.success) {
    toast.success('Product deleted');
  } else {
    toast.error(result.error.userMessage, {
      action: result.error.isRetryable
        ? { label: 'Retry', onClick: () => handleDelete(id) }
        : undefined,
    });
  }
}

// toast.success → successful operations (3s auto-dismiss)
// toast.error → recoverable errors (persists until dismissed)
// Error Boundary → errors that break the render
// error.tsx / errorElement → route errors (404, 500)
```

## 6B. Mutation Errors — Vite SPA

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ApiError } from '@shared/lib/api-client';

export function useDeletePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: personsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.lists() });
      toast.success('Person deleted');
    },
    onError: (error: ApiError) => {
      if (error.status === 404) {
        toast.error('Person no longer exists');
        queryClient.invalidateQueries({ queryKey: personKeys.lists() });
        return;
      }
      toast.error(error.message ?? 'Error deleting person');
    },
  });
}
```

**Rule:** Mutation errors do not break the render — always use toast or `setError` in forms, never let an unhandled mutation crash via the error boundary.

## 7. Retry Strategies

```tsx
useQuery({
  queryKey: productKeys.detail(id),
  queryFn: () => fetchProduct(id),
  retry: (failureCount, error) => {
    if (error instanceof AppError && !error.isRetryable) return false;
    return failureCount < 3;
  },
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
});

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw new Error('Unreachable');
}
```

## Gotchas

- Empty `catch {}` silences errors completely — always log or propagate.
- Showing `error.stack` to user exposes internals — use `error.userMessage` from AppError.
- `throw new Error('something')` without a typed code prevents distinguishing errors — use AppError with ErrorCode.
- Error boundary without a retry button traps the user — always include `reset()`.
- `console.error` as the only monitoring in production doesn't scale — integrate Sentry or equivalent.
- Native `alert()`/`confirm()` block the thread and are not stylable — use toast or modals.
- Ignoring `fetch` errors produces silent failures — always handle the network case.

## Related Skills

| Skill | Why |
|-------|-----|
| `testing-rules` | Tests for error boundaries, error states |
| `a11y-rules` | `role="alert"`, aria-live for errors |
| `i18n-rules` | Translated error messages and toasts |
| `fetching-rules` | Error states in TanStack Query, retry logic |
| `backend/error-handling` | Server error format that the frontend consumes |
