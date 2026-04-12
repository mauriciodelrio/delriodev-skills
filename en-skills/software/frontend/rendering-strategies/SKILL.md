---
name: rendering-strategies
description: >
  Rendering strategies for React/Next.js applications. Covers SSR, SSG, ISR,
  Streaming SSR, React Server Components (RSC), Partial Prerendering (PPR),
  selective hydration, and selection criteria by use case.
---

# 🖥️ Rendering Strategies

## Guiding Principle

> **Render as close to the data as possible.** Server Components for static data/DB,
> Client Components only for interactivity. Streaming for perceived speed.

---

## Strategy Map

| Strategy | Build Time | Request Time | Revalidation | Use Case |
|----------|------------|--------------|--------------|----------|
| **SSG** | ✅ Static HTML | — | `revalidate` or on-demand | Blog, docs, landing |
| **ISR** | ✅ Initial HTML | ✅ Regenerates in background | `revalidate: N` | Products, catalogs |
| **SSR** | — | ✅ Every request | — | Dashboards, user-specific data |
| **Streaming** | — | ✅ Partial progressive | — | Pages with slow zones |
| **RSC** | ✅/✅ | Depends on route | — | Everything (default in App Router) |
| **PPR** | ✅ Static shell | ✅ Dynamic slots | — | Combines static + dynamic |
| **CSR** | — | — (client-only) | — | Internal SPAs, widgets |

---

## 1. Static Site Generation (SSG)

```tsx
// app/blog/[slug]/page.tsx
// Generates HTML at build time. Fastest possible.

// Generate static routes at build
export async function generateStaticParams() {
  const posts = await db.post.findMany({ select: { slug: true } });
  return posts.map((post) => ({ slug: post.slug }));
}

// The page renders at build time
export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await db.post.findUnique({ where: { slug } });

  if (!post) notFound();

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.htmlContent }} />
    </article>
  );
}

// ✅ Use for: content that doesn't change with every request
// ✅ Combine with revalidate for ISR
```

---

## 2. Incremental Static Regeneration (ISR)

```tsx
// app/products/[id]/page.tsx
// Static + background revalidation

// Time-based revalidation
export const revalidate = 3600; // Regenerate every 1 hour

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await fetch(`${env.API_URL}/products/${id}`, {
    next: { revalidate: 3600 },
  }).then((r) => r.json());

  return <ProductDetail product={product} />;
}

// ✅ On-demand revalidation (when the data changes)
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request: Request) {
  const { path, tag, secret } = await request.json();

  if (secret !== env.REVALIDATION_SECRET) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 });
  }

  if (tag) revalidateTag(tag);
  if (path) revalidatePath(path);

  return Response.json({ revalidated: true, now: Date.now() });
}
```

---

## 3. Server-Side Rendering (SSR)

```tsx
// app/dashboard/page.tsx
// Forced SSR — renders on every request

// Force dynamic rendering
export const dynamic = 'force-dynamic';
// Or use headers()/cookies() which automatically make the route dynamic

import { cookies } from 'next/headers';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');

  const data = await fetch(`${env.API_URL}/dashboard`, {
    headers: { Authorization: `Bearer ${session?.value}` },
    cache: 'no-store',
  }).then((r) => r.json());

  return <DashboardView data={data} />;
}

// ✅ Use for: user-personalized data, real-time data
// ❌ DO NOT use if data is the same for all users (use SSG/ISR)
```

---

## 4. Streaming SSR with Suspense

```tsx
// app/dashboard/page.tsx
// Send HTML progressively — the page appears fast

import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Renders immediately */}
      <header className="col-span-12">
        <h1>Dashboard</h1>
      </header>

      {/* Each Suspense boundary sends HTML when ready */}
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />  {/* Slow fetch: 2s */}
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <RecentOrders />  {/* Medium fetch: 800ms */}
      </Suspense>

      <Suspense fallback={<StatsSkeleton />}>
        <QuickStats />    {/* Fast fetch: 200ms */}
      </Suspense>
    </div>
  );
}

// ✅ Each async section resolves independently
// ✅ The user sees content progressively
// ✅ No waterfalls — fetches run in parallel
```

---

## 5. React Server Components (RSC) — Patterns

```tsx
// ✅ Pattern: Server Component wrapping Client Component
// The Server Component does the fetch, the Client handles interactivity

// Server Component (default)
async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });
  const reviews = await db.review.findMany({ where: { productId: id } });

  return (
    <div>
      {/* Server: renders static HTML */}
      <ProductInfo product={product} />

      {/* Client: needs interactivity */}
      <AddToCartButton productId={id} price={product.price} />

      {/* Server: renders static list */}
      <ReviewList reviews={reviews} />

      {/* Client: interactive form */}
      <ReviewForm productId={id} />
    </div>
  );
}

// ✅ Pattern: Pass Server Components as children to Client Components
// ClientWrapper.tsx
'use client';
export function ClientWrapper({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(true);
  return isVisible ? <div>{children}</div> : null;
}

// Page.tsx (Server Component)
export default async function Page() {
  const data = await fetchData(); // Server-side fetch
  return (
    <ClientWrapper>
      {/* ServerContent renders on the server, even though ClientWrapper is client */}
      <ServerContent data={data} />
    </ClientWrapper>
  );
}
```

---

## 6. Partial Prerendering (PPR) — Next.js 15+

```tsx
// next.config.ts
const config = {
  experimental: {
    ppr: 'incremental', // Enable PPR
  },
};

// app/product/[id]/page.tsx
export const experimental_ppr = true; // Opt-in per route

import { Suspense } from 'react';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });

  return (
    <div>
      {/* STATIC — served from CDN as pre-rendered HTML */}
      <ProductInfo product={product} />
      <ProductImages images={product.images} />

      {/* DYNAMIC — resolved at request time via Suspense */}
      <Suspense fallback={<PriceSkeleton />}>
        <DynamicPrice productId={id} />  {/* Uses cookies/headers */}
      </Suspense>

      <Suspense fallback={<StockSkeleton />}>
        <StockStatus productId={id} />   {/* Real-time stock */}
      </Suspense>
    </div>
  );
}

// ✅ Best of both worlds: static speed + dynamic freshness
```

---

## When to Use Each Strategy — Cheat Sheet

```
Landing page, marketing        → SSG
Blog, documentation            → SSG + ISR (revalidate: 3600)
E-commerce catalog             → ISR (revalidate: 60)
E-commerce price/stock         → PPR (SSG shell + dynamic slots)
Personalized dashboard         → SSR + Streaming
Auth pages                     → SSR (cookies)
Internal SPA (admin panel)     → CSR (Vite, no Next.js)
Complex forms                  → Client Components
Chat / real-time               → Client Components + WebSockets
```

---

## Anti-patterns

```tsx
// ❌ 'use client' on a route's page.tsx that only displays data
'use client'; // ❌ Unnecessary — this could be a Server Component
export default function ProductPage() { ... }

// ❌ Fetch in Client Component when it could be Server
'use client';
export function ProductList() {
  const { data } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  // ❌ This should be a Server Component with a direct fetch
}

// ❌ cache: 'no-store' on everything — removes all optimizations
fetch(url, { cache: 'no-store' }); // ❌ Only if the data REALLY changes every request

// ❌ Not using Suspense boundaries — the entire page waits for the slowest fetch
export default async function Page() {
  const slow = await fetchSlow();   // 3 seconds
  const fast = await fetchFast();   // 100ms
  // The user sees NOTHING for 3 seconds
}
```
