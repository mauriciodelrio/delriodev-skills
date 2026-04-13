---
name: routing-rules
description: >
  Use this skill when implementing routing in Next.js App Router: nested
  layouts, route groups, parallel routes, intercepting routes, authentication
  guards, redirects, typed search params, and breadcrumbs.
---

# Routing — Rules and Patterns

## Agent workflow

1. Organize routes into route groups by shared layout: `(marketing)`, `(app)`, `(auth)` (section 2).
2. Auth guards in the protected group's layout, not in each page (section 5).
3. Nested layouts for persistent UI (sidebar, tabs). Each sub-layout inherits from parent (section 1).
4. Search params validated with Zod — never trust raw input (section 6).
5. Parallel routes (`@slot`) for independent zones with their own loading (section 3).
6. Intercepting routes for modals over lists with shareable URLs (section 4).
7. Permanent redirects in `next.config.ts`, programmatic via `redirect()` in Server Components (section 7).

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
```

Each slot loads independently with Suspense. If one slot fails, it doesn't affect the others.

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
```

Click in feed → opens modal (intercepted). Direct URL or refresh → loads full page.

## 5. Authentication Guards

```tsx
// Auth guard in layout (NOT in each page)
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

// Role-based access in page
export default async function AdminPage() {
  const session = await auth();

  if (session?.user.role !== 'admin') {
    redirect('/unauthorized');
  }

  return <AdminDashboard />;
}
```

Never use client-side guards as the only protection. Middleware + server guards are the source of truth.

## 6. Typed Search Params

```tsx
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

// Client: update search params without full page reload
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

## 7. Redirects and Rewrites

```tsx
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

// Programmatic redirect in Server Components
import { redirect, permanentRedirect } from 'next/navigation';

redirect('/dashboard');          // 307 temporary
permanentRedirect('/new-url');   // 308 permanent
```

## Gotchas

- Auth check in EVERY page.tsx — use the protected route group's layout.
- Intercepting routes for multi-step flows — use normal pages.
- Search params without Zod validation — always parse and validate.
- Client-side redirects with `useEffect` for auth — use server `redirect()`.
- Data between routes via global state — use search params or server state.
- Huge layouts with conditional logic — split into route groups.
