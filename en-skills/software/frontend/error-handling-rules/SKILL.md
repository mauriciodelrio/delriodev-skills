---
name: error-handling-rules
description: >
  Error handling rules for React/Next.js applications. Covers Error
  Boundaries, error.tsx in App Router, Sentry integration, fallback UI,
  retries, toast notifications, and typed error patterns.
---

# 🚨 Error Handling — Rules

## Guiding Principle

> **Every operation that can fail, will fail.** Planning the error path
> is as important as the happy path. Errors must be informative
> for the user and diagnostic for the developer.

---

## 1. Error Boundaries (Next.js App Router)

```tsx
// app/error.tsx — Route-level error boundary
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
    // Report to monitoring service
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

// app/global-error.tsx — Root layout error boundary
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

---

## 2. Not Found

```tsx
// app/not-found.tsx
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

// Manual trigger in Server Components
import { notFound } from 'next/navigation';

async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({ where: { id: params.id } });

  if (!product) notFound(); // Renders app/not-found.tsx

  return <ProductDetail product={product} />;
}
```

---

## 3. Customizable Error Boundary (Client Components)

```tsx
// shared/components/ErrorBoundary.tsx
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

// Usage
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

---

## 4. Typed Errors (Result Pattern)

```typescript
// shared/lib/result.ts
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// ✅ Functions that can fail return Result
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

// Usage
const result = await fetchProduct(id);
if (!result.success) {
  // TypeScript knows result.error exists
  showToast({ type: 'error', message: result.error.message });
  return;
}
// TypeScript knows result.data is Product
```

### Typed Error Classes

```typescript
// shared/lib/errors.ts
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

---

## 5. Sentry — Integration

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,      // 10% of transactions
  replaysSessionSampleRate: 0, // Replay only on errors
  replaysOnErrorSampleRate: 1, // 100% replay when error occurs

  beforeSend(event) {
    // Don't send development errors
    if (process.env.NODE_ENV === 'development') return null;
    // Filter irrelevant errors
    if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) return null;
    return event;
  },
});

// User context
export function setSentryUser(user: { id: string; email: string }) {
  Sentry.setUser({ id: user.id, email: user.email });
}

// Manual error with context
Sentry.captureException(error, {
  tags: { feature: 'checkout', step: 'payment' },
  extra: { orderId, cartTotal },
});
```

---

## 6. Toast / Notifications

```tsx
// ✅ Toast for operation feedback (not for critical errors)
import { toast } from 'sonner';

// Server Action with feedback
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

// ✅ Notification rules:
// - toast.success → successful operations (disappears in 3s)
// - toast.error → recoverable errors (persists until dismissed)
// - Error Boundary → errors that break the render
// - Error page → route errors (404, 500)
```

---

## 7. Retry Strategies

```tsx
// ✅ TanStack Query automatic retry
useQuery({
  queryKey: productKeys.detail(id),
  queryFn: () => fetchProduct(id),
  retry: (failureCount, error) => {
    // No retry on client errors (4xx)
    if (error instanceof AppError && !error.isRetryable) return false;
    return failureCount < 3;
  },
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000), // Exponential backoff
});

// ✅ Manual retry with backoff
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

---

## Anti-patterns

```tsx
// ❌ Empty catch — silencing errors
try { await save(); } catch {} // ❌ The error disappears

// ❌ Showing technical error to the user
toast.error(error.stack);       // ❌
toast.error(error.userMessage); // ✅

// ❌ throw new Error('something') without typing or code
// ❌ Error boundaries without a retry button
// ❌ Console.error as the only monitoring mechanism in production
// ❌ Native JavaScript alerts (alert(), confirm())
// ❌ Ignoring fetch errors (silent network failures)
```

---

## Related Skills

> **Consult the master index [`frontend/SKILL.md`](../SKILL.md) → "Mandatory Skills by Action"** for error handling.

| Skill | Why |
|-------|-----|
| `testing-rules` | Tests for error boundaries, error states |
| `a11y-rules` | `role="alert"`, aria-live for errors |
| `i18n-rules` | Translated error messages and toasts |
| `fetching-rules` | Error states in TanStack Query, retry logic |
| `backend/error-handling` | Server error format that the frontend consumes |
