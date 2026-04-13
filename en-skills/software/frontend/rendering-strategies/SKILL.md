---
name: rendering-strategies
description: >
  Use this skill when choosing or implementing rendering strategies
  in React/Next.js: SSG, ISR, SSR, Streaming, RSC, PPR, CSR, and
  selection criteria by use case.
---

# Rendering Strategies

## Agent workflow

1. Identify data nature: static, semi-static, personalized, or real-time.
2. Consult the Cheat Sheet (section 7) to select the strategy.
3. SSG for immutable content, ISR for semi-static, SSR for per-user data.
4. Wrap slow zones in `<Suspense>` for progressive streaming.
5. PPR when a page mixes static and dynamic content.
6. `'use client'` only for interactivity — everything else is a Server Component.

## Strategy Map

| Strategy | Build Time | Request Time | Revalidation | Use Case |
|----------|------------|--------------|--------------|----------|
| **SSG** | Static HTML | — | `revalidate` or on-demand | Blog, docs, landing |
| **ISR** | Initial HTML | Regenerates in background | `revalidate: N` | Products, catalogs |
| **SSR** | — | Every request | — | Dashboards, user-specific data |
| **Streaming** | — | Partial progressive | — | Pages with slow zones |
| **RSC** | Build + request | Depends on route | — | Everything (default in App Router) |
| **PPR** | Static shell | Dynamic slots | — | Combines static + dynamic |
| **CSR** | — | — (client-only) | — | Internal SPAs, widgets |

## 1. Static Site Generation (SSG)

```tsx
export async function generateStaticParams() {
  const posts = await db.post.findMany({ select: { slug: true } });
  return posts.map((post) => ({ slug: post.slug }));
}

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
```

## 2. Incremental Static Regeneration (ISR)

```tsx
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

// On-demand revalidation
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

## 3. Server-Side Rendering (SSR)

```tsx
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
```

## 4. Streaming SSR with Suspense

```tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-12 gap-6">
      <header className="col-span-12">
        <h1>Dashboard</h1>
      </header>

      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <RecentOrders />
      </Suspense>

      <Suspense fallback={<StatsSkeleton />}>
        <QuickStats />
      </Suspense>
    </div>
  );
}
```

## 5. React Server Components (RSC) — Patterns

```tsx
// Pattern: Server Component wrapping Client Component
async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });
  const reviews = await db.review.findMany({ where: { productId: id } });

  return (
    <div>
      <ProductInfo product={product} />
      <AddToCartButton productId={id} price={product.price} />
      <ReviewList reviews={reviews} />
      <ReviewForm productId={id} />
    </div>
  );
}

// Pattern: Pass Server Components as children to Client Components
'use client';
export function ClientWrapper({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(true);
  return isVisible ? <div>{children}</div> : null;
}

export default async function Page() {
  const data = await fetchData();
  return (
    <ClientWrapper>
      <ServerContent data={data} />
    </ClientWrapper>
  );
}
```

## 6. Partial Prerendering (PPR) — Next.js 15+

```tsx
// next.config.ts
const config = {
  experimental: {
    ppr: 'incremental',
  },
};

export const experimental_ppr = true;

import { Suspense } from 'react';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });

  return (
    <div>
      <ProductInfo product={product} />
      <ProductImages images={product.images} />

      <Suspense fallback={<PriceSkeleton />}>
        <DynamicPrice productId={id} />
      </Suspense>

      <Suspense fallback={<StockSkeleton />}>
        <StockStatus productId={id} />
      </Suspense>
    </div>
  );
}
```

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

## Gotchas

- `'use client'` on a page.tsx that only displays data — should be a Server Component.
- Fetch in Client Component when it could be a Server Component with direct fetch.
- `cache: 'no-store'` by default on everything removes all optimizations — only if data really changes every request.
- Not using `<Suspense>` boundaries — the entire page waits for the slowest fetch instead of streaming progressively.
