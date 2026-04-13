---
name: vite-routing-rules
description: >
  Usa esta skill cuando implementes routing en Vite + React Router v6 SPA:
  createBrowserRouter, layouts con Outlet, protected routes, search params
  tipados con Zod, y lazy loading de páginas.
---

# Routing Vite SPA — React Router v6

## Flujo de trabajo del agente

1. Definir rutas con `createBrowserRouter` en `src/router.tsx` (sección 1).
2. Layouts con `<Outlet>` para UI persistente: `AppLayout` (sidebar), `AuthLayout` (minimalista) (sección 2).
3. Guards como wrapper components con `<Navigate>` — no son seguridad real, solo UX (sección 3).
4. Search params validados con Zod + `useSearchParams` (sección 4).
5. Lazy loading de páginas con `Component` export pattern (sección 5).
6. Rutas centralizadas en `shared/constants/routes.ts` — nunca strings hardcodeados.

## 1. Setup con createBrowserRouter

```tsx
// src/router.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthLayout } from '@shared/components/layout/AuthLayout';
import { AppLayout } from '@shared/components/layout/AppLayout';
import { ProtectedRoute } from '@shared/components/ProtectedRoute';

const router = createBrowserRouter([
  {
    // Rutas públicas (sin sidebar, layout minimalista)
    element: <AuthLayout />,
    children: [
      { path: '/login', lazy: () => import('@features/auth/pages/LoginPage') },
    ],
  },
  {
    // Rutas protegidas (con sidebar, dashboard layout)
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteError />,
    children: [
      { path: '/', lazy: () => import('@features/dashboard/pages/DashboardPage') },
      { path: '/persons', lazy: () => import('@features/persons/pages/PersonsPage') },
      { path: '/persons/:id', lazy: () => import('@features/persons/pages/PersonDetailPage') },
    ],
  },
  { path: '*', lazy: () => import('@shared/components/NotFound') },
]);

// src/App.tsx
export function App() {
  return <RouterProvider router={router} />;
}
```

## 2. Layout Routes con Outlet

```tsx
// shared/components/layout/AppLayout.tsx
import { Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}

// shared/components/layout/AuthLayout.tsx
export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Outlet />
    </div>
  );
}
```

## 3. Protected Routes (Auth Guard)

```tsx
// shared/components/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // Leer estado de auth (signal, zustand, context, etc.)
  const isAuthenticated = useAuthState();
  const location = useLocation();

  if (!isAuthenticated) {
    // Preservar la URL original para redirect post-login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
```

**Gotcha SPA:** El guard client-side NO es seguridad real — solo es UX. La API **siempre** debe validar el token en cada request. El guard solo evita mostrar UI a usuarios no autenticados.

## 4. Search Params Tipados

```tsx
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';

const filtersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  q: z.string().optional(),
  sort: z.enum(['name', 'email', 'createdAt']).default('createdAt'),
});

export function useTypedSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = filtersSchema.parse(Object.fromEntries(searchParams));

  function updateParams(updates: Partial<z.infer<typeof filtersSchema>>) {
    const newParams = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        newParams.set(key, String(value));
      }
    }
    if ('q' in updates || 'sort' in updates) {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  }

  return { params, updateParams };
}
```

## 5. Lazy Loading de Páginas

```tsx
// Cada page exporta como `Component` para que React Router lo resuelva con `lazy`
// features/persons/pages/PersonsPage.tsx
export function Component() {
  return <PersonsList />;
}
Component.displayName = 'PersonsPage';
```

## Gotchas

- Guard client-side como única seguridad — la API siempre debe verificar tokens.
- Lazy imports sin `Component` export — React Router `lazy()` espera `{ Component }`.
- `useNavigate` en callbacks sin verificar montaje — puede causar errors en componentes desmontados.
- Refresh en ruta profunda (e.g. `/persons/123`) da 404 en producción — configurar fallback a `index.html` en el server (nginx: `try_files $uri /index.html`).
- Rutas hardcodeadas como strings en múltiples archivos — centralizar en `shared/constants/routes.ts`.

## Skills Relacionadas

- `vite-project-structure` — organización de carpetas y path aliases en Vite SPA
- `security-rules` — tokens en memoria, apiClient con auth header
- `error-handling-rules` — errorElement en React Router, mutation errors
