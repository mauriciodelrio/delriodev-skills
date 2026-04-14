---
name: vite-routing-rules
description: >
  Use this skill when implementing routing in Vite + React Router v6 SPA:
  createBrowserRouter, layouts with Outlet, protected routes, typed search
  params with Zod, and lazy loading pages.
---

# Routing Vite SPA — React Router v6

## Agent workflow

1. Define routes with `createBrowserRouter` in `src/router.tsx` (section 1).
2. Layouts with `<Outlet>` for persistent UI: `AppLayout` (sidebar), `AuthLayout` (minimal) (section 2).
3. Guards as wrapper components with `<Navigate>` — not real security, UX only (section 3).
4. Search params validated with Zod + `useSearchParams` (section 4).
5. Lazy loading pages with `Component` export pattern (section 5).
6. Routes centralized in `shared/constants/routes.ts` — never hardcoded strings.

## 1. Setup with createBrowserRouter

```tsx
// src/router.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthLayout } from '@shared/components/layout/AuthLayout';
import { AppLayout } from '@shared/components/layout/AppLayout';
import { ProtectedRoute } from '@shared/components/ProtectedRoute';

const router = createBrowserRouter([
  {
    // Public routes (no sidebar, minimal layout)
    element: <AuthLayout />,
    children: [
      { path: '/login', lazy: () => import('@features/auth/pages/LoginPage') },
    ],
  },
  {
    // Protected routes (sidebar, dashboard layout)
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

## 2. Layout Routes with Outlet

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
  // Read auth state (signal, zustand, context, etc.)
  const isAuthenticated = useAuthState();
  const location = useLocation();

  if (!isAuthenticated) {
    // Preserve original URL for post-login redirect
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
```

**SPA Gotcha:** Client-side guards are NOT real security — only UX. The API **must always** validate the token on every request. The guard only prevents showing UI to unauthenticated users.

## 4. Typed Search Params

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

## 5. Lazy Loading Pages

```tsx
// Each page exports as `Component` for React Router lazy resolution
// features/persons/pages/PersonsPage.tsx
export function Component() {
  return <PersonsList />;
}
Component.displayName = 'PersonsPage';
```

## Gotchas

- Client-side guard as only security — the API must always verify tokens.
- Lazy imports without `Component` export — React Router `lazy()` expects `{ Component }`.
- `useNavigate` in callbacks without checking mount — can cause errors in unmounted components.
- Refresh on deep route (e.g. `/persons/123`) gives 404 in production — configure fallback to `index.html` on the server (nginx: `try_files $uri /index.html`).
- Routes hardcoded as strings in multiple files — centralize in `shared/constants/routes.ts`.

## Related Skills

- `vite-project-structure` — folder organization and path aliases in Vite SPA
- `security-rules` — in-memory tokens, apiClient with auth header
- `error-handling-rules` — errorElement in React Router, mutation errors
