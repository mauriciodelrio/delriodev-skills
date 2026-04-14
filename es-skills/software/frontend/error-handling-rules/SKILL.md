---
name: error-handling-rules
description: >
  Usa esta skill cuando implementes manejo de errores en React:
  Error Boundaries (Next.js error.tsx / React Router errorElement),
  errores tipados (Result pattern), integración con Sentry, reintentos
  con backoff exponencial, y notificaciones toast.
---

# Manejo de Errores

## Flujo de trabajo del agente

1. Detectar tipo de proyecto:
   - **Next.js** → `error.tsx` y `global-error.tsx` en App Router (sección 1A).
   - **Vite SPA** → `errorElement` en React Router (sección 1B).
2. Crear páginas Not Found: **Next.js** `not-found.tsx` / **Vite SPA** ruta catch-all (sección 2).
3. Wrappear secciones de riesgo con ErrorBoundary customizable (sección 3).
4. Implementar Result pattern + AppError tipado para funciones que fallan (sección 4).
5. Configurar Sentry con filtros y context (sección 5).
6. Elegir mecanismo: toast para recuperables, boundary para render, página para rutas (sección 6).
7. **Vite SPA**: Manejar errores de `useMutation` con toast + `setError` para 422 (sección 6B).

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

## 1B. Error Boundaries (Vite SPA — React Router)

En React Router v6, cada ruta puede definir un `errorElement` que captura errores de su loader/action/componente:

```tsx
// router.tsx
import { createBrowserRouter } from 'react-router-dom';
import { RootError } from '@shared/components/RootError';
import { RouteError } from '@shared/components/RouteError';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RootError />,   // Error global (layout crash)
    children: [
      {
        path: 'persons',
        element: <PersonsPage />,
        errorElement: <RouteError />, // Error de esta ruta
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
        <p className="text-gray-600">{error.data?.message ?? 'Ocurrió un error.'}</p>
        <Link to="/" className="rounded-md bg-blue-600 px-4 py-2 text-white">Ir al inicio</Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold">Algo salió mal</h2>
      <p className="text-gray-600">
        {error instanceof Error ? error.message : 'Error inesperado.'}
      </p>
      <button onClick={() => window.location.reload()} className="rounded-md bg-blue-600 px-4 py-2 text-white">
        Recargar
      </button>
    </div>
  );
}
```

```tsx
// shared/components/RootError.tsx — para cuando el layout completo falla
import { useRouteError, Link } from 'react-router-dom';

export function RootError() {
  const error = useRouteError();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Error crítico</h1>
        <p className="mt-2 text-gray-600">
          {error instanceof Error ? error.message : 'La aplicación encontró un error.'}
        </p>
        <Link to="/" className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-white">
          Reiniciar
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

import { notFound } from 'next/navigation';

async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({ where: { id: params.id } });

  if (!product) notFound();

  return <ProductDetail product={product} />;
}
```

## 3. Error Boundary Customizable

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
      <Button onClick={reset}>Reintentar</Button>
    </Alert>
  )}
  onError={(error) => Sentry.captureException(error)}
>
  <RiskyComponent />
</ErrorBoundary>
```

## 4. Errores Tipados (Result Pattern)

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
      error: new AppError('NETWORK_ERROR', 'Error de conexión'),
    };
  }
}

const result = await fetchProduct(id);
if (!result.success) {
  showToast({ type: 'error', message: result.error.message });
  return;
}
```

### Clases de Error Tipadas

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

## 6. Toast / Notificaciones

Para construir un sistema de toast propio (sin `sonner`), consultar [`component-patterns`](../component-patterns/SKILL.md) para el patrón de composición y [`design-system-build-components-rules`](../design-system-build-components-rules/SKILL.md) para la estructura de componente (variants con CVA, a11y, tests).

```tsx
import { toast } from 'sonner';

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

// toast.success → operaciones exitosas (3s auto-dismiss)
// toast.error → errores recuperables (persiste hasta dismiss)
// Error Boundary → errores que rompen el render
// error.tsx / errorElement → errores de ruta (404, 500)
```

## 6B. Errores de Mutation — Vite SPA

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
      toast.success('Persona eliminada');
    },
    onError: (error: ApiError) => {
      if (error.status === 404) {
        toast.error('La persona ya no existe');
        queryClient.invalidateQueries({ queryKey: personKeys.lists() });
        return;
      }
      toast.error(error.message ?? 'Error al eliminar');
    },
  });
}
```

**Regla:** Errores de mutation no rompen el render — siempre usar toast o `setError` en formularios, nunca dejar que una mutation no manejada crashee con el error boundary.

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

- `catch {}` vacío silencia errores completamente — siempre loguear o propagar.
- Mostrar `error.stack` al usuario expone internals — usar `error.userMessage` del AppError.
- `throw new Error('algo')` sin código tipado impide distinguir errores — usar AppError con ErrorCode.
- Error boundary sin botón de retry deja al usuario atrapado — siempre incluir `reset()`.
- `console.error` como único monitoreo en producción no escala — integrar Sentry o equivalente.
- `alert()`/`confirm()` nativos bloquean el thread y no son estilizables — usar toast o modales.
- Ignorar errores de `fetch` produce failures silenciosos — siempre manejar el caso de red.

## Skills Relacionadas

| Skill | Por qué |
|-------|--------|
| `testing-rules` | Tests de error boundaries, estados de error |
| `a11y-rules` | `role="alert"`, aria-live para errores |
| `i18n-rules` | Mensajes de error y toasts traducidos |
| `fetching-rules` | Error states en TanStack Query, retry logic |
| `backend/error-handling` | Formato de errores del servidor que el frontend consume |
