---
name: routing-rules
description: >
  Reglas y patrones de routing en Next.js App Router. Cubre layouts anidados,
  route groups, parallel routes, intercepting routes, guards de autenticación,
  redirects, breadcrumbs, y manejo de parámetros de búsqueda.
---

# 🧭 Routing — Reglas y Patrones

## Principio Rector

> **File-system routing con composición de layouts.** Cada segmento de la URL
> es un directorio. Los layouts sobreviven la navegación.

---

## 1. Layouts Anidados

```
app/
├── layout.tsx                    # Root: html, body, providers
├── (marketing)/                  # Route group sin prefijo URL
│   ├── layout.tsx                # Layout: header + footer marketing
│   ├── page.tsx                  # → /
│   └── pricing/page.tsx          # → /pricing
├── (app)/                        # Route group autenticado
│   ├── layout.tsx                # Layout: sidebar + topbar
│   ├── dashboard/page.tsx        # → /dashboard
│   └── settings/
│       ├── layout.tsx            # Sub-layout: tabs de settings
│       ├── page.tsx              # → /settings (redirect a profile)
│       ├── profile/page.tsx      # → /settings/profile
│       └── billing/page.tsx      # → /settings/billing
```

```tsx
// app/(app)/layout.tsx — Layout autenticado con sidebar
import { redirect } from 'next/navigation';
import { getSession } from '@shared/lib/auth';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="flex h-screen">
      <Sidebar user={session.user} />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
```

---

## 2. Route Groups — Layouts Diferentes, Misma URL

```
// Route groups con () NO afectan la URL
app/
├── (auth)/                      # Sin sidebar/header
│   ├── layout.tsx               # Layout minimalista
│   ├── login/page.tsx           # → /login
│   └── register/page.tsx        # → /register
├── (dashboard)/                 # Con sidebar
│   ├── layout.tsx               # Layout con sidebar
│   └── home/page.tsx            # → /home
```

---

## 3. Parallel Routes — Múltiples Páginas en un Layout

```
// Notación: @nombreSlot
app/(dashboard)/
├── layout.tsx
├── page.tsx                     # Slot default
├── @analytics/                  # Slot parallelo
│   ├── page.tsx
│   └── loading.tsx
└── @notifications/              # Otro slot parallelo
    ├── page.tsx
    └── default.tsx              # Fallback cuando la ruta no matchea
```

```tsx
// app/(dashboard)/layout.tsx
export default function DashboardLayout({
  children,
  analytics,
  notifications,
}: {
  children: ReactNode;
  analytics: ReactNode;
  notifications: ReactNode;
}) {
  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-8">{children}</div>
      <div className="col-span-4 space-y-4">
        {analytics}
        {notifications}
      </div>
    </div>
  );
}

// ✅ Cada slot carga independientemente con Suspense
// ✅ Si un slot falla, no afecta a los demás
```

---

## 4. Intercepting Routes — Modales sobre Rutas

```
// Notación: (.) mismo nivel, (..) un nivel arriba, (...) root
app/
├── feed/
│   ├── page.tsx                 # Lista de posts
│   └── @modal/
│       └── (.)photo/[id]/       # Intercepta /feed/photo/[id]
│           └── page.tsx         # Muestra como modal
└── photo/
    └── [id]/
        └── page.tsx             # Página completa del photo (acceso directo/refresh)
```

```tsx
// app/feed/@modal/(.)photo/[id]/page.tsx — Modal interceptando la ruta
import { Modal } from '@shared/components/ui/Modal';

export default async function PhotoModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const photo = await db.photo.findUnique({ where: { id } });

  return (
    <Modal>
      <img src={photo.url} alt={photo.description} />
      <p>{photo.description}</p>
    </Modal>
  );
}

// ✅ Click en feed → abre modal (interceptado)
// ✅ URL directa o refresh → carga página completa (no interceptado)
```

---

## 5. Guards de Autenticación

```tsx
// ✅ Pattern: Auth guard en layout (NO en cada page)
// app/(protected)/layout.tsx
import { redirect } from 'next/navigation';
import { auth } from '@shared/lib/auth';

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return <>{children}</>;
}

// ✅ Pattern: Role-based access en page
// app/(protected)/admin/page.tsx
export default async function AdminPage() {
  const session = await auth();

  if (session?.user.role !== 'admin') {
    redirect('/unauthorized');
  }

  return <AdminDashboard />;
}

// ❌ NUNCA usar guards client-side como única protección
// El middleware + server guards son la fuente de verdad
```

---

## 6. Search Params Tipados

```tsx
// ✅ Search params tipados con Zod
import { z } from 'zod';

const searchParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  q: z.string().optional(),
  sort: z.enum(['name', 'price', 'date']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

// app/products/page.tsx
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const params = searchParamsSchema.parse(rawParams);

  const products = await db.product.findMany({
    where: params.q ? { name: { contains: params.q } } : undefined,
    orderBy: { [params.sort]: params.order },
    skip: (params.page - 1) * 20,
    take: 20,
  });

  return <ProductGrid products={products} filters={params} />;
}

// ✅ Client: actualizar search params sin full page reload
'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export function SearchFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    params.set('page', '1'); // Reset page on filter change
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={searchParams.get('sort') ?? 'date'}
      onChange={(e) => updateFilter('sort', e.target.value)}
    >
      <option value="date">Fecha</option>
      <option value="name">Nombre</option>
      <option value="price">Precio</option>
    </select>
  );
}
```

---

## 7. Redirects y Rewrites

```tsx
// next.config.ts — redirects permanentes y rewrites
const config = {
  async redirects() {
    return [
      { source: '/old-page', destination: '/new-page', permanent: true },
      { source: '/blog/:slug', destination: '/articles/:slug', permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: '/api/v1/:path*', destination: 'https://api.backend.com/:path*' },
    ];
  },
};

// ✅ Redirect programático en Server Components
import { redirect, permanentRedirect } from 'next/navigation';

redirect('/dashboard');          // 307 temporal
permanentRedirect('/new-url');   // 308 permanente
```

---

## Anti-patrones de Routing

```tsx
// ❌ Auth check en CADA page.tsx (usar layout)
// ❌ Intercepting routes para flujos complejos multi-step (usar páginas normales)
// ❌ Search params sin validación — siempre usar Zod
// ❌ Client-side redirects con useEffect para auth (usar server redirect)
// ❌ Pasar datos entre rutas via estado global (usar search params o server state)
// ❌ Layouts enormes con lógica condicional (dividir en route groups)
```
