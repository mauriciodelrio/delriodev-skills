---
name: routing-rules
description: >
  Routing rules and patterns for Next.js App Router. Covers nested layouts,
  route groups, parallel routes, intercepting routes, authentication guards,
  redirects, breadcrumbs, and search parameter handling.
---

# 🧭 Routing — Rules and Patterns

## Guiding Principle

> **File-system routing with layout composition.** Each URL segment
> is a directory. Layouts survive navigation.

---

## 1. Nested Layouts

```
app/
├── layout.tsx                    # Root: html, body, providers
├── (marketing)/                  # Route group with no URL prefix
│   ├── layout.tsx                # Layout: marketing header + footer
│   ├── page.tsx                  # → /
│   └── pricing/page.tsx          # → /pricing
├── (app)/                        # Authenticated route group
│   ├── layout.tsx                # Layout: sidebar + topbar
│   ├── dashboard/page.tsx        # → /dashboard
│   └── settings/
│       ├── layout.tsx            # Sub-layout: settings tabs
│       ├── page.tsx              # → /settings (redirect to profile)
│       ├── profile/page.tsx      # → /settings/profile
│       └── billing/page.tsx      # → /settings/billing
```

```tsx
// app/(app)/layout.tsx — Authenticated layout with sidebar
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

## 2. Route Groups — Different Layouts, Same URL

```
// Route groups with () do NOT affect the URL
app/
├── (auth)/                      # No sidebar/header
│   ├── layout.tsx               # Minimalist layout
│   ├── login/page.tsx           # → /login
│   └── register/page.tsx        # → /register
├── (dashboard)/                 # With sidebar
│   ├── layout.tsx               # Layout with sidebar
│   └── home/page.tsx            # → /home
```

---

## 3. Parallel Routes — Multiple Pages in One Layout

```
// Notation: @slotName
app/(dashboard)/
├── layout.tsx
├── page.tsx                     # Default slot
├── @analytics/                  # Parallel slot
│   ├── page.tsx
│   └── loading.tsx
└── @notifications/              # Another parallel slot
    ├── page.tsx
    └── default.tsx              # Fallback when the route doesn't match
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

// ✅ Each slot loads independently with Suspense
// ✅ If one slot fails, it doesn't affect the others
```

---

## 4. Intercepting Routes — Modals Over Routes

```
// Notation: (.) same level, (..) one level up, (...) root
app/
├── feed/
│   ├── page.tsx                 # Post list
│   └── @modal/
│       └── (.)photo/[id]/       # Intercepts /feed/photo/[id]
│           └── page.tsx         # Shows as modal
└── photo/
    └── [id]/
        └── page.tsx             # Full photo page (direct access/refresh)
```

```tsx
// app/feed/@modal/(.)photo/[id]/page.tsx — Modal intercepting the route
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

// ✅ Click in feed → opens modal (intercepted)
// ✅ Direct URL or refresh → loads full page (not intercepted)
```

---

## 5. Authentication Guards

```tsx
// ✅ Pattern: Auth guard in layout (NOT in each page)
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

// ✅ Pattern: Role-based access in page
// app/(protected)/admin/page.tsx
export default async function AdminPage() {
  const session = await auth();

  if (session?.user.role !== 'admin') {
    redirect('/unauthorized');
  }

  return <AdminDashboard />;
}

// ❌ NEVER use client-side guards as the only protection
// Middleware + server guards are the source of truth
```

---

## 6. Typed Search Params

```tsx
// ✅ Typed search params with Zod
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

// ✅ Client: update search params without full page reload
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
      <option value="date">Date</option>
      <option value="name">Name</option>
      <option value="price">Price</option>
    </select>
  );
}
```

---

## 7. Redirects and Rewrites

```tsx
// next.config.ts — permanent redirects and rewrites
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

// ✅ Programmatic redirect in Server Components
import { redirect, permanentRedirect } from 'next/navigation';

redirect('/dashboard');          // 307 temporary
permanentRedirect('/new-url');   // 308 permanent
```

---

## Routing Anti-patterns

```tsx
// ❌ Auth check in EVERY page.tsx (use layout)
// ❌ Intercepting routes for complex multi-step flows (use normal pages)
// ❌ Search params without validation — always use Zod
// ❌ Client-side redirects with useEffect for auth (use server redirect)
// ❌ Passing data between routes via global state (use search params or server state)
// ❌ Huge layouts with conditional logic (split into route groups)
```
