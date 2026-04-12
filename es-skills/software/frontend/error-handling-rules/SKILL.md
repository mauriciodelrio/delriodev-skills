---
name: error-handling-rules
description: >
  Reglas para manejo de errores en aplicaciones React/Next.js. Cubre Error
  Boundaries, error.tsx en App Router, integración con Sentry, fallback UI,
  reintentos, notificaciones toast, y patrones de error tipados.
---

# 🚨 Manejo de Errores — Reglas

## Principio Rector

> **Toda operación que puede fallar, fallará.** Planificar el camino de error
> es tan importante como el camino feliz. Los errores deben ser informativos
> para el usuario y diagnósticos para el desarrollador.

---

## 1. Error Boundaries (Next.js App Router)

```tsx
// app/error.tsx — Error boundary de nivel de ruta
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
    // Reportar a servicio de monitoreo
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold">Algo salió mal</h2>
      <p className="text-gray-600">
        Ha ocurrido un error inesperado. Por favor intenta de nuevo.
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Reintentar
      </button>
    </div>
  );
}

// app/global-error.tsx — Error boundary del root layout
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Error crítico</h1>
            <p className="mt-2 text-gray-600">
              La aplicación encontró un error. {error.digest && `(${error.digest})`}
            </p>
            <button onClick={reset} className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white">
              Recargar
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
      <h2 className="text-xl font-semibold">Página no encontrada</h2>
      <p className="text-gray-600">
        La página que buscas no existe o fue movida.
      </p>
      <Link
        href="/"
        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Ir al inicio
      </Link>
    </div>
  );
}

// Trigger manual en Server Components
import { notFound } from 'next/navigation';

async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({ where: { id: params.id } });

  if (!product) notFound(); // Renderiza app/not-found.tsx

  return <ProductDetail product={product} />;
}
```

---

## 3. Error Boundary Customizable (Client Components)

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

// Uso
<ErrorBoundary
  fallback={(error, reset) => (
    <Alert variant="error">
      <p>{error.message}</p>
      <Button onClick={reset}>Reintentar</Button>
    </Alert>
  )}
  onError={(error) => Sentry.captureException(error)}
>
  <RiskyComponent />
</ErrorBoundary>
```

---

## 4. Errores Tipados (Result Pattern)

```typescript
// shared/lib/result.ts
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// ✅ Funciones que pueden fallar retornan Result
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
      error: new AppError('NETWORK_ERROR', 'Error de conexión'),
    };
  }
}

// Uso
const result = await fetchProduct(id);
if (!result.success) {
  // TypeScript sabe que result.error existe
  showToast({ type: 'error', message: result.error.message });
  return;
}
// TypeScript sabe que result.data es Product
```

### Clases de Error Tipadas

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
      NOT_FOUND: 'No se encontró el recurso solicitado.',
      VALIDATION_ERROR: 'Los datos ingresados no son válidos.',
      UNAUTHORIZED: 'Tu sesión expiró. Por favor inicia sesión de nuevo.',
      FORBIDDEN: 'No tienes permiso para realizar esta acción.',
      API_ERROR: 'Hubo un error en el servidor. Intenta de nuevo.',
      NETWORK_ERROR: 'Error de conexión. Verifica tu internet.',
      UNKNOWN: 'Ocurrió un error inesperado.',
    };
    return messages[this.code];
  }
}
```

---

## 5. Sentry — Integración

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,      // 10% de transacciones
  replaysSessionSampleRate: 0, // Replay solo en errores
  replaysOnErrorSampleRate: 1, // 100% replay cuando hay error

  beforeSend(event) {
    // No enviar errores de desarrollo
    if (process.env.NODE_ENV === 'development') return null;
    // Filtrar errores irrelevantes
    if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) return null;
    return event;
  },
});

// Contexto de usuario
export function setSentryUser(user: { id: string; email: string }) {
  Sentry.setUser({ id: user.id, email: user.email });
}

// Error manual con contexto
Sentry.captureException(error, {
  tags: { feature: 'checkout', step: 'payment' },
  extra: { orderId, cartTotal },
});
```

---

## 6. Toast / Notificaciones

```tsx
// ✅ Toast para feedback de operaciones (no para errores críticos)
import { toast } from 'sonner';

// Server Action con feedback
async function handleDelete(id: string) {
  const result = await deleteProduct(id);

  if (result.success) {
    toast.success('Producto eliminado');
  } else {
    toast.error(result.error.userMessage, {
      action: result.error.isRetryable
        ? { label: 'Reintentar', onClick: () => handleDelete(id) }
        : undefined,
    });
  }
}

// ✅ Reglas de notificaciones:
// - toast.success → operaciones exitosas (desaparece en 3s)
// - toast.error → errores recuperables (persiste hasta dismiss)
// - Error Boundary → errores que rompen el render
// - Página de error → errores de ruta (404, 500)
```

---

## 7. Retry Strategies

```tsx
// ✅ TanStack Query retry automático
useQuery({
  queryKey: productKeys.detail(id),
  queryFn: () => fetchProduct(id),
  retry: (failureCount, error) => {
    // No retry en errores de cliente (4xx)
    if (error instanceof AppError && !error.isRetryable) return false;
    return failureCount < 3;
  },
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000), // Exponential backoff
});

// ✅ Retry manual con backoff
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

## Anti-patrones

```tsx
// ❌ catch vacío — silenciar errores
try { await save(); } catch {} // ❌ El error desaparece

// ❌ Mostrar error técnico al usuario
toast.error(error.stack);       // ❌
toast.error(error.userMessage); // ✅

// ❌ throw new Error('algo') sin tipado ni código
// ❌ Error boundaries sin botón de retry
// ❌ Console.error como único mecanismo de monitoreo en producción
// ❌ Alertas de JavaScript nativas (alert(), confirm())
// ❌ Ignorar errores de fetch (network failures silenciosas)
```
